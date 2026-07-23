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
    id:            int
    role:          UserRole
    is_active:     bool
    created_at:    datetime

    # Profil enrichi — toujours optionnels, None tant que non renseignés
    photo_url:     str | None = None
    telephone:     str | None = None
    localisation:  str | None = None
    bio:           str | None = None
    linkedin_url:  str | None = None
    github_url:    str | None = None
    portfolio_url: str | None = None

    model_config = {"from_attributes": True}


# ─── Édition de profil (PATCH /auth/me) ───────────────────────────────────────
class UserProfileUpdate(BaseModel):
    """
    Tous les champs sont optionnels : seuls ceux envoyés sont modifiés.
    Ne permet PAS de changer l'email ou le rôle — ce sont des opérations
    sensibles volontairement exclues de cet endpoint.
    """
    nom:           str | None = None
    prenom:        str | None = None
    telephone:     str | None = None
    localisation:  str | None = None
    bio:           str | None = None
    linkedin_url:  str | None = None
    github_url:    str | None = None
    portfolio_url: str | None = None


# ─── Connexion via Google ──────────────────────────────────────────────────────
class GoogleLoginRequest(BaseModel):
    # Le jeton d'identité ("ID token") renvoyé par Google côté frontend
    # après une connexion réussie avec le bouton "Continuer avec Google".
    credential: str


# ─── Token JWT ────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"


class TokenData(BaseModel):
    email: str | None = None