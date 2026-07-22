from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    nom:    str
    prenom: str
    email:  EmailStr


# ─── Inscription publique : candidat uniquement ───────────────────────────────
class UserCreate(UserBase):
    password: str
    # Le rôle est ignoré — toujours forcé à candidat côté backend


# ─── Création par l'admin : recruteur ou admin ────────────────────────────────
class UserCreateAdmin(UserBase):
    password: str
    role: UserRole = UserRole.recruteur


# ─── Réponse API (jamais le mot de passe) ─────────────────────────────────────
class UserResponse(UserBase):
    id:         int
    role:       UserRole
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Token JWT ────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"


class TokenData(BaseModel):
    email: str | None = None