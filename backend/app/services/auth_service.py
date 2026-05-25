"""
Service d'authentification — Hashage mot de passe + Tokens JWT
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.schemas.user_schema import TokenData

# ─── Configuration hashage mot de passe ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Fonctions mot de passe ───────────────────────────────────────────────────

def hasher_mot_de_passe(mot_de_passe: str) -> str:
    """Hash un mot de passe en clair avec bcrypt."""
    return pwd_context.hash(mot_de_passe)


def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    """Vérifie qu'un mot de passe correspond à son hash."""
    return pwd_context.verify(mot_de_passe, hash)


# ─── Fonctions JWT ────────────────────────────────────────────────────────────

def creer_token_acces(data: dict, expire_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT signé.
    - data : données à encoder (ex: {"sub": "email@test.cm"})
    - expire_delta : durée de validité (par défaut : settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    """
    to_encode = data.copy()
    if expire_delta:
        expire = datetime.now(timezone.utc) + expire_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decoder_token(token: str) -> Optional[TokenData]:
    """
    Décode et vérifie un token JWT.
    Retourne TokenData si valide, None sinon.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None


# ─── Fonctions utilisateur ────────────────────────────────────────────────────

def obtenir_utilisateur_par_email(db: Session, email: str) -> Optional[User]:
    """Récupère un utilisateur par son email."""
    return db.query(User).filter(User.email == email).first()


def authentifier_utilisateur(db: Session, email: str, mot_de_passe: str) -> Optional[User]:
    """
    Vérifie les credentials d'un utilisateur.
    Retourne l'utilisateur si valide, None sinon.
    """
    user = obtenir_utilisateur_par_email(db, email)
    if not user:
        return None
    if not verifier_mot_de_passe(mot_de_passe, user.hashed_password):
        return None
    return user


def creer_utilisateur(db: Session, nom: str, prenom: str, email: str,
                      mot_de_passe: str, role) -> User:
    """Crée un nouvel utilisateur en base avec mot de passe hashé."""
    hashed = hasher_mot_de_passe(mot_de_passe)
    user = User(
        nom=nom,
        prenom=prenom,
        email=email,
        hashed_password=hashed,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user