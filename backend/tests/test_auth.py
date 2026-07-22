"""
Tests unitaires pour l'authentification (register, login, token JWT).
Lance avec : pytest tests/test_auth.py -v
"""
import pytest
from app.services.auth_service import (
    hasher_mot_de_passe,
    verifier_mot_de_passe,
    creer_token_acces,
    decoder_token,
)


@pytest.fixture
def candidat_data():
    return {
        "nom": "Kamga",
        "prenom": "Jean",
        "email": "jean.kamga@univ-dschang.cm",
        "password": "MotDePasse123",
        "role": "candidat"
    }


@pytest.fixture
def recruteur_data():
    return {
        "nom": "Fopa",
        "prenom": "Marie",
        "email": "marie.fopa@entreprise.cm",
        "password": "MotDePasse456",
        "role": "recruteur"
    }


# ─── Tests Hashage Mot de Passe ───────────────────────────────────────────────

class TestHashageMdp:

    def test_hasher_mot_de_passe(self):
        mdp = "MotDePasse"
        hash = hasher_mot_de_passe(mdp)
        assert hash != mdp
        assert len(hash) > 20

    def test_verifier_mot_de_passe_correct(self):
        mdp = "MotDePasse"
        hash = hasher_mot_de_passe(mdp)
        assert verifier_mot_de_passe(mdp, hash) is True

    def test_verifier_mot_de_passe_incorrect(self):
        hash = hasher_mot_de_passe("BonMotDePasse")
        assert verifier_mot_de_passe("MauvaisMotDePasse", hash) is False

    def test_deux_hash_differents(self):
        mdp = "MotDePasse"
        hash1 = hasher_mot_de_passe(mdp)
        hash2 = hasher_mot_de_passe(mdp)
        assert hash1 != hash2


# ─── Tests Token JWT ──────────────────────────────────────────────────────────

class TestTokenJWT:

    def test_creer_token(self):
        token = creer_token_acces(data={"sub": "jean@test.cm"})
        assert token is not None
        assert len(token) > 20

    def test_decoder_token_valide(self):
        token = creer_token_acces(data={"sub": "jean@test.cm"})
        token_data = decoder_token(token)
        assert token_data is not None
        assert token_data.email == "jean@test.cm"

    def test_decoder_token_invalide(self):
        token_data = decoder_token("token.faux.invalide")
        assert token_data is None

    def test_decoder_token_vide(self):
        token_data = decoder_token("")
        assert token_data is None


# ─── Tests Endpoint Register ──────────────────────────────────────────────────

class TestRegister:

    def test_inscription_candidat(self, client, candidat_data):
        response = client.post("/auth/register", json=candidat_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == candidat_data["email"]
        assert data["nom"] == candidat_data["nom"]
        assert data["role"] == "candidat"
        assert "password" not in data
        assert "hashed_password" not in data

    def test_inscription_ignore_role_envoye(self, client, recruteur_data):
        """
        L'inscription publique force toujours le rôle 'candidat', même si
        un autre rôle (ex: 'recruteur') est envoyé dans la requête.
        Seul un admin peut créer un recruteur, via POST /admin/users.
        """
        response = client.post("/auth/register", json=recruteur_data)
        assert response.status_code == 201
        assert response.json()["role"] == "candidat"

    def test_email_deja_utilise(self, client, candidat_data):
        client.post("/auth/register", json=candidat_data)
        response = client.post("/auth/register", json=candidat_data)
        assert response.status_code == 400
        assert "existe déjà" in response.json()["detail"]

    def test_email_invalide(self, client):
        response = client.post("/auth/register", json={
            "nom": "Test", "prenom": "User",
            "email": "pas-un-email",
            "password": "MotDePasse123",
            "role": "candidat"
        })
        assert response.status_code == 422

    def test_champs_manquants(self, client):
        response = client.post("/auth/register", json={"email": "test@test.cm"})
        assert response.status_code == 422


# ─── Tests Endpoint Login ─────────────────────────────────────────────────────

class TestLogin:

    def test_connexion_reussie(self, client, candidat_data):
        client.post("/auth/register", json=candidat_data)
        response = client.post("/auth/login", data={
            "username": candidat_data["email"],
            "password": candidat_data["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_mauvais_mot_de_passe(self, client, candidat_data):
        client.post("/auth/register", json=candidat_data)
        response = client.post("/auth/login", data={
            "username": candidat_data["email"],
            "password": "MauvaisMotDePasse"
        })
        assert response.status_code == 401

    def test_email_inexistant(self, client):
        response = client.post("/auth/login", data={
            "username": "inexistant@test.cm",
            "password": "MotDePasse123"
        })
        assert response.status_code == 401

    def test_token_retourne_decodable(self, client, candidat_data):
        client.post("/auth/register", json=candidat_data)
        response = client.post("/auth/login", data={
            "username": candidat_data["email"],
            "password": candidat_data["password"]
        })
        token = response.json()["access_token"]
        token_data = decoder_token(token)
        assert token_data.email == candidat_data["email"]


# ─── Tests Endpoint /auth/me ──────────────────────────────────────────────────

class TestGetMe:

    def test_profil_avec_token_valide(self, client, candidat_data):
        client.post("/auth/register", json=candidat_data)
        login = client.post("/auth/login", data={
            "username": candidat_data["email"],
            "password": candidat_data["password"]
        })
        token = login.json()["access_token"]
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == candidat_data["email"]
        assert data["nom"] == candidat_data["nom"]

    def test_profil_sans_token(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_profil_token_invalide(self, client):
        response = client.get("/auth/me", headers={"Authorization": "Bearer token.faux.invalide"})
        assert response.status_code == 401