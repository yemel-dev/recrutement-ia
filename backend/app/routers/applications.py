"""
applications.py — Endpoints REST + SSE pour les candidatures

Modifications v2 (SSE) :
  - POST /applications  → rend immédiatement la candidature, lance
                          l'analyse NLP en BackgroundTask
  - GET  /applications/{id}/progress → SSE : diffuse la progression
                          de l'analyse en temps réel
  - Stockage en mémoire des queues de progression par application_id
"""
import asyncio
import json
import os
import shutil
from typing import Dict, List, AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.job_offer import JobOffer
from app.models.application import Application, ApplicationStatus
from app.schemas.schemas import ApplicationResponse
from app.services.nlp.nlp_pipeline import analyser_cv
from app.services.ranking_service import tenter_calculer_score
from app.services import email_service
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/applications", tags=["Candidatures"])

UPLOAD_DIR = "uploads/cvs"
EXTENSIONS_AUTORISEES = {".pdf", ".docx"}
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ──────────────────────────────────────────────────────────────────────────────
# Helper : contrôle d'accès à une candidature
#
# Lecture (voir le détail, télécharger le CV, suivre la progression) :
# le candidat propriétaire, le recruteur propriétaire de l'offre, ou un admin.
# ──────────────────────────────────────────────────────────────────────────────

def _verifier_lecture_candidature(candidature: Application, current_user: User) -> None:
    """Autorise le candidat propriétaire, le recruteur propriétaire, ou un admin."""
    est_le_candidat = candidature.candidat_id == current_user.id
    est_le_recruteur = candidature.offre.recruteur_id == current_user.id
    est_admin = current_user.role == UserRole.admin
    if not (est_le_candidat or est_le_recruteur or est_admin):
        raise HTTPException(status_code=403, detail="Accès refusé")

# ── Stockage en mémoire des queues SSE ───────────────────────────────────────
# Clé = application_id, Valeur = liste des asyncio.Queue en écoute
_progress_queues: Dict[int, List[asyncio.Queue]] = {}


def _register_queue(application_id: int) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _progress_queues.setdefault(application_id, []).append(q)
    return q


def _unregister_queue(application_id: int, q: asyncio.Queue):
    listeners = _progress_queues.get(application_id, [])
    if q in listeners:
        listeners.remove(q)
    if not listeners:
        _progress_queues.pop(application_id, None)


async def _broadcast(application_id: int, data: dict):
    """Envoie un événement à tous les clients SSE qui écoutent cette candidature."""
    for q in _progress_queues.get(application_id, []):
        await q.put(data)


# ── Tâche de fond : analyse NLP avec progression SSE ─────────────────────────

def _run_analyse_background(application_id: int, chemin_fichier: str, competences_offre: list):
    """
    Exécutée dans un thread séparé par BackgroundTasks.
    Utilise une nouvelle session DB (hors contexte de la requête HTTP).
    """
    import asyncio as _asyncio

    # On récupère ou crée une boucle événementielle pour pouvoir faire des await
    try:
        loop = _asyncio.get_event_loop()
    except RuntimeError:
        loop = _asyncio.new_event_loop()
        _asyncio.set_event_loop(loop)

    def emit(etape: int, label: str, progression: int):
        """Callback appelé par chaque étape du pipeline NLP."""
        payload = {"etape": etape, "label": label, "progression": progression}
        # On programme l'envoi SSE dans la boucle principale
        asyncio.run_coroutine_threadsafe(
            _broadcast(application_id, payload), loop
        )

    db = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return

        offre = application.offre
        competences_list = competences_offre

        # ── Lance le pipeline NLP avec le callback de progression ─────────────
        resultat_nlp = analyser_cv(
            chemin_fichier,
            competences_offre=competences_list,
            on_progress=emit,
        )

        # ── Sauvegarde des résultats NLP en base ──────────────────────────────
        application.competences_extraites = json.dumps(resultat_nlp["competences_extraites"])
        application.experience_annees     = resultat_nlp["experience_annees"]
        application.formation_niveau      = resultat_nlp["formation_niveau"]
        application.entites_nommees       = json.dumps(resultat_nlp["entites_nommees"])
        db.commit()
        db.refresh(application)

        # ── Tentative de scoring final ────────────────────────────────────────
        tenter_calculer_score(db, application)
        db.refresh(application)

        # ── Événement final : terminé ─────────────────────────────────────────
        payload_final = {
            "etape": 5,
            "label": "Analyse terminée",
            "progression": 100,
            "done": True,
            "score_global": application.score_global,
            "statut": application.statut.value,
        }
        asyncio.run_coroutine_threadsafe(
            _broadcast(application_id, payload_final), loop
        )

    except Exception as e:
        # En cas d'erreur, on notifie le frontend
        error_payload = {
            "etape": -1,
            "label": f"Erreur : {str(e)}",
            "progression": 0,
            "done": True,
            "error": True,
        }
        asyncio.run_coroutine_threadsafe(
            _broadcast(application_id, error_payload), loop
        )
    finally:
        db.close()


# ─── POST /applications ───────────────────────────────────────────────────────

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def postuler(
    background_tasks: BackgroundTasks,
    offre_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Le candidat dépose sa candidature.
    Retourne IMMÉDIATEMENT la candidature (statut en_attente).
    L'analyse NLP se lance en arrière-plan et diffuse sa progression via SSE.
    """
    if current_user.role != UserRole.candidat:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Seul un candidat peut postuler à une offre")

    offre = db.query(JobOffer).filter(JobOffer.id == offre_id, JobOffer.is_active == True).first()
    if offre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre introuvable")

    deja_postule = (
        db.query(Application)
        .filter(Application.candidat_id == current_user.id, Application.offre_id == offre_id)
        .first()
    )
    if deja_postule:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Vous avez déjà postulé à cette offre")

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in EXTENSIONS_AUTORISEES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Format non supporté ({extension}). Formats acceptés : PDF, DOCX")

    chemin_fichier = os.path.join(UPLOAD_DIR, f"{current_user.id}_{offre_id}{extension}")
    with open(chemin_fichier, "wb") as destination:
        shutil.copyfileobj(file.file, destination)

    # ── Création immédiate de la candidature en base (statut = en_attente) ──
    nouvelle_candidature = Application(
        candidat_id=current_user.id,
        offre_id=offre_id,
        cv_filename=file.filename,
        cv_path=chemin_fichier,
        statut=ApplicationStatus.en_attente,
    )
    db.add(nouvelle_candidature)
    db.commit()
    db.refresh(nouvelle_candidature)

    # ── Lancement de l'analyse NLP en arrière-plan ───────────────────────────
    competences_offre = json.loads(offre.competences_requises)
    background_tasks.add_task(
        _run_analyse_background,
        nouvelle_candidature.id,
        chemin_fichier,
        competences_offre,
    )

    # ── Notifications email ──────────────────────────────────────────────────
    background_tasks.add_task(
        email_service.envoyer_candidature_recue,
        current_user.email, current_user.prenom, offre.titre, file.filename,
    )
    background_tasks.add_task(
        email_service.envoyer_nouvelle_candidature_recruteur,
        offre.recruteur.email, offre.recruteur.prenom, offre.titre, offre.id,
        current_user.nom, current_user.prenom,
    )

    # ── Réponse immédiate au candidat ─────────────────────────────────────────
    return nouvelle_candidature


# ─── GET /applications/{id}/progress  (SSE) ──────────────────────────────────

@router.get("/{application_id}/progress")
async def progression_analyse(
    application_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    SSE : diffuse la progression de l'analyse NLP en temps réel.
    Le client écoute avec EventSource jusqu'à réception de done=True.
    """
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    _verifier_lecture_candidature(candidature, current_user)

    # Si l'analyse est déjà terminée, on renvoie directement l'état final
    if candidature.statut != ApplicationStatus.en_attente:
        async def already_done():
            data = {
                "etape": 5, "label": "Analyse terminée",
                "progression": 100, "done": True,
                "score_global": candidature.score_global,
                "statut": candidature.statut.value,
            }
            yield f"data: {json.dumps(data)}\n\n"
        return StreamingResponse(already_done(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    async def event_generator() -> AsyncGenerator[str, None]:
        q = _register_queue(application_id)
        try:
            # Ping initial pour confirmer la connexion
            yield "data: " + json.dumps({"etape": 0, "label": "Connexion établie", "progression": 0}) + "\n\n"

            while True:
                # Vérifie si le client a fermé la connexion
                if await request.is_disconnected():
                    break

                try:
                    # Attend un événement avec timeout (pour détecter déconnexion)
                    event = await asyncio.wait_for(q.get(), timeout=2.0)
                    yield f"data: {json.dumps(event)}\n\n"

                    if event.get("done"):
                        break
                except asyncio.TimeoutError:
                    # Envoie un heartbeat pour maintenir la connexion
                    yield ": heartbeat\n\n"
        finally:
            _unregister_queue(application_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── GET /applications/me ─────────────────────────────────────────────────────

@router.get("/me", response_model=list[ApplicationResponse])
def mes_candidatures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.candidat:
        raise HTTPException(status_code=403, detail="Seul un candidat possède des candidatures")
    return db.query(Application).filter(Application.candidat_id == current_user.id).all()


# ─── GET /applications/{id} ───────────────────────────────────────────────────

@router.get("/{application_id}", response_model=ApplicationResponse)
def obtenir_candidature(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    _verifier_lecture_candidature(candidature, current_user)

    return candidature


# ─── GET /applications/{id}/cv ────────────────────────────────────────────────

@router.get("/{application_id}/cv")
def telecharger_cv(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    _verifier_lecture_candidature(candidature, current_user)

    if not os.path.exists(candidature.cv_path):
        raise HTTPException(status_code=404, detail="Fichier CV introuvable sur le serveur")

    return FileResponse(
        path=candidature.cv_path,
        filename=candidature.cv_filename,
        media_type="application/octet-stream",
    )


# ─── PATCH /applications/{id}/moderation ──────────────────────────────────────

@router.patch("/{application_id}/moderation", response_model=ApplicationResponse, tags=["Administration"])
def moderer_candidature(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """
    [ADMIN] Rejette une candidature pour modération (contenu inapproprié, litige...).

    Comme pour les offres, l'admin ne modifie pas les données métier de la
    candidature (scores, fichiers, statut d'avancement normal) — il ne fait
    que trancher un litige en la marquant "rejete".
    """
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    candidature.statut = ApplicationStatus.rejete
    db.commit()
    db.refresh(candidature)

    background_tasks.add_task(
        email_service.envoyer_candidature_rejetee,
        candidature.candidat.email, candidature.candidat.prenom, candidature.offre.titre,
    )

    return candidature