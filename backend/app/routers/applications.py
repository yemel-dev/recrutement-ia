"""
Membre 2
applications.py — Endpoints REST pour les candidatures

    POST /applications         → le candidat postule à une offre (upload CV)
    GET  /applications/me      → le candidat liste ses propres candidatures
    GET  /applications/{id}    → détail d'une candidature (candidat propriétaire
                                  ou recruteur propriétaire de l'offre concernée)

Ce que POST /applications déclenche, dans l'ordre :
    1. Sauvegarde du fichier CV sur le disque
    2. Création de la candidature en base (statut = en_attente)
    3. Appel du pipeline NLP (Membre 2) → remplit competences_extraites,
       experience_annees, formation_niveau, entites_nommees
    4. Tentative de calcul du score global (voir ranking_service.py) — ne
       réussit que si le candidat a AUSSI déjà passé le test Big Five

Note de conception : le PDF du projet décrit cette analyse comme
"asynchrone" (BackgroundTasks, pour ne pas bloquer le candidat). Ici,
elle est faite de façon SYNCHRONE (le candidat attend la fin de l'analyse
avant de recevoir la réponse). Choix assumé pour rester simple et
100% testable pour un projet académique — à faire évoluer plus tard
si le temps d'analyse devient un problème réel.
"""
import json
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.job_offer import JobOffer
from app.models.application import Application, ApplicationStatus
from app.schemas.schemas import ApplicationResponse
from app.services.nlp.nlp_pipeline import analyser_cv
from app.services.ranking_service import tenter_calculer_score
from app.routers.auth import get_current_user

router = APIRouter(prefix="/applications", tags=["Candidatures"])

UPLOAD_DIR = "uploads/cvs"
EXTENSIONS_AUTORISEES = {".pdf", ".docx"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─── POST /applications ───────────────────────────────────────────────────────

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def postuler(
    offre_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Un candidat dépose sa candidature à une offre (upload de son CV)."""
    if current_user.role != UserRole.candidat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un candidat peut postuler à une offre",
        )

    offre = db.query(JobOffer).filter(JobOffer.id == offre_id, JobOffer.is_active == True).first()  # noqa: E712
    if offre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre introuvable")

    deja_postule = (
        db.query(Application)
        .filter(Application.candidat_id == current_user.id, Application.offre_id == offre_id)
        .first()
    )
    if deja_postule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous avez déjà postulé à cette offre",
        )

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in EXTENSIONS_AUTORISEES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Format de fichier non supporté ({extension}). Formats acceptés : PDF, DOCX",
        )

    chemin_fichier = os.path.join(UPLOAD_DIR, f"{current_user.id}_{offre_id}{extension}")
    with open(chemin_fichier, "wb") as destination:
        shutil.copyfileobj(file.file, destination)

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

    # ─── Étape NLP : extraction des informations du CV ────────────────────────
    competences_offre = json.loads(offre.competences_requises)
    resultat_nlp = analyser_cv(chemin_fichier, competences_offre=competences_offre)
    nouvelle_candidature.competences_extraites = json.dumps(resultat_nlp["competences_extraites"])
    nouvelle_candidature.experience_annees = resultat_nlp["experience_annees"]
    nouvelle_candidature.formation_niveau = resultat_nlp["formation_niveau"]
    nouvelle_candidature.entites_nommees = json.dumps(resultat_nlp["entites_nommees"])
    db.commit()
    db.refresh(nouvelle_candidature)

    # ─── Étape scoring : ne réussit que si le test Big Five est déjà passé ────
    tenter_calculer_score(db, nouvelle_candidature)
    db.refresh(nouvelle_candidature)

    return nouvelle_candidature


# ─── GET /applications/me ─────────────────────────────────────────────────────

@router.get("/me", response_model=list[ApplicationResponse])
def mes_candidatures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Un candidat liste toutes ses propres candidatures."""
    if current_user.role != UserRole.candidat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un candidat possède des candidatures",
        )
    return db.query(Application).filter(Application.candidat_id == current_user.id).all()


# ─── GET /applications/{id} ───────────────────────────────────────────────────

@router.get("/{application_id}", response_model=ApplicationResponse)
def obtenir_candidature(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Détail d'une candidature.
    Accessible uniquement au candidat propriétaire, ou au recruteur
    propriétaire de l'offre concernée.
    """
    candidature = db.query(Application).filter(Application.id == application_id).first()
    if candidature is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidature introuvable")

    est_le_candidat = candidature.candidat_id == current_user.id
    est_le_recruteur_de_loffre = candidature.offre.recruteur_id == current_user.id
    if not (est_le_candidat or est_le_recruteur_de_loffre):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette candidature",
        )

    return candidature
