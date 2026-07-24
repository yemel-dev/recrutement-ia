from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import List
from typing import Optional


# ─── Schéma de base ───────────────────────────────────────────────────────────

class JobOfferBase(BaseModel):
    titre: str
    description: str
    competences_requises: List[str]
    experience_requise: int = 0

    # Informations générales du poste
    entreprise: Optional[str] = None
    localisation: Optional[str] = None
    type_contrat: str = "Temps plein"
    niveau_experience: str = "Intermediaire"
    mode_travail: str = "Hybride"
    salaire_min: Optional[int] = None
    salaire_max: Optional[int] = None

    # Profil OCEAN idéal
    ocean_O: float = 0.5
    ocean_C: float = 0.5
    ocean_E: float = 0.5
    ocean_A: float = 0.5
    ocean_N: float = 0.5

    # Poids de scoring configurables
    poids_competences: float = 0.40
    poids_experience: float = 0.25
    poids_formation: float = 0.20
    poids_personnalite: float = 0.15

    @field_validator("ocean_O", "ocean_C", "ocean_E", "ocean_A", "ocean_N")
    @classmethod
    def valider_ocean(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Les scores OCEAN doivent être entre 0.0 et 1.0")
        return v

    @field_validator("poids_personnalite")
    @classmethod
    def valider_poids(cls, v, info):
        """Vérifie que la somme des poids est égale à 1.0"""
        data = info.data
        total = (
            data.get("poids_competences", 0.40) +
            data.get("poids_experience", 0.25) +
            data.get("poids_formation", 0.20) +
            v
        )
        if round(total, 2) != 1.0:
            raise ValueError(f"La somme des poids doit être 1.0, obtenu : {total}")
        return v


# ─── Création ─────────────────────────────────────────────────────────────────

class JobOfferCreate(JobOfferBase):
    pass


# ─── Réponse API ──────────────────────────────────────────────────────────────

class JobOfferResponse(JobOfferBase):
    id: int
    recruteur_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

# Mise à jour partielle

class JobOfferUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    competences_requises: Optional[List[str]] = None
    experience_requise: Optional[int] = None
    entreprise: Optional[str] = None
    localisation: Optional[str] = None
    type_contrat: Optional[str] = None
    niveau_experience: Optional[str] = None
    mode_travail: Optional[str] = None
    salaire_min: Optional[int] = None
    salaire_max: Optional[int] = None
    ocean_O: Optional[float] = None
    ocean_C: Optional[float] = None
    ocean_E: Optional[float] = None
    ocean_A: Optional[float] = None
    ocean_N: Optional[float] = None
    poids_competences: Optional[float] = None
    poids_experience: Optional[float] = None
    poids_formation: Optional[float] = None
    poids_personnalite: Optional[float] = None