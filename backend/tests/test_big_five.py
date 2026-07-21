"""
Membre 2
Tests unitaires pour le module Big Five (OCEAN).
Lance avec : pytest tests/test_big_five.py -v
"""
import pytest
from app.services.psych.big_five_service import (
    calculer_scores_ocean,
    obtenir_questions,
    ReponsesInvalidesError,
)
from app.services.psych.questions import QUESTIONS


def reponses_completes(valeur_par_defaut=3, **overrides):
    """
    Petit utilitaire de test : génère 25 réponses valides.
    Toutes à `valeur_par_defaut` par défaut, sauf celles précisées dans overrides.
    Ex: reponses_completes(q1=5, q2=1) → q1=5, q2=1, tout le reste=3.
    """
    reponses = {q["id"]: valeur_par_defaut for q in QUESTIONS}
    reponses.update(overrides)
    return reponses


# ─── Tests obtenir_questions() ────────────────────────────────────────────────

class TestObtenirQuestions:

    def test_retourne_25_questions(self):
        questions = obtenir_questions()
        assert len(questions) == 25

    def test_chaque_question_a_id_et_texte(self):
        questions = obtenir_questions()
        for q in questions:
            assert "id" in q
            assert "texte" in q
            assert isinstance(q["texte"], str) and len(q["texte"]) > 0

    def test_ne_divulgue_pas_dimension_ni_reverse(self):
        # Le frontend ne doit pas connaître la dimension/le sens de correction,
        # sinon un candidat malin pourrait "tricher" au test.
        questions = obtenir_questions()
        for q in questions:
            assert "dimension" not in q
            assert "reverse" not in q


# ─── Tests validation des réponses ────────────────────────────────────────────

class TestValidationReponses:

    def test_reponses_completes_valides_ne_leve_pas_erreur(self):
        reponses = reponses_completes()
        scores = calculer_scores_ocean(reponses)
        assert scores is not None

    def test_reponse_manquante_leve_erreur(self):
        reponses = reponses_completes()
        del reponses["q1"]
        with pytest.raises(ReponsesInvalidesError):
            calculer_scores_ocean(reponses)

    def test_question_inconnue_leve_erreur(self):
        reponses = reponses_completes()
        reponses["q999"] = 3
        with pytest.raises(ReponsesInvalidesError):
            calculer_scores_ocean(reponses)

    def test_valeur_hors_echelle_trop_haute_leve_erreur(self):
        reponses = reponses_completes(q1=6)
        with pytest.raises(ReponsesInvalidesError):
            calculer_scores_ocean(reponses)

    def test_valeur_hors_echelle_trop_basse_leve_erreur(self):
        reponses = reponses_completes(q1=0)
        with pytest.raises(ReponsesInvalidesError):
            calculer_scores_ocean(reponses)

    def test_valeur_non_entiere_leve_erreur(self):
        reponses = reponses_completes(q1=3.5)
        with pytest.raises(ReponsesInvalidesError):
            calculer_scores_ocean(reponses)


# ─── Tests calcul des scores ──────────────────────────────────────────────────

class TestCalculerScoresOcean:

    def test_retourne_les_5_dimensions(self):
        scores = calculer_scores_ocean(reponses_completes())
        assert set(scores.keys()) == {"O", "C", "E", "A", "N"}

    def test_scores_entre_0_et_1(self):
        scores = calculer_scores_ocean(reponses_completes())
        for dimension, valeur in scores.items():
            assert 0.0 <= valeur <= 1.0

    def test_toutes_reponses_moyennes_donne_scores_a_0_5(self):
        # Répondre "3" (neutre) partout doit donner un score moyen (0.5)
        # sur chaque dimension, peu importe les questions inversées.
        scores = calculer_scores_ocean(reponses_completes(valeur_par_defaut=3))
        for dimension, valeur in scores.items():
            assert valeur == pytest.approx(0.5, abs=0.01)

    def test_toutes_reponses_maximales_sur_questions_directes(self):
        # q1 (O, directe) à 5 doit tirer le score O vers le haut.
        scores_bas = calculer_scores_ocean(reponses_completes(valeur_par_defaut=3, q1=1))
        scores_haut = calculer_scores_ocean(reponses_completes(valeur_par_defaut=3, q1=5))
        assert scores_haut["O"] > scores_bas["O"]

    def test_question_inversee_est_bien_inversee(self):
        # q2 (O, inversée) : répondre 5 (très d'accord avec "je préfère garder
        # mes habitudes plutôt que d'essayer de nouvelles choses") doit FAIRE
        # BAISSER le score d'ouverture, pas l'augmenter.
        scores_accord_fort = calculer_scores_ocean(reponses_completes(valeur_par_defaut=3, q2=5))
        scores_accord_faible = calculer_scores_ocean(reponses_completes(valeur_par_defaut=3, q2=1))
        assert scores_accord_fort["O"] < scores_accord_faible["O"]

    def test_score_maximal_theorique(self):
        # Répondre de façon à maximiser O : 5 sur les questions directes,
        # 1 sur les questions inversées (car 1 inversé = 6-1 = 5).
        reponses = reponses_completes(valeur_par_defaut=3, q1=5, q2=1, q3=5, q4=1, q5=5)
        scores = calculer_scores_ocean(reponses)
        assert scores["O"] == pytest.approx(1.0, abs=0.001)

    def test_score_minimal_theorique(self):
        reponses = reponses_completes(valeur_par_defaut=3, q1=1, q2=5, q3=1, q4=5, q5=1)
        scores = calculer_scores_ocean(reponses)
        assert scores["O"] == pytest.approx(0.0, abs=0.001)


# ─── Tests des endpoints FastAPI ──────────────────────────────────────────────

@pytest.fixture
def candidat_token(client):
    """Inscrit un candidat, se connecte, retourne son token JWT."""
    client.post("/auth/register", json={
        "nom": "Kamga", "prenom": "Jean",
        "email": "candidat.bigfive@univ-dschang.cm",
        "password": "MotDePasse123", "role": "candidat"
    })
    login = client.post("/auth/login", data={
        "username": "candidat.bigfive@univ-dschang.cm",
        "password": "MotDePasse123"
    })
    return login.json()["access_token"]


@pytest.fixture
def recruteur_token(client):
    """Inscrit un recruteur, se connecte, retourne son token JWT."""
    client.post("/auth/register", json={
        "nom": "Fopa", "prenom": "Marie",
        "email": "recruteur.bigfive@entreprise.cm",
        "password": "MotDePasse456", "role": "recruteur"
    })
    login = client.post("/auth/login", data={
        "username": "recruteur.bigfive@entreprise.cm",
        "password": "MotDePasse456"
    })
    return login.json()["access_token"]


class TestEndpointGetQuestions:

    def test_sans_token_refuse(self, client):
        response = client.get("/personality-tests/questions")
        assert response.status_code == 401

    def test_avec_token_retourne_25_questions(self, client, candidat_token):
        response = client.get(
            "/personality-tests/questions",
            headers={"Authorization": f"Bearer {candidat_token}"}
        )
        assert response.status_code == 200
        assert len(response.json()["questions"]) == 25


class TestEndpointSoumettreTest:

    def test_candidat_peut_soumettre(self, client, candidat_token):
        response = client.post(
            "/personality-tests",
            json={"reponses": reponses_completes()},
            headers={"Authorization": f"Bearer {candidat_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "score_O" in data and "score_N" in data
        assert 0.0 <= data["score_O"] <= 1.0

    def test_recruteur_ne_peut_pas_soumettre(self, client, recruteur_token):
        response = client.post(
            "/personality-tests",
            json={"reponses": reponses_completes()},
            headers={"Authorization": f"Bearer {recruteur_token}"}
        )
        assert response.status_code == 403

    def test_double_soumission_refusee(self, client, candidat_token):
        headers = {"Authorization": f"Bearer {candidat_token}"}
        client.post("/personality-tests", json={"reponses": reponses_completes()}, headers=headers)
        response = client.post("/personality-tests", json={"reponses": reponses_completes()}, headers=headers)
        assert response.status_code == 400

    def test_reponses_incompletes_rejetees(self, client, candidat_token):
        reponses = reponses_completes()
        del reponses["q1"]
        response = client.post(
            "/personality-tests",
            json={"reponses": reponses},
            headers={"Authorization": f"Bearer {candidat_token}"}
        )
        assert response.status_code == 422

    def test_sans_token_refuse(self, client):
        response = client.post("/personality-tests", json={"reponses": reponses_completes()})
        assert response.status_code == 401
