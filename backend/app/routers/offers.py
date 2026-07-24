"""
offers.py
---------
Membre 2 - Backend | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Endpoints REST pour la gestion des offres d'emploi.
       Seuls les recruteurs peuvent créer et gérer des offres.

Endpoints :
    POST   /offers/                    → Créer une offre (recruteur uniquement)
    GET    /offers/                    → Lister toutes les offres actives
    GET    /offers/{id}                → Détail d'une offre
    PUT    /offers/{id}                → Modifier une offre
    DELETE /offers/{id}                → Désactiver une offre (recruteur propriétaire)
    GET    /offers/{id}/ranking        → Classement des candidats
    GET    /offers/{id}/ranking/export → Export CSV du classement
"""

import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.job_offer import JobOffer
from app.models.ranking import Ranking
from app.models.application import Application
from app.schemas.job_offer_schema import JobOfferCreate, JobOfferUpdate, JobOfferResponse
from app.schemas.schemas import RankingResponse
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/offers", tags=["Offres d'emploi"])


# ──────────────────────────────────────────────────────────────────────────────
# Dépendance : vérifier que l'utilisateur est un recruteur
# ──────────────────────────────────────────────────────────────────────────────

verifier_recruteur = require_roles(UserRole.recruteur)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers : contrôle d'accès à une offre
#
# Règle métier :
#   - Lecture (consulter le classement, exporter le CSV) : le recruteur
#     propriétaire OU un admin (supervision/support).
#   - Écriture (modifier, désactiver) : le recruteur propriétaire UNIQUEMENT.
#     L'admin ne modifie pas le contenu métier d'une offre à la place d'un
#     recruteur — il dispose d'une action de modération séparée (voir plus bas).
# ──────────────────────────────────────────────────────────────────────────────

def _get_offre_ou_404(db: Session, offre_id: int) -> JobOffer:
    offre = db.query(JobOffer).filter(JobOffer.id == offre_id).first()
    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offre {offre_id} introuvable"
        )
    return offre


def _verifier_lecture_offre(offre: JobOffer, current_user: User) -> None:
    """Autorise le recruteur propriétaire ou un admin. Lève 403 sinon."""
    est_proprietaire = offre.recruteur_id == current_user.id
    est_admin = current_user.role == UserRole.admin
    if not (est_proprietaire or est_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de cette offre"
        )


def _verifier_ecriture_offre(offre: JobOffer, current_user: User) -> None:
    """Autorise uniquement le recruteur propriétaire. Lève 403 sinon."""
    if offre.recruteur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de cette offre"
        )


# ──────────────────────────────────────────────────────────────────────────────
# POST /offers/ — Créer une offre d'emploi
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/", response_model=JobOfferResponse, status_code=status.HTTP_201_CREATED)
def creer_offre(
    offre_data: JobOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verifier_recruteur)
):
    """
    Crée une nouvelle offre d'emploi.

    - Réservé aux recruteurs (token JWT requis)
    - Les compétences requises sont stockées en JSON
    - Les poids de scoring doivent totaliser 1.0 (validé par le schéma)
    - Le profil OCEAN idéal doit être entre 0.0 et 1.0
    """
    competences_json = json.dumps(offre_data.competences_requises)

    nouvelle_offre = JobOffer(
        titre=offre_data.titre,
        description=offre_data.description,
        competences_requises=competences_json,
        experience_requise=offre_data.experience_requise,
        entreprise=offre_data.entreprise,
        localisation=offre_data.localisation,
        type_contrat=offre_data.type_contrat,
        niveau_experience=offre_data.niveau_experience,
        mode_travail=offre_data.mode_travail,
        salaire_min=offre_data.salaire_min,
        salaire_max=offre_data.salaire_max,
        ocean_O=offre_data.ocean_O,
        ocean_C=offre_data.ocean_C,
        ocean_E=offre_data.ocean_E,
        ocean_A=offre_data.ocean_A,
        ocean_N=offre_data.ocean_N,
        poids_competences=offre_data.poids_competences,
        poids_experience=offre_data.poids_experience,
        poids_formation=offre_data.poids_formation,
        poids_personnalite=offre_data.poids_personnalite,
        recruteur_id=current_user.id,
        is_active=True,
    )

    db.add(nouvelle_offre)
    db.commit()
    db.refresh(nouvelle_offre)

    nouvelle_offre.competences_requises = json.loads(nouvelle_offre.competences_requises)
    return nouvelle_offre


# ──────────────────────────────────────────────────────────────────────────────
# GET /offers/ — Lister toutes les offres actives
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[JobOfferResponse])
def lister_offres(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retourne toutes les offres d'emploi actives.
    Accessible à tous les utilisateurs connectés (candidats et recruteurs).
    """
    offres = db.query(JobOffer).filter(JobOffer.is_active == True).all()  # noqa: E712

    for offre in offres:
        offre.competences_requises = json.loads(offre.competences_requises)

    return offres


# ──────────────────────────────────────────────────────────────────────────────
# GET /offers/{id} — Détail d'une offre
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{offre_id}", response_model=JobOfferResponse)
def obtenir_offre(
    offre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retourne le détail d'une offre d'emploi par son ID.
    Accessible à tous les utilisateurs connectés.
    """
    offre = db.query(JobOffer).filter(
        JobOffer.id == offre_id,
        JobOffer.is_active == True  # noqa: E712
    ).first()

    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offre {offre_id} introuvable"
        )

    offre.competences_requises = json.loads(offre.competences_requises)
    return offre


# ──────────────────────────────────────────────────────────────────────────────
# PUT /offers/{id} — Modifier une offre d'emploi
# ──────────────────────────────────────────────────────────────────────────────

@router.put("/{offre_id}", response_model=JobOfferResponse)
def modifier_offre(
    offre_id: int,
    offre_data: JobOfferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verifier_recruteur)
):
    """
    Modifie une offre d'emploi existante (mise à jour partielle).
    Réservé au recruteur propriétaire de l'offre.
    """
    offre = _get_offre_ou_404(db, offre_id)
    _verifier_ecriture_offre(offre, current_user)

    champs_a_modifier = offre_data.model_dump(exclude_unset=True)

    if "competences_requises" in champs_a_modifier:
        champs_a_modifier["competences_requises"] = json.dumps(
            champs_a_modifier["competences_requises"]
        )

    for champ, valeur in champs_a_modifier.items():
        setattr(offre, champ, valeur)

    poids_modifies = {"poids_competences", "poids_experience", "poids_formation", "poids_personnalite"}
    if poids_modifies & champs_a_modifier.keys():
        total_poids = (
            offre.poids_competences + offre.poids_experience
            + offre.poids_formation + offre.poids_personnalite
        )
        if round(total_poids, 2) != 1.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La somme des poids doit être égale à 1.0 (obtenu : {round(total_poids, 2)})"
            )

    db.commit()
    db.refresh(offre)

    offre.competences_requises = json.loads(offre.competences_requises)
    return offre


# ──────────────────────────────────────────────────────────────────────────────
# DELETE /offers/{id} — Désactiver une offre
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/{offre_id}", status_code=status.HTTP_200_OK)
def desactiver_offre(
    offre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verifier_recruteur)
):
    """
    Désactive une offre d'emploi (soft delete — is_active = False).
    Réservé au recruteur propriétaire de l'offre.
    """
    offre = _get_offre_ou_404(db, offre_id)
    _verifier_ecriture_offre(offre, current_user)

    offre.is_active = False
    db.commit()

    return {"message": f"Offre '{offre.titre}' désactivée avec succès"}


# ──────────────────────────────────────────────────────────────────────────────
# GET /offers/{id}/ranking — Classement des candidats pour une offre
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{offre_id}/ranking", response_model=list[RankingResponse])
def obtenir_classement(
    offre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retourne le classement des candidats pour une offre donnée.
    Réservé au recruteur propriétaire de l'offre, ou à un admin (supervision).
    """
    offre = _get_offre_ou_404(db, offre_id)
    _verifier_lecture_offre(offre, current_user)

    rankings = (
        db.query(Ranking)
        .filter(Ranking.offre_id == offre_id)
        .order_by(Ranking.position)
        .all()
    )

    if not rankings:
        return []

    resultat = []
    for ranking in rankings:
        candidat = ranking.application.candidat
        resultat.append(RankingResponse(
            application_id=ranking.application_id,
            position=ranking.position,
            candidat_nom=candidat.nom,
            candidat_prenom=candidat.prenom,
            candidat_email=candidat.email,
            statut=ranking.application.statut.value,
            score_global=ranking.score_global,
            score_competences=ranking.score_competences,
            score_experience=ranking.score_experience,
            score_formation=ranking.score_formation,
            score_personnalite=ranking.score_personnalite,
        ))

    return resultat


# ──────────────────────────────────────────────────────────────────────────────
# GET /offers/{id}/ranking/export — Export CSV du classement
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{offre_id}/ranking/export")
def exporter_classement_csv(
    offre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exporte le classement des candidats pour une offre en fichier CSV.
    Réservé au recruteur propriétaire de l'offre, ou à un admin (supervision).
    """
    offre = _get_offre_ou_404(db, offre_id)
    _verifier_lecture_offre(offre, current_user)

    rankings = (
        db.query(Ranking)
        .filter(Ranking.offre_id == offre_id)
        .order_by(Ranking.position)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    writer.writerow([
        "Position",
        "Nom",
        "Prénom",
        "Email",
        "Score Global (%)",
        "Score Compétences (%)",
        "Score Expérience (%)",
        "Score Formation (%)",
        "Score Personnalité (%)",
    ])

    for ranking in rankings:
        candidat = ranking.application.candidat
        writer.writerow([
            ranking.position,
            candidat.nom,
            candidat.prenom,
            candidat.email,
            round(ranking.score_global * 100, 1),
            round(ranking.score_competences * 100, 1),
            round(ranking.score_experience * 100, 1),
            round(ranking.score_formation * 100, 1),
            round(ranking.score_personnalite * 100, 1),
        ])

    output.seek(0)

    titre_safe = offre.titre.replace(" ", "_").replace("/", "-")[:30]
    nom_fichier = f"classement_{titre_safe}_{offre_id}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={nom_fichier}",
            "Content-Type": "text/csv; charset=utf-8",
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# PATCH /offers/{id}/moderation — Désactivation par un admin (modération)
# ──────────────────────────────────────────────────────────────────────────────

@router.patch("/{offre_id}/moderation", response_model=JobOfferResponse, tags=["Administration"])
def moderer_offre(
    offre_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """
    [ADMIN] Désactive une offre pour modération (contenu inapproprié, litige...).

    Contrairement à `PUT /{id}`, l'admin ne peut PAS modifier le contenu
    métier de l'offre (titre, description, poids de scoring...) — seulement
    la désactiver. La création/modification du contenu reste la responsabilité
    exclusive du recruteur propriétaire.
    """
    offre = _get_offre_ou_404(db, offre_id)
    offre.is_active = False
    db.commit()
    db.refresh(offre)

    offre.competences_requises = json.loads(offre.competences_requises)
    return offre