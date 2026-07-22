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
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user_schema import UserCreate, UserCreateAdmin, UserResponse, Token
from app.services.auth_service import (
    authentifier_utilisateur,
    creer_token_acces,
    creer_utilisateur,
    obtenir_utilisateur_par_email,
    decoder_token,
)
from app.services import email_service
from app.models.user import User, UserRole

router = APIRouter(tags=["Authentification"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── Dépendance : utilisateur connecté ───────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db)
) -> User:
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


@router.get("/auth/me", response_model=UserResponse, tags=["Authentification"])
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
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