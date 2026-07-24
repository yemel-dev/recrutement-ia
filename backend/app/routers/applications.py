"""
applications.py — Endpoints REST + SSE pour les candidatures

Modifications v2 (SSE) :
  - POST /applications  → rend immédiatement la candidature, lance
                          l'analyse NLP en BackgroundTask
  - GET  /applications/{id}/progress → SSE : diffuse la progression
                          de l'analyse en temps réel
  - Stockage en mémoire des queues de progression par application_id

CORRECTIONS v3 :
  - Le loop asyncio principal est capturé une seule fois au démarrage de
    l'app (main.py → set_main_loop), plutôt que dans postuler() lui-même
    (qui tourne dans le threadpool, pas dans le thread du loop principal).
  - GET /{id}/progress détecte la fin du NLP via `competences_extraites`
    (rempli dès la fin du pipeline) plutôt que via `statut` (qui ne passe
    à `analyse` qu'après le test Big Five en plus) — évite la course où
    l'événement "done" est diffusé avant que le SSE ne soit connecté.
  - emit() encapsulé dans un try/except : une erreur SSE n'interrompt plus
    l'analyse NLP
  - Logs détaillés à chaque étape pour diagnostiquer les échecs futurs
"""
import asyncio
import json
import logging
import os
import shutil
from typing import Dict, List, AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.job_offer import JobOffer
from app.models.application import Application, ApplicationStatus
from app.schemas.schemas import ApplicationResponse, CandidatureDecisionRequest
from app.services.nlp.nlp_pipeline import analyser_cv
from app.services.ranking_service import tenter_calculer_score
from app.services import email_service
from app.routers.auth import get_current_user, require_roles

logger = logging.getLogger("recrutement_ia.applications")

router = APIRouter(prefix="/applications", tags=["Candidatures"])

UPLOAD_DIR = "uploads/cvs"
EXTENSIONS_AUTORISEES = {".pdf", ".docx"}
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ──────────────────────────────────────────────────────────────────────────────
# Helper : contrôle d'accès à une candidature
# ──────────────────────────────────────────────────────────────────────────────

def _verifier_lecture_candidature(candidature: Application, current_user: User) -> None:
    est_le_candidat  = candidature.candidat_id == current_user.id
    est_le_recruteur = candidature.offre.recruteur_id == current_user.id
    est_admin        = current_user.role == UserRole.admin
    if not (est_le_candidat or est_le_recruteur or est_admin):
        raise HTTPException(status_code=403, detail="Accès refusé")


# ── Loop asyncio principal (capturé une seule fois, au démarrage de l'app) ───
#
# postuler() est une fonction `def` (synchrone) : FastAPI l'exécute dans un
# thread du threadpool, PAS dans le thread du event loop principal. Appeler
# asyncio.get_event_loop() depuis l'intérieur de postuler() ne peut donc pas
# récupérer le bon loop (c'était le bug à l'origine des "SSE désactivé").
#
# À la place, on capture le loop une seule fois au démarrage de l'app (voir
# main.py → set_main_loop, appelé depuis un handler @app.on_event("startup")
# qui, lui, tourne bien dans le thread du event loop principal), et on le
# réutilise ensuite pour chaque candidature.
_main_loop: "asyncio.AbstractEventLoop | None" = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Appelé une fois au démarrage de l'app (voir main.py)."""
    global _main_loop
    _main_loop = loop


# ── Stockage en mémoire des queues SSE ───────────────────────────────────────

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
    for q in _progress_queues.get(application_id, []):
        await q.put(data)


# ── Tâche de fond : analyse NLP avec progression SSE ─────────────────────────

def _run_analyse_background(
    application_id: int,
    chemin_fichier: str,
    competences_offre: list,
    main_loop: asyncio.AbstractEventLoop,   # ← loop du thread principal FastAPI,
                                            #   capturé AVANT le lancement du thread
):
    """
    Tâche exécutée dans un thread séparé par FastAPI BackgroundTasks.

    Pour envoyer des événements SSE depuis ce thread vers les clients
    connectés (qui vivent dans le loop asyncio principal), on utilise
    run_coroutine_threadsafe() avec le loop du thread principal.

    Ce loop est capturé une seule fois au démarrage de l'app (voir
    set_main_loop / main.py) et transmis ici en paramètre — c'est la seule
    façon fiable de l'obtenir : asyncio.get_event_loop() appelé depuis un
    thread secondaire renvoie un loop différent (ou lève une erreur).
    """

    def emit(etape: int, label: str, progression: int):
        """Envoie une progression SSE. Non bloquant et tolérant aux erreurs."""
        payload = {"etape": etape, "label": label, "progression": progression}
        try:
            if main_loop and main_loop.is_running():
                asyncio.run_coroutine_threadsafe(_broadcast(application_id, payload), main_loop)
        except Exception:
            logger.warning(
                "[NLP] SSE broadcast échoué (candidature #%s, étape %s) — analyse continue",
                application_id, etape,
            )

    logger.info(
        "[NLP] Démarrage analyse — candidature #%s, fichier: %s",
        application_id, chemin_fichier,
    )

    db = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error("[NLP] Candidature #%s introuvable en base — abandon", application_id)
            return

        competences_list = competences_offre
        logger.info(
            "[NLP] Candidature #%s — %d compétences requises : %s",
            application_id, len(competences_list), competences_list,
        )

        resultat_nlp = analyser_cv(
            chemin_fichier,
            competences_offre=competences_list,
            on_progress=emit,
        )

        logger.info(
            "[NLP] Analyse réussie — candidature #%s | "
            "expérience: %s ans | formation: %s | "
            "compétences extraites: %d | score_compétences: %.2f",
            application_id,
            resultat_nlp["experience_annees"],
            resultat_nlp["formation_niveau"],
            len(resultat_nlp["competences_extraites"]),
            resultat_nlp["score_competences"],
        )

        application.competences_extraites = json.dumps(resultat_nlp["competences_extraites"])
        application.experience_annees     = resultat_nlp["experience_annees"]
        application.formation_niveau      = resultat_nlp["formation_niveau"]
        application.entites_nommees       = json.dumps(resultat_nlp["entites_nommees"])
        db.commit()
        db.refresh(application)

        score_calcule = tenter_calculer_score(db, application)
        db.refresh(application)

        logger.info(
            "[NLP] Score — candidature #%s | score_global: %s | statut: %s | "
            "big_five_disponible: %s",
            application_id,
            application.score_global,
            application.statut.value,
            score_calcule,
        )

        payload_final = {
            "etape": 5,
            "label": "Analyse terminée",
            "progression": 100,
            "done": True,
            "score_global": application.score_global,
            "statut": application.statut.value,
        }
        try:
            if main_loop and main_loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    _broadcast(application_id, payload_final), main_loop
                )
        except Exception:
            logger.warning("[NLP] SSE payload final échoué pour candidature #%s", application_id)

    except Exception as e:
        logger.exception(
            "[NLP] ❌ ÉCHEC analyse NLP — candidature #%s (fichier: %s) — erreur: %s",
            application_id, chemin_fichier, str(e),
        )

        # Repli neutre : sauvegarde des valeurs par défaut pour que la
        # candidature ne reste pas bloquée avec tous les champs à null
        try:
            application = db.query(Application).filter(Application.id == application_id).first()
            if application:
                if application.competences_extraites is None:
                    application.competences_extraites = json.dumps([])
                if application.formation_niveau is None:
                    application.formation_niveau = "inconnu"
                if application.entites_nommees is None:
                    application.entites_nommees = json.dumps({})
                db.commit()
                db.refresh(application)
                tenter_calculer_score(db, application)
                db.refresh(application)
                logger.info(
                    "[NLP] Repli neutre appliqué — candidature #%s | statut: %s",
                    application_id, application.statut.value,
                )
        except Exception:
            logger.exception(
                "[NLP] ❌ Échec également du repli neutre — candidature #%s",
                application_id,
            )

        error_payload = {
            "etape": -1,
            "label": f"Erreur : {str(e)}",
            "progression": 0,
            "done": True,
            "error": True,
        }
        try:
            if main_loop and main_loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    _broadcast(application_id, error_payload), main_loop
                )
        except Exception:
            pass
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

    logger.info(
        "[UPLOAD] CV sauvegardé — utilisateur #%s, offre #%s, fichier: %s",
        current_user.id, offre_id, chemin_fichier,
    )

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

    # On réutilise le loop principal capturé au démarrage de l'app (voir
    # set_main_loop / main.py) — impossible à récupérer correctement ici,
    # puisque postuler() tourne dans un thread du threadpool.
    if _main_loop is None:
        logger.warning("[SSE] Loop asyncio principal non initialisé — SSE désactivé")

    competences_offre = json.loads(offre.competences_requises)
    background_tasks.add_task(
        _run_analyse_background,
        nouvelle_candidature.id,
        chemin_fichier,
        competences_offre,
        _main_loop,
    )

    background_tasks.add_task(
        email_service.envoyer_candidature_recue,
        current_user.email, current_user.prenom, offre.titre, file.filename,
    )
    background_tasks.add_task(
        email_service.envoyer_nouvelle_candidature_recruteur,
        offre.recruteur.email, offre.recruteur.prenom, offre.titre, offre.id,
        current_user.nom, current_user.prenom,
    )

    return nouvelle_candidature


# ─── GET /applications/{id}/progress  (SSE) ──────────────────────────────────

@router.get("/{application_id}/progress")
async def progression_analyse(
    application_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    _verifier_lecture_candidature(candidature, current_user)

    # CORRECTIF : `statut` ne passe à `analyse` qu'une fois le NLP ET le
    # Big Five terminés (voir tenter_calculer_score / ranking_service.py).
    # Si on teste `statut != en_attente` ici, on rate le cas très fréquent
    # où le NLP est déjà fini mais le Big Five pas encore passé : le
    # `statut` reste `en_attente`, alors que l'événement "done" du NLP a
    # déjà été diffusé (et perdu, car personne n'écoutait encore).
    # `competences_extraites` est le bon indicateur : rempli dès la fin du
    # NLP, indépendamment du Big Five.
    if candidature.competences_extraites is not None:
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
            yield "data: " + json.dumps({"etape": 0, "label": "Connexion établie", "progression": 0}) + "\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=2.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("done"):
                        break
                except asyncio.TimeoutError:
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

    # On enrichit manuellement avec l'identité du candidat : ApplicationResponse
    # est mappé via from_attributes sur l'objet Application, qui n'a pas ces
    # champs directement (ils vivent sur la relation .candidat).
    data = ApplicationResponse.model_validate(candidature).model_dump()
    candidat = candidature.candidat
    data.update({
        "candidat_nom":           candidat.nom,
        "candidat_prenom":        candidat.prenom,
        "candidat_email":         candidat.email,
        "candidat_photo_url":     candidat.photo_url,
        "candidat_telephone":     candidat.telephone,
        "candidat_localisation":  candidat.localisation,
        "candidat_linkedin_url":  candidat.linkedin_url,
        "candidat_github_url":    candidat.github_url,
        "candidat_portfolio_url": candidat.portfolio_url,
    })
    return data


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

# ─── PATCH /applications/{id}/decision ────────────────────────────────────────

@router.patch("/{application_id}/decision", response_model=ApplicationResponse, tags=["Candidatures"])
def decider_candidature(
    application_id: int,
    decision: CandidatureDecisionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Le recruteur accepte ou rejette une candidature reçue sur l'une de ses
    offres. Envoie automatiquement un email de notification au candidat.
    """
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    est_le_recruteur = candidature.offre.recruteur_id == current_user.id
    est_admin = current_user.role == UserRole.admin
    if not (est_le_recruteur or est_admin):
        raise HTTPException(status_code=403, detail="Seul le recruteur propriétaire de l'offre peut décider")

    candidature.statut = ApplicationStatus(decision.statut)
    db.commit()
    db.refresh(candidature)

    if decision.statut == "accepte":
        background_tasks.add_task(
            email_service.envoyer_candidature_acceptee,
            candidature.candidat.email, candidature.candidat.prenom, candidature.offre.titre,
        )
    else:
        background_tasks.add_task(
            email_service.envoyer_candidature_rejetee,
            candidature.candidat.email, candidature.candidat.prenom, candidature.offre.titre,
        )

    return candidature
# ─── PATCH /applications/{id}/moderation ──────────────────────────────────────

@router.patch("/{application_id}/moderation", response_model=ApplicationResponse, tags=["Administration"])
def moderer_candidature(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """[ADMIN] Rejette une candidature pour modération."""
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


# ─── PATCH /applications/{id}/statut ─────────────────────────────────────────

class StatutUpdate(BaseModel):
    statut: str  # "accepte" ou "rejete"


@router.patch("/{application_id}/statut", response_model=ApplicationResponse)
def changer_statut_candidature(
    application_id: int,
    body: StatutUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """[RECRUTEUR] Accepte ou rejette une candidature depuis la fiche candidat."""
    if current_user.role not in [UserRole.recruteur, UserRole.admin]:
        raise HTTPException(
            status_code=403,
            detail="Seul un recruteur peut modifier le statut d'une candidature"
        )

    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    if current_user.role == UserRole.recruteur:
        if candidature.offre.recruteur_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Vous n'êtes pas le recruteur propriétaire de cette offre"
            )

    statuts_autorises = ["accepte", "rejete", "analyse"]
    if body.statut not in statuts_autorises:
        raise HTTPException(
            status_code=422,
            detail=f"Statut invalide. Valeurs acceptées : {statuts_autorises}"
        )

    candidature.statut = ApplicationStatus[body.statut]
    db.commit()
    db.refresh(candidature)

    if body.statut == "rejete":
        background_tasks.add_task(
            email_service.envoyer_candidature_rejetee,
            candidature.candidat.email,
            candidature.candidat.prenom,
            candidature.offre.titre,
        )

    return candidature