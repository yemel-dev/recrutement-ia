"""
test_admin.py
--------------
Tests unitaires pour le router auth.py côté administration :
    POST   /admin/users
    GET    /admin/users
    PATCH  /admin/users/{id}
    DELETE /admin/users/{id}

Comment lancer :
    cd backend
    pytest tests/test_admin.py -v
"""

import pytest

from app.config import settings
from tests.conftest import obtenir_token_admin, creer_utilisateur_via_admin


# ──────────────────────────────────────────────────────────────────────────────
# Données de test réutilisables
# ──────────────────────────────────────────────────────────────────────────────

CANDIDAT = {
    "nom": "Martin", "prenom": "Jean",
    "email": "jean.candidat@test.cm",
    "password": "MotDePasse123", "role": "candidat"
}

RECRUTEUR = {
    "nom": "Dupont", "prenom": "Alice",
    "email": "alice.recruteur@test.cm",
    "password": "MotDePasse123", "role": "recruteur"
}

NOUVEL_ADMIN = {
    "nom": "Ngassa", "prenom": "Paul",
    "email": "paul.admin@test.cm",
    "password": "MotDePasse123", "role": "admin"
}


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def obtenir_token_candidat(client, user_data=CANDIDAT):
    """Inscrit un candidat via l'inscription publique et retourne son token."""
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/login", data={
        "username": user_data["email"],
        "password": user_data["password"]
    })
    return response.json()["access_token"]


# ==============================================================================
# Compte admin par défaut
# ==============================================================================

class TestAdminParDefaut:

    def test_admin_par_defaut_peut_se_connecter(self, client):
        """Le compte admin créé au démarrage de l'app doit pouvoir se connecter."""
        response = client.post("/auth/login", data={
            "username": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD,
        })
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_admin_par_defaut_a_le_bon_role(self, client):
        token = obtenir_token_admin(client)
        response = client.get("/auth/me", headers=headers(token))
        assert response.status_code == 200
        assert response.json()["role"] == "admin"


# ==============================================================================
# POST /admin/users
# ==============================================================================

class TestCreerUtilisateur:

    def test_admin_peut_creer_un_recruteur(self, client):
        token = obtenir_token_admin(client)
        response = client.post("/admin/users", json=RECRUTEUR, headers=headers(token))
        assert response.status_code == 201
        assert response.json()["role"] == "recruteur"
        assert "password" not in response.json()

    def test_admin_peut_creer_un_autre_admin(self, client):
        token = obtenir_token_admin(client)
        response = client.post("/admin/users", json=NOUVEL_ADMIN, headers=headers(token))
        assert response.status_code == 201
        assert response.json()["role"] == "admin"

    def test_email_deja_utilise_refuse(self, client):
        token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(token))
        response = client.post("/admin/users", json=RECRUTEUR, headers=headers(token))
        assert response.status_code == 400

    def test_candidat_ne_peut_pas_creer_utilisateur(self, client):
        candidat_token = obtenir_token_candidat(client)
        response = client.post("/admin/users", json=RECRUTEUR, headers=headers(candidat_token))
        assert response.status_code == 403

    def test_recruteur_ne_peut_pas_creer_utilisateur(self, client):
        admin_token = obtenir_token_admin(client)
        recruteur_token = creer_utilisateur_via_admin(client, RECRUTEUR)
        response = client.post(
            "/admin/users",
            json={**NOUVEL_ADMIN, "email": "autre@test.cm"},
            headers=headers(recruteur_token),
        )
        assert response.status_code == 403

    def test_sans_token_refuse(self, client):
        response = client.post("/admin/users", json=RECRUTEUR)
        assert response.status_code == 401

    def test_role_par_defaut_est_recruteur(self, client):
        """Si 'role' est omis, UserCreateAdmin doit défaulter sur 'recruteur'."""
        token = obtenir_token_admin(client)
        data = {k: v for k, v in RECRUTEUR.items() if k != "role"}
        response = client.post("/admin/users", json=data, headers=headers(token))
        assert response.status_code == 201
        assert response.json()["role"] == "recruteur"


# ==============================================================================
# GET /admin/users
# ==============================================================================

class TestListerUtilisateurs:

    def test_admin_peut_lister_les_utilisateurs(self, client):
        token = obtenir_token_admin(client)
        obtenir_token_candidat(client)
        creer_utilisateur_via_admin(client, RECRUTEUR)

        response = client.get("/admin/users", headers=headers(token))
        assert response.status_code == 200
        emails = [u["email"] for u in response.json()]
        assert settings.ADMIN_EMAIL in emails
        assert CANDIDAT["email"] in emails
        assert RECRUTEUR["email"] in emails

    def test_candidat_ne_peut_pas_lister(self, client):
        candidat_token = obtenir_token_candidat(client)
        response = client.get("/admin/users", headers=headers(candidat_token))
        assert response.status_code == 403

    def test_recruteur_ne_peut_pas_lister(self, client):
        recruteur_token = creer_utilisateur_via_admin(client, RECRUTEUR)
        response = client.get("/admin/users", headers=headers(recruteur_token))
        assert response.status_code == 403

    def test_sans_token_refuse(self, client):
        response = client.get("/admin/users")
        assert response.status_code == 401


# ==============================================================================
# PATCH /admin/users/{id} — activer / désactiver
# ==============================================================================

class TestToggleActif:

    def test_admin_peut_desactiver_un_recruteur(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])

        response = client.patch(f"/admin/users/{recruteur_id}", headers=headers(admin_token))
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_toggle_est_reversible(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])

        client.patch(f"/admin/users/{recruteur_id}", headers=headers(admin_token))
        response = client.patch(f"/admin/users/{recruteur_id}", headers=headers(admin_token))
        assert response.status_code == 200
        assert response.json()["is_active"] is True

    def test_compte_desactive_ne_peut_plus_se_connecter(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])
        client.patch(f"/admin/users/{recruteur_id}", headers=headers(admin_token))

        response = client.post("/auth/login", data={
            "username": RECRUTEUR["email"], "password": RECRUTEUR["password"]
        })
        assert response.status_code == 401

    def test_impossible_de_desactiver_un_admin(self, client):
        admin_token = obtenir_token_admin(client)
        moi = client.get("/auth/me", headers=headers(admin_token)).json()

        response = client.patch(f"/admin/users/{moi['id']}", headers=headers(admin_token))
        assert response.status_code == 400

    def test_utilisateur_inexistant_404(self, client):
        admin_token = obtenir_token_admin(client)
        response = client.patch("/admin/users/999999", headers=headers(admin_token))
        assert response.status_code == 404

    def test_candidat_ne_peut_pas_toggle(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])

        candidat_token = obtenir_token_candidat(client)
        response = client.patch(f"/admin/users/{recruteur_id}", headers=headers(candidat_token))
        assert response.status_code == 403


# ==============================================================================
# DELETE /admin/users/{id}
# ==============================================================================

class TestSupprimerUtilisateur:

    def test_admin_peut_supprimer_un_recruteur(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])

        response = client.delete(f"/admin/users/{recruteur_id}", headers=headers(admin_token))
        assert response.status_code == 204

        liste_apres = client.get("/admin/users", headers=headers(admin_token)).json()
        assert recruteur_id not in [u["id"] for u in liste_apres]

    def test_impossible_de_se_supprimer_soi_meme(self, client):
        admin_token = obtenir_token_admin(client)
        moi = client.get("/auth/me", headers=headers(admin_token)).json()

        response = client.delete(f"/admin/users/{moi['id']}", headers=headers(admin_token))
        assert response.status_code == 400

    def test_utilisateur_inexistant_404(self, client):
        admin_token = obtenir_token_admin(client)
        response = client.delete("/admin/users/999999", headers=headers(admin_token))
        assert response.status_code == 404

    def test_candidat_ne_peut_pas_supprimer(self, client):
        admin_token = obtenir_token_admin(client)
        client.post("/admin/users", json=RECRUTEUR, headers=headers(admin_token))
        liste = client.get("/admin/users", headers=headers(admin_token)).json()
        recruteur_id = next(u["id"] for u in liste if u["email"] == RECRUTEUR["email"])

        candidat_token = obtenir_token_candidat(client)
        response = client.delete(f"/admin/users/{recruteur_id}", headers=headers(candidat_token))
        assert response.status_code == 403
        # doit toujours exister
        liste_apres = client.get("/admin/users", headers=headers(admin_token)).json()
        assert recruteur_id in [u["id"] for u in liste_apres]


# ==============================================================================
# Rôle imposé côté inscription publique (protection anti-élévation de privilège)
# ==============================================================================

class TestProtectionInscriptionPublique:

    def test_register_ignore_role_admin_envoye(self, client):
        response = client.post("/auth/register", json={
            "nom": "Hacker", "prenom": "Malicieux",
            "email": "hacker@test.cm", "password": "MotDePasse123",
            "role": "admin",
        })
        assert response.status_code == 201
        assert response.json()["role"] == "candidat"

    def test_register_ignore_role_recruteur_envoye(self, client):
        response = client.post("/auth/register", json={
            "nom": "Hacker", "prenom": "Malicieux2",
            "email": "hacker2@test.cm", "password": "MotDePasse123",
            "role": "recruteur",
        })
        assert response.status_code == 201
        assert response.json()["role"] == "candidat"