"""
test_offers.py
--------------
Tests unitaires pour le router offers.py
Membre 3 - Backend | Université de Dschang 2024-2025

Comment lancer :
    cd backend
    pytest tests/test_offers.py -v
"""

import pytest
from fastapi.testclient import TestClient

# ──────────────────────────────────────────────────────────────────────────────
# Données de test réutilisables
# ──────────────────────────────────────────────────────────────────────────────

RECRUTEUR = {
    "nom": "Dupont", "prenom": "Alice",
    "email": "alice.recruteur@test.cm",
    "password": "MotDePasse123", "role": "recruteur"
}

CANDIDAT = {
    "nom": "Martin", "prenom": "Jean",
    "email": "jean.candidat@test.cm",
    "password": "MotDePasse123", "role": "candidat"
}

OFFRE_VALIDE = {
    "titre": "Ingénieur NLP",
    "description": "Nous recherchons un expert en NLP",
    "competences_requises": ["python", "spacy", "machine learning"],
    "experience_requise": 3,
    "ocean_O": 0.8, "ocean_C": 0.7, "ocean_E": 0.5,
    "ocean_A": 0.6, "ocean_N": 0.3,
    "poids_competences": 0.40, "poids_experience": 0.25,
    "poids_formation": 0.20, "poids_personnalite": 0.15
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def obtenir_token(client, user_data):
    """Inscrit un utilisateur et retourne son token JWT."""
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/login", data={
        "username": user_data["email"],
        "password": user_data["password"]
    })
    return response.json()["access_token"]

def headers(token):
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# BLOC 1 — Création d'offre
# ==============================================================================

class TestCreerOffre:

    def test_recruteur_peut_creer_offre(self, client):
        """Un recruteur peut créer une offre."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token))
        assert r.status_code == 201

    def test_offre_creee_contient_bon_titre(self, client):
        """L'offre créée doit avoir le bon titre."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token))
        assert r.json()["titre"] == "Ingénieur NLP"

    def test_offre_creee_contient_competences(self, client):
        """L'offre créée doit contenir les compétences."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token))
        assert "python" in r.json()["competences_requises"]

    def test_offre_active_par_defaut(self, client):
        """Une offre créée doit être active par défaut."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token))
        assert r.json()["is_active"] == True

    def test_candidat_ne_peut_pas_creer_offre(self, client):
        """Un candidat ne peut pas créer une offre — erreur 403."""
        token = obtenir_token(client, CANDIDAT)
        r = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token))
        assert r.status_code == 403

    def test_sans_token_erreur_401(self, client):
        """Sans token JWT, erreur 401."""
        r = client.post("/offers/", json=OFFRE_VALIDE)
        assert r.status_code == 401

    def test_poids_incorrects_erreur_422(self, client):
        """Des poids qui ne totalisent pas 1.0 doivent lever une erreur."""
        token = obtenir_token(client, RECRUTEUR)
        offre_invalide = {**OFFRE_VALIDE, "poids_competences": 0.50}
        r = client.post("/offers/", json=offre_invalide, headers=headers(token))
        assert r.status_code == 422


# ==============================================================================
# BLOC 2 — Listing des offres
# ==============================================================================

class TestListerOffres:

    def test_lister_offres_vide(self, client):
        """La liste d'offres est vide au départ."""
        token = obtenir_token(client, CANDIDAT)
        r = client.get("/offers/", headers=headers(token))
        assert r.status_code == 200
        assert r.json() == []

    def test_lister_offres_apres_creation(self, client):
        """La liste contient l'offre créée."""
        token_r = obtenir_token(client, RECRUTEUR)
        client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r))
        token_c = obtenir_token(client, CANDIDAT)
        r = client.get("/offers/", headers=headers(token_c))
        assert len(r.json()) == 1

    def test_candidat_peut_lister_offres(self, client):
        """Un candidat peut voir les offres disponibles."""
        token = obtenir_token(client, CANDIDAT)
        r = client.get("/offers/", headers=headers(token))
        assert r.status_code == 200

    def test_sans_token_erreur_401(self, client):
        """Sans token, erreur 401."""
        r = client.get("/offers/")
        assert r.status_code == 401


# ==============================================================================
# BLOC 3 — Détail d'une offre
# ==============================================================================

class TestObtenir0ffre:

    def test_obtenir_offre_existante(self, client):
        """Récupérer une offre par son ID."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.get(f"/offers/{offre['id']}", headers=headers(token))
        assert r.status_code == 200
        assert r.json()["id"] == offre["id"]

    def test_offre_inexistante_erreur_404(self, client):
        """Une offre inexistante retourne 404."""
        token = obtenir_token(client, CANDIDAT)
        r = client.get("/offers/9999", headers=headers(token))
        assert r.status_code == 404


# ==============================================================================
# BLOC 3bis — Modification d'une offre
# ==============================================================================

class TestModifierOffre:

    def test_proprietaire_peut_modifier(self, client):
        """Le recruteur propriétaire peut modifier son offre."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.put(f"/offers/{offre['id']}", json={"titre": "Ingénieur NLP Senior"}, headers=headers(token))
        assert r.status_code == 200
        assert r.json()["titre"] == "Ingénieur NLP Senior"

    def test_modification_partielle_garde_le_reste(self, client):
        """Modifier un seul champ ne doit pas effacer les autres."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.put(f"/offers/{offre['id']}", json={"experience_requise": 5}, headers=headers(token))
        assert r.json()["experience_requise"] == 5
        assert r.json()["titre"] == "Ingénieur NLP"  # inchangé

    def test_modification_competences(self, client):
        """Les compétences requises peuvent être remplacées."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.put(f"/offers/{offre['id']}", json={"competences_requises": ["java", "spring"]}, headers=headers(token))
        assert r.json()["competences_requises"] == ["java", "spring"]

    def test_candidat_ne_peut_pas_modifier(self, client):
        """Un candidat ne peut pas modifier une offre — erreur 403."""
        token_r = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r)).json()
        token_c = obtenir_token(client, CANDIDAT)
        r = client.put(f"/offers/{offre['id']}", json={"titre": "Piratage"}, headers=headers(token_c))
        assert r.status_code == 403

    def test_non_proprietaire_ne_peut_pas_modifier(self, client):
        """Un autre recruteur ne peut pas modifier une offre qui n'est pas la sienne."""
        token_r1 = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r1)).json()
        recruteur2 = {**RECRUTEUR, "email": "recruteur2.modif@test.cm"}
        token_r2 = obtenir_token(client, recruteur2)
        r = client.put(f"/offers/{offre['id']}", json={"titre": "Piratage"}, headers=headers(token_r2))
        assert r.status_code == 403

    def test_modification_offre_inexistante_erreur_404(self, client):
        """Modifier une offre inexistante retourne 404."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.put("/offers/9999", json={"titre": "Test"}, headers=headers(token))
        assert r.status_code == 404

    def test_poids_invalides_apres_modification_erreur_422(self, client):
        """Modifier un poids de façon à casser la somme = 1.0 doit être rejeté."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.put(f"/offers/{offre['id']}", json={"poids_competences": 0.9}, headers=headers(token))
        assert r.status_code == 422


# ==============================================================================
# BLOC 4 — Désactivation d'une offre
# ==============================================================================

class TestDesactiverOffre:

    def test_recruteur_peut_desactiver_son_offre(self, client):
        """Le recruteur propriétaire peut désactiver son offre."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.delete(f"/offers/{offre['id']}", headers=headers(token))
        assert r.status_code == 200

    def test_offre_desactivee_disparait_du_listing(self, client):
        """Une offre désactivée n'apparaît plus dans la liste."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        client.delete(f"/offers/{offre['id']}", headers=headers(token))
        r = client.get("/offers/", headers=headers(token))
        assert len(r.json()) == 0

    def test_candidat_ne_peut_pas_desactiver(self, client):
        """Un candidat ne peut pas désactiver une offre — erreur 403."""
        token_r = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r)).json()
        token_c = obtenir_token(client, CANDIDAT)
        r = client.delete(f"/offers/{offre['id']}", headers=headers(token_c))
        assert r.status_code == 403

    def test_desactiver_offre_inexistante_erreur_404(self, client):
        """Désactiver une offre inexistante retourne 404."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.delete("/offers/9999", headers=headers(token))
        assert r.status_code == 404


# ==============================================================================
# BLOC 5 — Classement des candidats
# ==============================================================================

class TestClassementCandidats:

    def test_recruteur_peut_voir_classement(self, client):
        """Le recruteur peut consulter le classement de son offre."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.get(f"/offers/{offre['id']}/ranking", headers=headers(token))
        assert r.status_code == 200

    def test_classement_vide_si_aucune_candidature(self, client):
        """Le classement est vide si personne n'a postulé."""
        token = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token)).json()
        r = client.get(f"/offers/{offre['id']}/ranking", headers=headers(token))
        assert r.json() == []

    def test_candidat_ne_peut_pas_voir_classement(self, client):
        """Un candidat ne peut pas voir le classement — erreur 403."""
        token_r = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r)).json()
        token_c = obtenir_token(client, CANDIDAT)
        r = client.get(f"/offers/{offre['id']}/ranking", headers=headers(token_c))
        assert r.status_code == 403

    def test_classement_offre_inexistante_erreur_404(self, client):
        """Le classement d'une offre inexistante retourne 404."""
        token = obtenir_token(client, RECRUTEUR)
        r = client.get("/offers/9999/ranking", headers=headers(token))
        assert r.status_code == 404

    def test_recruteur_ne_voit_pas_classement_autre_offre(self, client):
        """Un recruteur ne peut pas voir le classement d'une offre qui n'est pas la sienne."""
        # Recruteur 1 crée une offre
        token_r1 = obtenir_token(client, RECRUTEUR)
        offre = client.post("/offers/", json=OFFRE_VALIDE, headers=headers(token_r1)).json()
        # Recruteur 2 essaie de voir le classement
        recruteur2 = {**RECRUTEUR, "email": "recruteur2@test.cm"}
        token_r2 = obtenir_token(client, recruteur2)
        r = client.get(f"/offers/{offre['id']}/ranking", headers=headers(token_r2))
        assert r.status_code == 403
