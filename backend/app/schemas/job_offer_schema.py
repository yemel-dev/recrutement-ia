from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import List


# ─── Schéma de base ───────────────────────────────────────────────────────────

class JobOfferBase(BaseModel):
    titre: str
    description: str
    competences_requises: List[str]
    experience_requise: int = 0

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