"""
test_preprocessor.py
---------------------
Tests unitaires pour le module preprocessor.py
Membre 2 - NLP/IA | Université de Dschang 2024-2025

Comment lancer ces tests :
    cd backend
    pytest tests/test_preprocessor.py -v
"""

import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.services.nlp.preprocessor import (
    preprocesser_texte,
    _nettoyer_texte,
    _lemmatiser_et_filtrer,
)

# ──────────────────────────────────────────────────────────────────────────────
# Textes de test réutilisables
# ──────────────────────────────────────────────────────────────────────────────

TEXTE_CV_SIMPLE = """
Jean Dupont - Ingénieur en Intelligence Artificielle
Email: jean.dupont@email.com | www.jeandupont.com
Expérience: 3 ans en Machine Learning et NLP
Compétences: Python, TensorFlow, spaCy, scikit-learn
Formation: Master Intelligence Artificielle - Université de Dschang 2024
"""

TEXTE_CV_MAJUSCULES = "MARIE CURIE - DATA SCIENTIST - PYTHON - TENSORFLOW"

TEXTE_AVEC_PONCTUATION = "Compétences: Python, Java, C++, SQL... et bien d'autres!"


# ==============================================================================
# BLOC 1 — Tests nettoyage texte
# ==============================================================================

class TestNettoyerTexte:
    """Tests pour la fonction _nettoyer_texte()"""

    def test_retourne_minuscules(self):
        """Le texte nettoyé doit être entièrement en minuscules."""
        resultat = _nettoyer_texte("JEAN DUPONT Ingénieur")
        assert resultat == resultat.lower()

    def test_supprime_email(self):
        """Les adresses email doivent être supprimées."""
        resultat = _nettoyer_texte("Contact: jean@test.com pour info")
        assert "@" not in resultat
        assert "jean" not in resultat or "test" not in resultat

    def test_supprime_url(self):
        """Les URLs doivent être supprimées."""
        resultat = _nettoyer_texte("Site: www.monsite.com et http://autre.fr")
        assert "www" not in resultat
        assert "http" not in resultat

    def test_supprime_ponctuation(self):
        """Les signes de ponctuation doivent être supprimés."""
        resultat = _nettoyer_texte("Python, Java, C++!")
        assert "," not in resultat
        assert "!" not in resultat

    def test_supprime_espaces_multiples(self):
        """Les espaces multiples doivent être réduits à un seul."""
        resultat = _nettoyer_texte("Jean    Dupont     Ingénieur")
        assert "  " not in resultat

    def test_texte_vide_retourne_chaine_vide(self):
        """Un texte vide doit retourner une chaîne vide."""
        assert _nettoyer_texte("") == ""
        assert _nettoyer_texte("   ") == ""

    def test_conserve_lettres_accentuees(self):
        """Les lettres accentuées (é, è, ç) doivent être conservées."""
        resultat = _nettoyer_texte("Ingénieur en Intelligence Artificielle")
        assert "é" in resultat
        assert "intelligence" in resultat

    def test_retourne_une_chaine(self):
        """La fonction doit toujours retourner une chaîne str."""
        resultat = _nettoyer_texte(TEXTE_CV_SIMPLE)
        assert isinstance(resultat, str)


# ==============================================================================
# BLOC 2 — Tests lemmatisation et filtrage
# ==============================================================================

class TestLemmatiserEtFiltrer:
    """Tests pour la fonction _lemmatiser_et_filtrer()"""

    def test_retourne_une_liste(self):
        """La fonction doit retourner une liste."""
        resultat = _lemmatiser_et_filtrer("ingénieur intelligence artificielle")
        assert isinstance(resultat, list)

    def test_liste_non_vide(self):
        """La liste ne doit pas être vide pour un texte avec du contenu."""
        resultat = _lemmatiser_et_filtrer("ingénieur intelligence artificielle python")
        assert len(resultat) > 0

    def test_texte_vide_retourne_liste_vide(self):
        """Un texte vide doit retourner une liste vide."""
        resultat = _lemmatiser_et_filtrer("")
        assert resultat == []

    def test_stopwords_supprimes(self):
        """Les stopwords français doivent être supprimés."""
        # "le", "de", "et", "en" sont des stopwords français
        resultat = _lemmatiser_et_filtrer("le ingénieur de intelligence en artificielle")
        stopwords_fr = {"le", "de", "et", "en", "un", "une", "du", "des"}
        for token in resultat:
            assert token not in stopwords_fr

    def test_tokens_suffisamment_longs(self):
        """Aucun token d'un seul caractère ne doit apparaître."""
        resultat = _lemmatiser_et_filtrer("a b c ingénieur python")
        for token in resultat:
            assert len(token) > 1

    def test_retourne_des_chaines(self):
        """Chaque élément de la liste doit être une chaîne str."""
        resultat = _lemmatiser_et_filtrer("ingénieur python machine learning")
        for token in resultat:
            assert isinstance(token, str)


# ==============================================================================
# BLOC 3 — Tests de la fonction principale preprocesser_texte()
# ==============================================================================

class TestPreprocesserTexte:
    """Tests pour la fonction publique principale preprocesser_texte()"""

    def test_retourne_un_dictionnaire(self):
        """La fonction doit retourner un dictionnaire."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert isinstance(resultat, dict)

    def test_dictionnaire_contient_texte_nettoye(self):
        """Le dictionnaire doit contenir la clé 'texte_nettoye'."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert "texte_nettoye" in resultat

    def test_dictionnaire_contient_tokens(self):
        """Le dictionnaire doit contenir la clé 'tokens'."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert "tokens" in resultat

    def test_texte_nettoye_est_chaine(self):
        """La valeur de 'texte_nettoye' doit être une chaîne str."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert isinstance(resultat["texte_nettoye"], str)

    def test_tokens_est_liste(self):
        """La valeur de 'tokens' doit être une liste."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert isinstance(resultat["tokens"], list)

    def test_tokens_non_vide_pour_cv_reel(self):
        """Un vrai texte de CV doit produire des tokens."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert len(resultat["tokens"]) > 0

    def test_texte_vide_leve_erreur(self):
        """Un texte vide doit lever ValueError."""
        with pytest.raises(ValueError):
            preprocesser_texte("")

    def test_texte_none_leve_erreur(self):
        """Un texte None doit lever ValueError."""
        with pytest.raises(ValueError):
            preprocesser_texte(None)

    def test_texte_espaces_seulement_leve_erreur(self):
        """Un texte avec uniquement des espaces doit lever ValueError."""
        with pytest.raises(ValueError):
            preprocesser_texte("     ")

    def test_texte_nettoye_en_minuscules(self):
        """Le texte nettoyé doit être en minuscules."""
        resultat = preprocesser_texte(TEXTE_CV_MAJUSCULES)
        assert resultat["texte_nettoye"] == resultat["texte_nettoye"].lower()

    def test_python_present_dans_tokens(self):
        """'python' doit apparaître dans les tokens du CV de test."""
        resultat = preprocesser_texte(TEXTE_CV_SIMPLE)
        assert "python" in resultat["tokens"]
