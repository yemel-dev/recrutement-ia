"""
test_skills_extractor.py
-------------------------
Tests unitaires pour le module skills_extractor.py
Membre 2 - NLP/IA | Université de Dschang 2024-2025

Comment lancer ces tests :
    cd backend
    pytest tests/test_skills_extractor.py -v

Note : le premier lancement peut prendre 1-2 minutes car Sentence-BERT
       télécharge le modèle paraphrase-multilingual-MiniLM-L12-v2 (~120 Mo).
       Les lancements suivants sont rapides (modèle mis en cache).
"""

import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.services.nlp.skills_extractor import (
    extraire_et_scorer_competences,
    _extraire_competences_sbert,
    _calculer_score_tfidf,
)

# ──────────────────────────────────────────────────────────────────────────────
# Données de test réutilisables
# ──────────────────────────────────────────────────────────────────────────────

# Tokens d'un CV d'ingénieur IA
TOKENS_CV_IA = [
    "python", "tensorflow", "machine", "learning", "docker",
    "sql", "numpy", "pandas", "git", "linux"
]

# Tokens d'un CV développeur web
TOKENS_CV_WEB = [
    "javascript", "react", "node", "html", "css",
    "git", "docker", "sql", "rest", "api"
]

# Compétences requises par une offre IA
OFFRE_IA = ["python", "machine learning", "tensorflow", "docker", "sql"]

# Compétences requises par une offre web
OFFRE_WEB = ["javascript", "react", "node.js", "html", "css"]

# Tokens vides
TOKENS_VIDES = []


# ==============================================================================
# BLOC 1 — Tests extraction compétences Sentence-BERT
# ==============================================================================

class TestExtractionCompetencesSbert:
    """Tests pour la fonction _extraire_competences_sbert()"""

    def test_retourne_une_liste(self):
        """La fonction doit retourner une liste."""
        resultat = _extraire_competences_sbert(TOKENS_CV_IA)
        assert isinstance(resultat, list)

    def test_tokens_vides_retourne_liste_vide(self):
        """Des tokens vides doivent retourner une liste vide."""
        resultat = _extraire_competences_sbert(TOKENS_VIDES)
        assert resultat == []

    def test_detecte_python(self):
        """'python' doit être détecté comme compétence."""
        resultat = _extraire_competences_sbert(["python", "bonjour", "monde"])
        assert "python" in resultat

    def test_detecte_tensorflow(self):
        """'tensorflow' doit être détecté comme compétence."""
        resultat = _extraire_competences_sbert(["tensorflow", "keras"])
        assert "tensorflow" in resultat

    def test_pas_de_doublons(self):
        """La liste retournée ne doit pas contenir de doublons."""
        tokens = ["python", "python", "python", "java"]
        resultat = _extraire_competences_sbert(tokens)
        assert len(resultat) == len(set(resultat))

    def test_retourne_des_chaines(self):
        """Chaque élément de la liste doit être une chaîne str."""
        resultat = _extraire_competences_sbert(TOKENS_CV_IA)
        for item in resultat:
            assert isinstance(item, str)

    def test_seuil_eleve_retourne_moins_de_competences(self):
        """Un seuil plus élevé doit retourner moins de compétences."""
        resultat_bas   = _extraire_competences_sbert(TOKENS_CV_IA, seuil_similarite=0.3)
        resultat_haut  = _extraire_competences_sbert(TOKENS_CV_IA, seuil_similarite=0.9)
        assert len(resultat_bas) >= len(resultat_haut)


# ==============================================================================
# BLOC 2 — Tests calcul score TF-IDF
# ==============================================================================

class TestCalculerScoreTfidf:
    """Tests pour la fonction _calculer_score_tfidf()"""

    def test_retourne_un_float(self):
        """La fonction doit retourner un float."""
        resultat = _calculer_score_tfidf(OFFRE_IA, OFFRE_IA)
        assert isinstance(resultat, float)

    def test_score_entre_0_et_1(self):
        """Le score doit être entre 0.0 et 1.0."""
        resultat = _calculer_score_tfidf(TOKENS_CV_IA, OFFRE_IA)
        assert 0.0 <= resultat <= 1.0

    def test_score_identique_vaut_1(self):
        """Des compétences identiques doivent donner un score de 1.0."""
        competences = ["python", "machine learning", "docker"]
        resultat = _calculer_score_tfidf(competences, competences)
        assert resultat == pytest.approx(1.0, abs=0.01)

    def test_score_sans_commun_vaut_0(self):
        """Des compétences sans point commun doivent donner 0.0."""
        cv    = ["python", "tensorflow"]
        offre = ["javascript", "react"]
        resultat = _calculer_score_tfidf(cv, offre)
        assert resultat == pytest.approx(0.0, abs=0.01)

    def test_cv_vide_retourne_0(self):
        """Un CV sans compétences doit retourner 0.0."""
        resultat = _calculer_score_tfidf([], OFFRE_IA)
        assert resultat == 0.0

    def test_offre_vide_retourne_0(self):
        """Une offre sans compétences doit retourner 0.0."""
        resultat = _calculer_score_tfidf(TOKENS_CV_IA, [])
        assert resultat == 0.0

    def test_score_partiel_entre_0_et_1(self):
        """Des compétences partiellement communes → score entre 0 et 1."""
        cv    = ["python", "docker", "javascript"]
        offre = ["python", "tensorflow", "docker"]
        resultat = _calculer_score_tfidf(cv, offre)
        assert 0.0 < resultat < 1.0


# ==============================================================================
# BLOC 3 — Tests de la fonction principale extraire_et_scorer_competences()
# ==============================================================================

class TestExtraireEtScorerCompetences:
    """Tests pour la fonction publique principale"""

    def test_retourne_un_dictionnaire(self):
        """La fonction doit retourner un dictionnaire."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert isinstance(resultat, dict)

    def test_dictionnaire_contient_toutes_les_cles(self):
        """Le dictionnaire doit contenir les 4 clés attendues."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert "competences_extraites" in resultat
        assert "score_competences"     in resultat
        assert "competences_communes"  in resultat
        assert "taux_couverture"       in resultat

    def test_competences_extraites_est_liste(self):
        """'competences_extraites' doit être une liste."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert isinstance(resultat["competences_extraites"], list)

    def test_score_competences_est_float(self):
        """'score_competences' doit être un float."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert isinstance(resultat["score_competences"], float)

    def test_score_competences_entre_0_et_1(self):
        """'score_competences' doit être entre 0.0 et 1.0."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert 0.0 <= resultat["score_competences"] <= 1.0

    def test_taux_couverture_entre_0_et_1(self):
        """'taux_couverture' doit être entre 0.0 et 1.0."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        assert 0.0 <= resultat["taux_couverture"] <= 1.0

    def test_tokens_none_leve_erreur(self):
        """None doit lever ValueError."""
        with pytest.raises(ValueError):
            extraire_et_scorer_competences(None, OFFRE_IA)

    def test_tokens_vides_retourne_score_zero(self):
        """Des tokens vides doivent retourner score 0.0."""
        resultat = extraire_et_scorer_competences(TOKENS_VIDES, OFFRE_IA)
        assert resultat["score_competences"] == 0.0

    def test_cv_ia_vs_offre_ia_score_eleve(self):
        """Un CV IA face à une offre IA doit avoir un bon score."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        # Le score doit être positif (CV et offre partagent des compétences)
        assert resultat["score_competences"] > 0.0

    def test_cv_web_vs_offre_ia_score_faible(self):
        """Un CV web face à une offre IA doit avoir un score plus faible."""
        score_ia  = extraire_et_scorer_competences(TOKENS_CV_IA,  OFFRE_IA)
        score_web = extraire_et_scorer_competences(TOKENS_CV_WEB, OFFRE_IA)
        # Le CV IA doit mieux correspondre à l'offre IA que le CV web
        assert score_ia["score_competences"] >= score_web["score_competences"]

    def test_competences_communes_sous_ensemble(self):
        """Les compétences communes doivent être dans le CV ET dans l'offre."""
        resultat = extraire_et_scorer_competences(TOKENS_CV_IA, OFFRE_IA)
        for competence in resultat["competences_communes"]:
            assert competence in resultat["competences_extraites"]
            assert competence in OFFRE_IA
