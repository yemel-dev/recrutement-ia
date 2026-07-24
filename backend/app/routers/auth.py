from typing import Optional
"""
Router Auth — Authentification + gestion admin des utilisateurs

Endpoints publics :
    POST /auth/register  → inscription candidat uniquement (rôle forcé)
    POST /auth/login     → connexion → retourne JWT
    GET  /auth/me        → profil utilisateur connecté

Endpoints admin (token admin requis) :
    POST   /admin/users          → créer un recruteur ou un admin
    GET    /admin/users          → lister tous les utilisateurs
    PATCH  /admin/users/{id}     → activer/désactiver un utilisateur
    DELETE /admin/users/{id}     → supprimer un utilisateur
"""
import os
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user_schema import (
    UserCreate, UserCreateAdmin, UserResponse, Token,
    UserProfileUpdate, GoogleLoginRequest,
)
from app.services.auth_service import (
    authentifier_utilisateur,
    creer_token_acces,
    creer_utilisateur,
    obtenir_utilisateur_par_email,
    decoder_token,
    verifier_jeton_google,
    obtenir_ou_creer_utilisateur_google,
    GoogleTokenInvalide,
)
from app.services import email_service
from app.models.user import User, UserRole

PHOTOS_DIR = "uploads/profile_photos"
EXTENSIONS_PHOTO_AUTORISEES = {".jpg", ".jpeg", ".png", ".webp"}
TAILLE_MAX_PHOTO = 5 * 1024 * 1024  # 5 Mo
os.makedirs(PHOTOS_DIR, exist_ok=True)

router = APIRouter(tags=["Authentification"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ─── Dépendance : utilisateur connecté ───────────────────────────────────────

def get_current_user(
    db:    Session = Depends(get_db),
    token_header: Optional[str] = Depends(oauth2_scheme),
    token_query:  Optional[str] = Query(default=None),
) -> User:
    # SSE (EventSource) ne peut pas envoyer de header Authorization —
    # on accepte donc le token en query param ?token=... comme fallback.
    token = token_query or token_header
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


# ─── Dépendance générique : restriction par rôle ─────────────────────────────

def require_roles(*roles: UserRole):
    """
    Factory de dépendance FastAPI — autorise uniquement les rôles listés.

    Remplace tous les contrôles `if current_user.role != X: raise 403`
    dispersés dans les routers, pour avoir un seul endroit à faire évoluer.

    Usage :
        @router.post("/", dependencies=[Depends(require_roles(UserRole.recruteur))])
        # ou en tant que paramètre injecté :
        def endpoint(current_user: User = Depends(require_roles(UserRole.recruteur, UserRole.admin))):
            ...
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé pour votre rôle",
            )
        return current_user
    return dependency


# ─── Dépendance : admin uniquement (alias basé sur require_roles) ────────────

get_current_admin = require_roles(UserRole.admin)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS PUBLICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
             tags=["Authentification"])
def register(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Inscription publique — crée un compte CANDIDAT uniquement.
    Le rôle est toujours forcé à 'candidat', peu importe ce qui est envoyé.
    """
    existant = obtenir_utilisateur_par_email(db, user_data.email)
    if existant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    user = creer_utilisateur(
        db=db,
        nom=user_data.nom,
        prenom=user_data.prenom,
        email=user_data.email,
        mot_de_passe=user_data.password,
        role=UserRole.candidat,      # ← toujours forcé candidat
    )

    background_tasks.add_task(email_service.envoyer_bienvenue, user.email, user.prenom)

    return user


@router.post("/auth/login", response_model=Token, tags=["Authentification"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Connexion — retourne un token JWT."""
    utilisateur_existant = obtenir_utilisateur_par_email(db, form_data.username)
    if utilisateur_existant and utilisateur_existant.hashed_password is None:
        # Compte créé via Google : pas de mot de passe local à vérifier.
        # On le dit clairement plutôt que de renvoyer un "email/mdp incorrect"
        # trompeur — l'utilisateur ne s'est jamais trompé, il utilise juste
        # le mauvais mode de connexion.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte utilise la connexion Google. Clique sur \"Continuer avec Google\".",
        )

    user = authentifier_utilisateur(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        # Avant ce correctif, un compte désactivé par un admin recevait quand
        # même un token valide ici, qui échouait seulement plus tard sur les
        # endpoints protégés (via get_current_user). On le refuse dès la
        # connexion, avec un message clair.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ce compte a été désactivé",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = creer_token_acces(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/google", response_model=Token, tags=["Authentification"])
def login_google(
    payload: GoogleLoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Connexion/inscription via Google — reçoit le jeton d'identité que le
    frontend obtient après une connexion réussie avec le bouton Google.

    - Si l'email existe déjà (compte classique) → on le lie au compte Google
      et on connecte normalement, avec le même JWT que d'habitude.
    - Sinon → création automatique d'un compte candidat (jamais recruteur/admin).
    """
    try:
        google_payload = verifier_jeton_google(payload.credential)
    except GoogleTokenInvalide:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton Google invalide ou expiré",
        )

    user, est_nouveau = obtenir_ou_creer_utilisateur_google(db, google_payload)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ce compte a été désactivé",
        )

    if est_nouveau:
        background_tasks.add_task(email_service.envoyer_bienvenue, user.email, user.prenom)

    access_token = creer_token_acces(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserResponse, tags=["Authentification"])
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


@router.patch("/auth/me", response_model=UserResponse, tags=["Authentification"])
def modifier_mon_profil(
    profil_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Édite le profil de l'utilisateur connecté (nom, prénom, bio, téléphone,
    localisation, liens LinkedIn/GitHub/portfolio). Ne modifie jamais l'email
    ni le rôle — volontairement exclus, ce sont des opérations sensibles qui
    ne passent pas par cet endpoint.
    """
    champs_a_modifier = profil_data.model_dump(exclude_unset=True)
    for champ, valeur in champs_a_modifier.items():
        setattr(current_user, champ, valeur)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/auth/me/photo", response_model=UserResponse, tags=["Authentification"])
def uploader_photo_profil(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload/remplace la photo de profil de l'utilisateur connecté.
    Stockée dans un dossier PUBLIC (contrairement au CV) car affichée
    directement dans l'UI sans authentification (balises <img>).
    """
    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in EXTENSIONS_PHOTO_AUTORISEES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Format non supporté. Formats acceptés : JPG, PNG, WEBP.",
        )

    contenu = file.file.read()
    if len(contenu) > TAILLE_MAX_PHOTO:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fichier trop volumineux (5 Mo maximum).",
        )

    # Nom de fichier unique — évite d'écraser la photo d'un autre utilisateur
    # et évite le cache navigateur qui garderait l'ancienne image affichée
    # sous la même URL après un remplacement.
    nom_fichier = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}{extension}"
    chemin_fichier = os.path.join(PHOTOS_DIR, nom_fichier)
    with open(chemin_fichier, "wb") as f:
        f.write(contenu)

    current_user.photo_url = f"/static/photos/{nom_fichier}"
    db.commit()
    db.refresh(current_user)
    return current_user


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
             tags=["Administration"])
def admin_creer_utilisateur(
    user_data: UserCreateAdmin,
    background_tasks: BackgroundTasks,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_admin),
):
    """
    [ADMIN] Crée un recruteur ou un autre admin.
    Seul un admin connecté peut appeler cet endpoint.
    """
    existant = obtenir_utilisateur_par_email(db, user_data.email)
    if existant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    user = creer_utilisateur(
        db=db,
        nom=user_data.nom,
        prenom=user_data.prenom,
        email=user_data.email,
        mot_de_passe=user_data.password,
        role=user_data.role,
    )

    # On envoie le mot de passe EN CLAIR reçu dans la requête (user_data.password),
    # jamais le hash stocké en base — c'est le seul moment où il est disponible.
    background_tasks.add_task(
        email_service.envoyer_compte_cree_admin,
        user.email, user.prenom, user.role.value, user_data.password,
    )

    return user


@router.get("/admin/users", response_model=list[UserResponse], tags=["Administration"])
def admin_lister_utilisateurs(
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_admin),
):
    """[ADMIN] Liste tous les utilisateurs de la plateforme."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/admin/users/{user_id}", response_model=UserResponse, tags=["Administration"])
def admin_toggle_actif(
    user_id: int,
    background_tasks: BackgroundTasks,
    db:      Session = Depends(get_db),
    _:       User    = Depends(get_current_admin),
):
    """[ADMIN] Active ou désactive un compte utilisateur."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Impossible de désactiver un admin")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    # On notifie seulement quand le compte VIENT d'être désactivé, pas à la réactivation
    if not user.is_active:
        background_tasks.add_task(email_service.envoyer_compte_desactive, user.email, user.prenom)

    return user


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT,
               tags=["Administration"])
def admin_supprimer_utilisateur(
    user_id: int,
    db:      Session = Depends(get_db),
    admin:   User    = Depends(get_current_admin),
):
    """[ADMIN] Supprime un utilisateur (sauf soi-même)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de se supprimer soi-même")

    db.delete(user)
    db.commit()