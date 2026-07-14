from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import User, JobOffer, Application, PersonalityTest, Ranking
from app.routers.auth import router as auth_router
from app.routers.offers import router as offers_router

# Création automatique des tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Recrutement Intelligent IA",
    description="Plateforme de recrutement avec analyse NLP et test Big Five (OCEAN)",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(offers_router)


# ─── Endpoints de base ────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "Bienvenue sur l'API Recrutement Intelligent IA",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}