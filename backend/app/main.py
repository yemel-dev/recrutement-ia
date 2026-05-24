from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import User, JobOffer, Application, PersonalityTest, Ranking

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