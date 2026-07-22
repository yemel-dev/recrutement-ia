"""
Tests unitaires pour applications.py (upload CV + pipeline NLP + scoring).
Lance avec : pytest tests/test_applications.py -v

Note importante : ces tests MOCKENT analyser_cv() (le vrai pipeline NLP du
Membre 2). Pourquoi ? Parce que ce fichier teste la LOGIQUE DU ROUTEUR
(droits d'accès, doublons, déclenchement du scoring) — pas le pipeline NLP
lui-même (qui a son propre besoin : un vrai fichier PDF/DOCX, le modèle
spaCy fr_core_news_lg chargé, et le modèle Sentence-BERT téléchargé depuis
Hugging Face). Mocker évite de dépendre du réseau / d'un gros modèle à
chaque lancement de tests, et rend les tests rapides et déterministes.
"""
import io
import pytest
from unittest.mock import patch
from tests.conftest import creer_utilisateur_via_admin


OFFRE_VALIDE = {
    "titre": "Développeur Python",
    "description": "Poste de développeur backend",
    "competences_requises": ["python", "sql", "docker"],
    "experience_requise": 2,
    "ocean_O": 0.6, "ocean_C": 0.7, "ocean_E": 0.5, "ocean_A": 0.6, "ocean_N": 0.3,
    "poids_competences": 0.40, "poids_experience": 0.25,
    "poids_formation": 0.20, "poids_personnalite": 0.15,
}

# Contenu bidon — peu importe, puisque analyser_cv() est mocké dans ces tests
# (voir la fixture mock_analyser_cv ci-dessous)
CONTENU_CV = b"contenu binaire simule d'un CV"


def resultat_nlp_simule(**overrides):
    """Résultat que renverrait analyser_cv() du Membre 2, au format réel
    (voir nlp_pipeline.py) — utilisé pour mocker le pipeline dans les tests."""
    resultat = {
        "competences_extraites": ["python", "sql", "docker"],
        "experience_annees": 5.0,
        "formation_niveau": "master",
        "entites_nommees": {"organisations": [], "dates": [], "lieux": [], "personnes": []},
        "score_competences": 0.9,
        "formation_score": 0.85,
        "competences_communes": ["python", "sql", "docker"],
        "taux_couverture": 1.0,
        "texte_extrait": "texte simulé",
        "duree_analyse_secondes": 0.1,
    }
    resultat.update(overrides)
    return resultat


@pytest.fixture(autouse=True)
def mock_analyser_cv():
    """Remplace le vrai pipeline NLP par une version instantanée et prévisible
    pour tous les tests de ce fichier (voir note en haut du fichier)."""
    with patch("app.routers.applications.analyser_cv", return_value=resultat_nlp_simule()) as mock:
        yield mock


def entetes(token):
    return {"Authorization": f"Bearer {token}"}


def reponses_completes(valeur=3):
    return {f"q{i}": valeur for i in range(1, 26)}


@pytest.fixture
def recruteur_token(client):
    # POST /auth/register force toujours le rôle "candidat" (voir routers/auth.py) :
    # un compte recruteur ne peut être créé que via /admin/users, avec le
    # compte admin par défaut créé au démarrage de l'app.
    return creer_utilisateur_via_admin(client, {
        "nom": "Fopa", "prenom": "Marie",
        "email": "recruteur.apps@entreprise.cm",
        "password": "MotDePasse456", "role": "recruteur"
    })


@pytest.fixture
def candidat_token(client):
    client.post("/auth/register", json={
        "nom": "Kamga", "prenom": "Jean",
        "email": "candidat.apps@univ-dschang.cm",
        "password": "MotDePasse123", "role": "candidat"
    })
    login = client.post("/auth/login", data={
        "username": "candidat.apps@univ-dschang.cm", "password": "MotDePasse123"
    })
    return login.json()["access_token"]


@pytest.fixture
def autre_candidat_token(client):
    client.post("/auth/register", json={
        "nom": "Ngassa", "prenom": "Paul",
        "email": "autre.candidat.apps@univ-dschang.cm",
        "password": "MotDePasse789", "role": "candidat"
    })
    login = client.post("/auth/login", data={
        "username": "autre.candidat.apps@univ-dschang.cm", "password": "MotDePasse789"
    })
    return login.json()["access_token"]


@pytest.fixture
def offre_id(client, recruteur_token):
    r = client.post("/offers", json=OFFRE_VALIDE, headers=entetes(recruteur_token))
    return r.json()["id"] if r.status_code == 201 else None


def fichier_cv(nom="cv.pdf"):
    return {"file": (nom, io.BytesIO(CONTENU_CV), "application/pdf")}


# ─── POST /applications ───────────────────────────────────────────────────────

class TestPostuler:

    def test_candidat_peut_postuler(self, client, candidat_token, offre_id):
        r = client.post(
            "/applications",
            data={"offre_id": offre_id},
            files=fichier_cv(),
            headers=entetes(candidat_token),
        )
        assert r.status_code == 201
        assert r.json()["statut"] == "en_attente"  # score pas encore calculé (pas de test Big Five)

    def test_recruteur_ne_peut_pas_postuler(self, client, recruteur_token, offre_id):
        r = client.post(
            "/applications",
            data={"offre_id": offre_id},
            files=fichier_cv(),
            headers=entetes(recruteur_token),
        )
        assert r.status_code == 403

    def test_offre_inexistante_404(self, client, candidat_token):
        r = client.post(
            "/applications",
            data={"offre_id": 9999},
            files=fichier_cv(),
            headers=entetes(candidat_token),
        )
        assert r.status_code == 404

    def test_double_candidature_refusee(self, client, candidat_token, offre_id):
        client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token))
        r = client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token))
        assert r.status_code == 400

    def test_extension_non_supportee_rejetee(self, client, candidat_token, offre_id):
        r = client.post(
            "/applications",
            data={"offre_id": offre_id},
            files={"file": ("cv.txt", io.BytesIO(CONTENU_CV), "text/plain")},
            headers=entetes(candidat_token),
        )
        assert r.status_code == 422

    def test_sans_token_refuse(self, client, offre_id):
        r = client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv())
        assert r.status_code == 401


# ─── Intégration scoring : NLP + Big Five → score calculé ────────────────────

class TestIntegrationScoring:

    def test_score_calcule_si_big_five_deja_passe(self, client, candidat_token, offre_id):
        # Le candidat passe d'abord le test Big Five...
        client.post("/personality-tests", json={"reponses": reponses_completes()}, headers=entetes(candidat_token))

        # ...puis postule. POST /applications répond TOUJOURS immédiatement avec
        # statut="en_attente" (voir la docstring de postuler() dans applications.py) :
        # l'analyse NLP + le scoring tournent en tâche de fond, même si les deux
        # conditions (NLP + Big Five) sont déjà réunies au moment de la requête.
        r = client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token))
        assert r.status_code == 201
        candidature = r.json()
        assert candidature["statut"] == "en_attente"

        # Le score doit donc être vérifié après coup, une fois la tâche de fond terminée.
        r = client.get(f"/applications/{candidature['id']}", headers=entetes(candidat_token))
        data = r.json()
        assert data["statut"] == "analyse"
        assert data["score_global"] is not None
        assert 0.0 <= data["score_global"] <= 1.0

    def test_score_calcule_apres_coup_quand_big_five_soumis_ensuite(self, client, candidat_token, offre_id):
        # Le candidat postule d'abord (sans avoir passé le test)...
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        assert candidature["score_global"] is None

        # ...puis passe le test Big Five ensuite : le score doit être calculé rétroactivement
        client.post("/personality-tests", json={"reponses": reponses_completes()}, headers=entetes(candidat_token))

        r = client.get(f"/applications/{candidature['id']}", headers=entetes(candidat_token))
        assert r.json()["score_global"] is not None
        assert r.json()["statut"] == "analyse"

    def test_classement_mis_a_jour_apres_scoring(self, client, candidat_token, offre_id, recruteur_token):
        client.post("/personality-tests", json={"reponses": reponses_completes()}, headers=entetes(candidat_token))
        client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token))

        r = client.get(f"/offers/{offre_id}/ranking", headers=entetes(recruteur_token))
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["position"] == 1


# ─── GET /applications/me ─────────────────────────────────────────────────────

class TestMesCandidatures:

    def test_candidat_voit_ses_candidatures(self, client, candidat_token, offre_id):
        client.post("/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token))
        r = client.get("/applications/me", headers=entetes(candidat_token))
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_recruteur_ne_peut_pas_utiliser_cet_endpoint(self, client, recruteur_token):
        r = client.get("/applications/me", headers=entetes(recruteur_token))
        assert r.status_code == 403


# ─── GET /applications/{id} ───────────────────────────────────────────────────

class TestObtenirCandidature:

    def test_candidat_proprietaire_peut_voir(self, client, candidat_token, offre_id):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}", headers=entetes(candidat_token))
        assert r.status_code == 200

    def test_recruteur_de_loffre_peut_voir(self, client, candidat_token, offre_id, recruteur_token):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}", headers=entetes(recruteur_token))
        assert r.status_code == 200

    def test_autre_candidat_ne_peut_pas_voir(self, client, candidat_token, offre_id, autre_candidat_token):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}", headers=entetes(autre_candidat_token))
        assert r.status_code == 403

    def test_candidature_inexistante_404(self, client, candidat_token):
        r = client.get("/applications/9999", headers=entetes(candidat_token))
        assert r.status_code == 404


# ─── GET /applications/{id}/cv ────────────────────────────────────────────────

class TestTelechargerCv:

    def test_candidat_proprietaire_peut_telecharger(self, client, candidat_token, offre_id):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}/cv", headers=entetes(candidat_token))
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_recruteur_de_loffre_peut_telecharger(self, client, candidat_token, offre_id, recruteur_token):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}/cv", headers=entetes(recruteur_token))
        assert r.status_code == 200

    def test_autre_candidat_ne_peut_pas_telecharger(self, client, candidat_token, offre_id, autre_candidat_token):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}/cv", headers=entetes(autre_candidat_token))
        assert r.status_code == 403

    def test_sans_token_refuse(self, client, offre_id, candidat_token):
        candidature = client.post(
            "/applications", data={"offre_id": offre_id}, files=fichier_cv(), headers=entetes(candidat_token)
        ).json()
        r = client.get(f"/applications/{candidature['id']}/cv")
        assert r.status_code == 401

    def test_candidature_inexistante_404(self, client, candidat_token):
        r = client.get("/applications/9999/cv", headers=entetes(candidat_token))
        assert r.status_code == 404