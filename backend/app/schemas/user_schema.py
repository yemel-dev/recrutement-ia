from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole


# ─── Schémas de base ──────────────────────────────────────────────────────────

class UserBase(BaseModel):
    nom: str
    prenom: str
    email: EmailStr


# ─── Création ─────────────────────────────────────────────────────────────────

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.candidat


# ─── Réponse API (jamais le mot de passe) ─────────────────────────────────────

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Token JWT ────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: str | None = None