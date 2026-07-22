from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.models.application import ApplicationStatus
import json


# ─── Réponse candidature ──────────────────────────────────────────────────────

class ApplicationResponse(BaseModel):
    id: int
    candidat_id: int
    offre_id: int
    cv_filename: str
    statut: ApplicationStatus

    # Résultats du pipeline NLP — retournés comme liste (pas comme string JSON)
    competences_extraites: Optional[list[str]] = None
    experience_annees: Optional[float] = None
    formation_niveau: Optional[str] = None

    # Scores (None si pas encore analysé)
    score_competences: Optional[float] = None
    score_experience: Optional[float] = None
    score_formation: Optional[float] = None
    score_personnalite: Optional[float] = None
    score_global: Optional[float] = None

    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("competences_extraites", mode="before")
    @classmethod
    def deserialiser_competences(cls, v):
        """
        Convertit automatiquement la string JSON stockée en base
        en vraie liste Python avant de retourner la réponse au frontend.

        Exemple :
            '["python", "sql", "docker"]'  →  ["python", "sql", "docker"]

        Comme ça le frontend reçoit directement un tableau JSON propre,
        sans avoir à faire JSON.parse() lui-même.
        """
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
        return v


# ─── Schéma pour le test Big Five ─────────────────────────────────────────────

class PersonalityTestCreate(BaseModel):
    reponses: dict  # {"q1": 4, "q2": 2, ...} — 25 réponses de 1 à 5


class PersonalityTestResponse(BaseModel):
    id: int
    candidat_id: int
    score_O: float
    score_C: float
    score_E: float
    score_A: float
    score_N: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Schéma pour le classement ────────────────────────────────────────────────

class RankingResponse(BaseModel):
    position: int
    candidat_nom: str
    candidat_prenom: str
    candidat_email: str
    score_global: float
    score_competences: float
    score_experience: float
    score_formation: float
    score_personnalite: float

    model_config = {"from_attributes": True}


# ─── Schéma de scoring (entrée de l'algorithme) ───────────────────────────────

class ScoringInput(BaseModel):
    """Données envoyées à l'algorithme de scoring."""
    # Données NLP extraites du CV (par le Membre 2)
    competences_cv: list[str]
    experience_annees: float
    formation_niveau: str  # "DOCTORAT", "MASTER", "LICENCE", "BTS", "AUTRE"

    # Scores OCEAN du candidat
    score_O: float
    score_C: float
    score_E: float
    score_A: float
    score_N: float

    # Exigences de l'offre
    competences_requises: list[str]
    experience_requise: int
    ocean_ideal: dict  # {"O": 0.8, "C": 0.7, ...}
    poids: dict        # {"competences": 0.40, "experience": 0.25, ...}


class ScoringOutput(BaseModel):
    """Résultat retourné par l'algorithme de scoring."""
    score_competences: float
    score_experience: float
    score_formation: float
    score_personnalite: float
    score_global: float
    detail: dict  # Détail des calculs pour transparence