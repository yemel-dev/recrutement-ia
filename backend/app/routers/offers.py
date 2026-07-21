"""
offers.py
---------
Membre 2 - Backend | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Endpoints REST pour la gestion des offres d'emploi.
       Seuls les recruteurs peuvent créer et gérer des offres.

Endpoints :
    POST   /offers/      → Créer une offre (recruteur uniquement)
    GET    /offers/      → Lister toutes les offres actives
    GET    /offers/{id}  → Détail d'une offre
    DELETE /offers/{id}  → Désactiver une offre (recruteur propriétaire)
"""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.job_offer import JobOffer
from app.models.ranking import Ranking
from app.models.application import Application
from app.schemas.job_offer_schema import JobOfferCreate, JobOfferUpdate, JobOfferResponse
from app.schemas.schemas import RankingResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/offers", tags=["Offres d'emploi"])


# ──────────────────────────────────────────────────────────────────────────────
# Dépendance : vérifier que l'utilisateur est un recruteur
# ──────────────────────────────────────────────────────────────────────────────

def verifier_recruteur(current_user: User = Depends(get_current_user)) -> User:
    """
    Dépendance FastAPI — vérifie que l'utilisateur connecté est un recruteur.
    Lève une erreur 403 si c'est un candidat.
    """
    if current_user.role != UserRole.recruteur:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux recruteurs"
        )
    return current_user


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

    Body exemple :
    {
        "titre": "Ingénieur NLP",
        "description": "Nous recherchons un expert NLP...",
        "competences_requises": ["python", "spacy", "machine learning"],
        "experience_requise": 3,
        "ocean_O": 0.8, "ocean_C": 0.7, "ocean_E": 0.5,
        "ocean_A": 0.6, "ocean_N": 0.3,
        "poids_competences": 0.40, "poids_experience": 0.25,
        "poids_formation": 0.20, "poids_personnalite": 0.15
    }
    """
    # Convertir la liste de compétences en JSON pour la BDD
    competences_json = json.dumps(offre_data.competences_requises)

    nouvelle_offre = JobOffer(
        titre=offre_data.titre,
        description=offre_data.description,
        competences_requises=competences_json,
        experience_requise=offre_data.experience_requise,
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

    # Reconvertir le JSON en liste pour la réponse
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
    offres = db.query(JobOffer).filter(JobOffer.is_active == True).all()

    # Reconvertir le JSON en liste pour chaque offre
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
        JobOffer.is_active == True
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

    - Réservé au recruteur propriétaire de l'offre
    - Seuls les champs fournis dans le body sont modifiés
    - Si l'un des 4 poids de scoring est modifié, leur somme est revalidée (doit faire 1.0)

    Body exemple (on peut n'envoyer que ce qu'on veut changer) :
    {
        "titre": "Ingénieur NLP Senior",
        "experience_requise": 5
    }
    """
    offre = db.query(JobOffer).filter(JobOffer.id == offre_id).first()

    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offre {offre_id} introuvable"
        )

    # Vérifier que le recruteur est bien le propriétaire
    if offre.recruteur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de cette offre"
        )

    champs_a_modifier = offre_data.model_dump(exclude_unset=True)

    # Convertir la liste de compétences en JSON si elle est modifiée
    if "competences_requises" in champs_a_modifier:
        champs_a_modifier["competences_requises"] = json.dumps(
            champs_a_modifier["competences_requises"]
        )

    for champ, valeur in champs_a_modifier.items():
        setattr(offre, champ, valeur)

    # Si un des 4 poids a été touché, on revalide que la somme totale fait 1.0
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

    - Réservé au recruteur propriétaire de l'offre
    - L'offre n'est pas supprimée de la BDD (conservation des données)
    """
    offre = db.query(JobOffer).filter(JobOffer.id == offre_id).first()

    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offre {offre_id} introuvable"
        )

    # Vérifier que le recruteur est bien le propriétaire
    if offre.recruteur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de cette offre"
        )

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
    current_user: User = Depends(verifier_recruteur)
):
    """
    Retourne le classement des candidats pour une offre donnée.

    - Réservé aux recruteurs (token JWT requis)
    - Les candidats sont triés par score_global décroissant
    - Retourne les scores détaillés + infos du candidat

    Exemple de réponse :
    [
        {
            "position": 1,
            "candidat_nom": "Dupont",
            "candidat_prenom": "Jean",
            "candidat_email": "jean@test.cm",
            "score_global": 0.87,
            "score_competences": 0.90,
            ...
        }
    ]
    """
    # Vérifier que l'offre existe
    offre = db.query(JobOffer).filter(JobOffer.id == offre_id).first()
    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offre {offre_id} introuvable"
        )

    # Vérifier que le recruteur est propriétaire de l'offre
    if offre.recruteur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le propriétaire de cette offre"
        )

    # Récupérer les rankings triés par position
    rankings = (
        db.query(Ranking)
        .filter(Ranking.offre_id == offre_id)
        .order_by(Ranking.position)
        .all()
    )

    if not rankings:
        return []

    # Construire la réponse avec les infos du candidat
    resultat = []
    for ranking in rankings:
        candidat = ranking.application.candidat
        resultat.append(RankingResponse(
            position=ranking.position,
            candidat_nom=candidat.nom,
            candidat_prenom=candidat.prenom,
            candidat_email=candidat.email,
            score_global=ranking.score_global,
            score_competences=ranking.score_competences,
            score_experience=ranking.score_experience,
            score_formation=ranking.score_formation,
            score_personnalite=ranking.score_personnalite,
        ))

    return resultat
