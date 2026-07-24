import asyncio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
from app.database import Base, engine, get_db
from app.models import User, JobOffer, Application, PersonalityTest, Ranking
from app.models.user import UserRole
from app.routers.auth import router as auth_router
from app.routers.personality import router as personality_router
from app.routers.offers import router as offers_router
from app.routers.applications import router as applications_router, set_main_loop
from app.services.auth_service import creer_utilisateur, obtenir_utilisateur_par_email
from app.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Recrutement Intelligent IA",
    description="Plateforme de recrutement avec analyse NLP et test Big Five (OCEAN)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Cache-Control", "X-Accel-Buffering"],
)

# Photos de profil : contenu PUBLIC (pas d'auth requise pour l'affichage,
# contrairement aux CV qui passent par un endpoint protégé). Le dossier est
# créé automatiquement si absent, pour éviter une erreur au premier démarrage.
os.makedirs("uploads/profile_photos", exist_ok=True)
app.mount("/static/photos", StaticFiles(directory="uploads/profile_photos"), name="photos")

app.include_router(auth_router)
app.include_router(personality_router)
app.include_router(offers_router)
app.include_router(applications_router)


# ─── Création automatique de l'admin au démarrage ────────────────────────────

def creer_admin_par_defaut(db: Session) -> None:
    """
    Crée le compte admin au premier démarrage si il n'existe pas encore.
    Identifiants définis dans le fichier .env (ou valeurs par défaut de
    Settings si absents — à changer en dehors du développement local).

    Reçoit la session en paramètre plutôt que d'en ouvrir une elle-même :
    ça permet aux tests de passer leur propre session (via le même
    mécanisme app.dependency_overrides[get_db] que les endpoints) au lieu
    d'écrire silencieusement dans la vraie base de données.
    """
    existant = obtenir_utilisateur_par_email(db, settings.ADMIN_EMAIL)
    if not existant:
        creer_utilisateur(
            db=db,
            nom=settings.ADMIN_NOM,
            prenom=settings.ADMIN_PRENOM,
            email=settings.ADMIN_EMAIL,
            mot_de_passe=settings.ADMIN_PASSWORD,
            role=UserRole.admin,
        )
        print(f"✅ Compte admin créé : {settings.ADMIN_EMAIL}")
    else:
        # S'assure que le compte existant a bien le rôle admin
        if existant.role != UserRole.admin:
            existant.role = UserRole.admin
            db.commit()
            print(f"✅ Rôle admin mis à jour pour : {settings.ADMIN_EMAIL}")


@app.on_event("startup")
def init_admin_au_demarrage():
    db = next(get_db())
    try:
        creer_admin_par_defaut(db)
    finally:
        db.close()


@app.on_event("startup")
async def init_sse_loop_au_demarrage():
    """
    Capture le event loop principal pour le SSE des candidatures.

    Ce handler est `async def` et tourne bien dans le thread du event loop
    principal (contrairement à postuler(), qui est `def` et tourne dans le
    threadpool) — get_running_loop() y retourne donc le bon loop, une fois
    pour toutes, au démarrage de l'application.
    """
    set_main_loop(asyncio.get_running_loop())


@app.get("/")
def root():
    return {"message": "Recrutement Intelligent IA v2.0", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "ok"}