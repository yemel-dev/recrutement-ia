"""
Service d'authentification — Hashage mot de passe + Tokens JWT + Connexion Google
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from app.config import settings
from app.models.user import User, UserRole
from app.schemas.user_schema import TokenData

# ─── Configuration hashage mot de passe ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Fonctions mot de passe ───────────────────────────────────────────────────

def hasher_mot_de_passe(mot_de_passe: str) -> str:
    """Hash un mot de passe en clair avec bcrypt."""
    return pwd_context.hash(mot_de_passe)


def verifier_mot_de_passe(mot_de_passe: str, hash: str | None) -> bool:
    """
    Vérifie qu'un mot de passe correspond à son hash.
    Retourne False si hash est None — cas d'un compte créé via Google,
    qui n'a jamais eu de mot de passe local défini.
    """
    if hash is None:
        return False
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


def decoder_token(token: Optional[str]) -> Optional[TokenData]:
    """
    Décode et vérifie un token JWT.
    Retourne TokenData si valide, None sinon.
    """
    if not token:
        return None
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


# ─── Connexion via Google ──────────────────────────────────────────────────────

class GoogleTokenInvalide(Exception):
    """Levée quand le jeton Google fourni est invalide, expiré, ou mal destiné."""
    pass


def verifier_jeton_google(credential: str) -> dict:
    """
    Vérifie cryptographiquement un jeton d'identité ("ID token") Google.

    Ce n'est PAS un simple décodage : la lib officielle `google-auth`
    contacte les clés publiques de Google pour s'assurer que le jeton a bien
    été signé par Google, n'est pas expiré, et est destiné à CETTE
    application précise (vérification de l'"audience" == notre Client ID).
    Sans cette vérification, n'importe qui pourrait fabriquer un faux jeton
    prétendant être n'importe quel email.

    Retourne le payload du jeton (contient email, given_name, family_name,
    picture, sub, email_verified...) si valide.
    Lève GoogleTokenInvalide sinon.
    """
    try:
        payload = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as erreur:
        raise GoogleTokenInvalide(str(erreur))

    if not payload.get("email_verified", False):
        raise GoogleTokenInvalide("Email Google non vérifié")

    return payload


def obtenir_ou_creer_utilisateur_google(db: Session, payload: dict) -> tuple[User, bool]:
    """
    À partir du payload vérifié d'un jeton Google, retrouve le compte
    correspondant ou en crée un nouveau (toujours rôle candidat — comme pour
    l'inscription classique, la connexion Google ne permet jamais de créer un
    recruteur ou un admin).

    Retourne (user, est_nouveau_compte).
    """
    email     = payload["email"]
    google_id = payload["sub"]
    prenom    = payload.get("given_name", "")
    nom       = payload.get("family_name", "") or prenom  # fallback si pas de nom de famille
    photo_url = payload.get("picture")

    user = obtenir_utilisateur_par_email(db, email)

    if user:
        # Compte existant (créé via email/mot de passe, ou déjà via Google
        # une fois) — on (re)lie le google_id et on complète la photo si
        # elle n'a jamais été définie par l'utilisateur lui-même.
        if not user.google_id:
            user.google_id = google_id
        if not user.photo_url and photo_url:
            user.photo_url = photo_url
        db.commit()
        db.refresh(user)
        return user, False

    # Nouveau compte — toujours candidat, jamais de mot de passe local
    user = User(
        nom=nom,
        prenom=prenom,
        email=email,
        hashed_password=None,
        google_id=google_id,
        photo_url=photo_url,
        role=UserRole.candidat,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True