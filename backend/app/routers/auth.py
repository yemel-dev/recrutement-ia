"""
Router Auth — Endpoints /auth/register et /auth/login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user_schema import UserCreate, UserResponse, Token
from app.services.auth_service import (
    authentifier_utilisateur,
    creer_token_acces,
    creer_utilisateur,
    obtenir_utilisateur_par_email,
    decoder_token,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentification"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── Dépendance : utilisateur connecté ───────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dépendance FastAPI — extrait et valide le token JWT.
    Utilisée dans tous les endpoints protégés.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decoder_token(token)
    if token_data is None:
        raise credentials_exception

    user = obtenir_utilisateur_par_email(db, token_data.email)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


# ─── POST /auth/register ──────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Inscription d'un nouvel utilisateur (candidat ou recruteur).

    - Vérifie que l'email n'est pas déjà utilisé
    - Hashe le mot de passe avec bcrypt
    - Crée le compte en base
    """
    # Vérifier si l'email existe déjà
    existant = obtenir_utilisateur_par_email(db, user_data.email)
    if existant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email"
        )

    user = creer_utilisateur(
        db=db,
        nom=user_data.nom,
        prenom=user_data.prenom,
        email=user_data.email,
        mot_de_passe=user_data.password,
        role=user_data.role
    )
    return user


# ─── POST /auth/login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Connexion — retourne un token JWT.

    - username = email de l'utilisateur
    - password = mot de passe en clair
    - Retourne access_token + token_type
    """
    user = authentifier_utilisateur(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = creer_token_acces(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ─── GET /auth/me ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retourne les informations de l'utilisateur connecté.
    Endpoint protégé — nécessite un token JWT valide.
    """
    return current_user