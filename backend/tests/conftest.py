"""
Configuration globale des tests.
"""
import os

# ──────────────────────────────────────────────────────────────────────────────
# IMPORTANT — doit rester tout en haut, avant tout import de `app.*`.
#
# app.config.settings lit DATABASE_URL au moment de l'import (pydantic
# Settings). En fixant la variable d'environnement ici, on garantit que
# TOUTE l'app — y compris ce qui n'utilise pas la dépendance `get_db`
# injectée par FastAPI — pointe vers la base de test :
#   - le hook de démarrage qui crée le compte admin (main.py)
#   - la tâche de fond qui analyse les CV (routers/applications.py,
#     _run_analyse_background), qui ouvre sa propre session DB car elle
#     tourne hors du cycle de vie de la requête HTTP
#
# Ces deux endroits importent `SessionLocal` directement depuis
# `app.database`, pas la dépendance `get_db`. Avant ce correctif, ils
# utilisaient donc toujours la vraie base (recrutement_ia.db, définie
# dans .env) même pendant les tests, quel que soit l'override de `get_db`
# ci-dessous — d'où des tests qui échouaient silencieusement (aucune
# exception, juste des données jamais écrites au bon endroit).
# ──────────────────────────────────────────────────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_temp.db"

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    from app.database import Base, engine

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # On ne supprime pas le fichier sur Windows car SQLAlchemy garde la connexion


@pytest.fixture(scope="function")
def client(setup_database):
    from app.main import app
    with TestClient(app) as c:
        yield c


# ──────────────────────────────────────────────────────────────────────────────
# Helper : créer un recruteur ou un admin dans les tests
#
# Depuis l'ajout du rôle admin, POST /auth/register force TOUJOURS le rôle
# "candidat", quel que soit ce qui est envoyé (voir routers/auth.py). Il n'est
# donc plus possible de créer un compte recruteur/admin via l'inscription
# publique dans les tests : il faut passer par POST /admin/users, avec le
# compte admin par défaut créé au démarrage de l'app (voir main.py).
# ──────────────────────────────────────────────────────────────────────────────

def obtenir_token_admin(client) -> str:
    """Connecte le compte admin par défaut (créé au démarrage) et renvoie son token."""
    from app.config import settings
    login = client.post("/auth/login", data={
        "username": settings.ADMIN_EMAIL,
        "password": settings.ADMIN_PASSWORD,
    })
    assert login.status_code == 200, f"Connexion admin par défaut impossible : {login.text}"
    return login.json()["access_token"]


def creer_utilisateur_via_admin(client, user_data: dict) -> str:
    """
    Crée un utilisateur (recruteur ou admin) via POST /admin/users, en
    s'authentifiant avec le compte admin par défaut, puis renvoie le token
    JWT du nouvel utilisateur créé.

    user_data doit contenir : nom, prenom, email, password, role
    (role attendu : "recruteur" ou "admin").
    """
    admin_token = obtenir_token_admin(client)
    creation = client.post(
        "/admin/users",
        json=user_data,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert creation.status_code == 201, f"Création via /admin/users échouée : {creation.text}"

    login = client.post("/auth/login", data={
        "username": user_data["email"],
        "password": user_data["password"],
    })
    assert login.status_code == 200, f"Connexion du nouvel utilisateur échouée : {login.text}"
    return login.json()["access_token"]