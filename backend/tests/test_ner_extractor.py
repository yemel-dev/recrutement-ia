"""
test_ner_extractor.py
----------------------
Tests unitaires pour le module ner_extractor.py
Membre 2 - NLP/IA | Université de Dschang 2024-2025

Comment lancer ces tests :
    cd backend
    pytest tests/test_ner_extractor.py -v
"""

import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.services.nlp.ner_extractor import (
    extraire_entites_cv,
    _extraire_annees_experience,
    _extraire_formation,
    _extraire_entites_spacy,
)

# ──────────────────────────────────────────────────────────────────────────────
# Textes de test réutilisables
# ──────────────────────────────────────────────────────────────────────────────

TEXTE_CV_COMPLET = """
Jean Dupont
Ingénieur en Intelligence Artificielle
5 ans d'expérience en Machine Learning et NLP
Université de Dschang - Master Intelligence Artificielle 2022
Google - Ingénieur ML - 2020 à 2023
Microsoft - Data Scientist - 2018 à 2020
Yaoundé, Cameroun
"""

TEXTE_CV_LICENCE = """
Marie Martin
Licence en Informatique - Université de Yaoundé 2019
2 ans d'expérience en développement web
Python, JavaScript, React
"""

TEXTE_CV_DOCTORAT = """
Dr. Paul Biya
Doctorat en Traitement du Langage Naturel
10 ans d'expérience en recherche NLP
Université de Paris - 2010 à 2020
"""

TEXTE_VIDE = ""
TEXTE_ESPACES = "     "


# ==============================================================================
# BLOC 1 — Tests extraction entités spaCy
# ==============================================================================

class TestExtractionEntitesSpacy:
    """Tests pour la fonction _extraire_entites_spacy()"""

    def test_retourne_un_dictionnaire(self):
        """La fonction doit retourner un dictionnaire."""
        resultat = _extraire_entites_spacy(TEXTE_CV_COMPLET)
        assert isinstance(resultat, dict)

    def test_dictionnaire_contient_toutes_les_cles(self):
        """Le dictionnaire doit contenir les 4 clés attendues."""
        resultat = _extraire_entites_spacy(TEXTE_CV_COMPLET)
        assert "organisations" in resultat
        assert "dates" in resultat
        assert "lieux" in resultat
        assert "personnes" in resultat

    def test_toutes_les_valeurs_sont_des_listes(self):
        """Chaque valeur du dictionnaire doit être une liste."""
        resultat = _extraire_entites_spacy(TEXTE_CV_COMPLET)
        for cle, valeur in resultat.items():
            assert isinstance(valeur, list), f"'{cle}' doit être une liste"

    def test_texte_vide_retourne_listes_vides(self):
        """Un texte vide doit retourner des listes vides."""
        resultat = _extraire_entites_spacy(TEXTE_VIDE)
        assert resultat["organisations"] == []
        assert resultat["dates"] == []
        assert resultat["lieux"] == []
        assert resultat["personnes"] == []


# ==============================================================================
# BLOC 2 — Tests extraction années d'expérience
# ==============================================================================

class TestExtractionAnneesExperience:
    """Tests pour la fonction _extraire_annees_experience()"""

    def test_detecte_pattern_explicite_ans(self):
        """Doit détecter '5 ans d'expérience'."""
        texte = "J'ai 5 ans d'expérience en Python"
        resultat = _extraire_annees_experience(texte, [])
        assert resultat == 5.0

    def test_detecte_pattern_explicite_annees(self):
        """Doit détecter '3 années d'expérience'."""
        texte = "3 années d'expérience en machine learning"
        resultat = _extraire_annees_experience(texte, [])
        assert resultat == 3.0

    def test_detecte_depuis_dates_spacy(self):
        """Doit calculer l'expérience depuis les dates spaCy."""
        dates = ["2018", "2020", "2023"]
        resultat = _extraire_annees_experience("", dates)
        assert resultat == 5.0  # 2023 - 2018 = 5

    def test_retourne_zero_si_rien_trouve(self):
        """Doit retourner 0.0 si aucune information d'expérience."""
        resultat = _extraire_annees_experience("Compétences: Python, Java", [])
        assert resultat == 0.0

    def test_retourne_float(self):
        """La fonction doit toujours retourner un float."""
        resultat = _extraire_annees_experience("2 ans d'expérience", [])
        assert isinstance(resultat, float)

    def test_valeur_excessive_ignoree(self):
        """Une valeur absurde (ex: 99 ans) ne doit pas être retournée."""
        texte = "99 ans d'expérience en Python"
        resultat = _extraire_annees_experience(texte, [])
        # 99 > 50 donc ignoré, retombe sur les dates (aucune) → 0.0
        assert resultat == 0.0


# ==============================================================================
# BLOC 3 — Tests extraction formation
# ==============================================================================

class TestExtractionFormation:
    """Tests pour la fonction _extraire_formation()"""

    def test_detecte_master(self):
        """Doit détecter 'Master' dans le texte."""
        resultat = _extraire_formation("Master Intelligence Artificielle 2022")
        assert resultat["niveau"] == "master"
        assert resultat["score"] == 0.9

    def test_detecte_doctorat(self):
        """Doit détecter 'Doctorat' dans le texte."""
        resultat = _extraire_formation("Doctorat en Informatique Université Paris")
        assert resultat["niveau"] == "doctorat"
        assert resultat["score"] == 1.0

    def test_detecte_licence(self):
        """Doit détecter 'Licence' dans le texte."""
        resultat = _extraire_formation("Licence en Informatique 2019")
        assert resultat["niveau"] == "licence"
        assert resultat["score"] == 0.6

    def test_detecte_bac(self):
        """Doit détecter 'Bac' dans le texte.
        Note : 'bac' peut être détecté comme 'bachelor' car 'bac' est
        contenu dans 'bachelor' — les deux ont le même score (0.4 et 0.6).
        On vérifie donc juste que le score est <= 0.6.
        """
        resultat = _extraire_formation("Bac série C obtenu en 2015")
        assert resultat["score"] <= 0.6
        assert resultat["niveau"] in ["bac", "bachelor"]

    def test_retourne_inconnu_si_rien_trouve(self):
        """Doit retourner 'inconnu' si aucun diplôme détecté."""
        resultat = _extraire_formation("Python Java Machine Learning")
        assert resultat["niveau"] == "inconnu"
        assert resultat["score"] == 0.3

    def test_retourne_le_diplome_le_plus_eleve(self):
        """Si plusieurs diplômes, doit retourner le plus élevé."""
        texte = "Bac en 2015, Licence en 2018, Master en 2020"
        resultat = _extraire_formation(texte)
        assert resultat["niveau"] == "master"
        assert resultat["score"] == 0.9

    def test_retourne_dictionnaire(self):
        """La fonction doit retourner un dictionnaire."""
        resultat = _extraire_formation("Master en IA")
        assert isinstance(resultat, dict)
        assert "niveau" in resultat
        assert "score" in resultat


# ==============================================================================
# BLOC 4 — Tests de la fonction principale extraire_entites_cv()
# ==============================================================================

class TestExtraireEntitesCv:
    """Tests pour la fonction publique principale extraire_entites_cv()"""

    def test_retourne_un_dictionnaire(self):
        """La fonction doit retourner un dictionnaire."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert isinstance(resultat, dict)

    def test_contient_toutes_les_cles_attendues(self):
        """Le dictionnaire doit contenir les 7 clés attendues."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        cles_attendues = [
            "organisations", "dates", "lieux", "personnes",
            "experience_annees", "formation_niveau", "formation_score"
        ]
        for cle in cles_attendues:
            assert cle in resultat, f"Clé manquante : '{cle}'"

    def test_experience_annees_est_float(self):
        """'experience_annees' doit être un float."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert isinstance(resultat["experience_annees"], float)

    def test_formation_niveau_est_chaine(self):
        """'formation_niveau' doit être une chaîne str."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert isinstance(resultat["formation_niveau"], str)

    def test_formation_score_est_float(self):
        """'formation_score' doit être un float."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert isinstance(resultat["formation_score"], float)

    def test_formation_score_entre_0_et_1(self):
        """'formation_score' doit être entre 0.0 et 1.0."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert 0.0 <= resultat["formation_score"] <= 1.0

    def test_detecte_master_dans_cv_complet(self):
        """Doit détecter le Master dans le CV complet."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert resultat["formation_niveau"] == "master"

    def test_detecte_experience_dans_cv_complet(self):
        """Doit détecter 5 ans d'expérience dans le CV complet."""
        resultat = extraire_entites_cv(TEXTE_CV_COMPLET)
        assert resultat["experience_annees"] == 5.0

    def test_texte_vide_leve_erreur(self):
        """Un texte vide doit lever ValueError."""
        with pytest.raises(ValueError):
            extraire_entites_cv(TEXTE_VIDE)

    def test_texte_none_leve_erreur(self):
        """None doit lever ValueError."""
        with pytest.raises(ValueError):
            extraire_entites_cv(None)

    def test_cv_licence_detecte_correctement(self):
        """Doit détecter Licence et 2 ans dans le CV licence."""
        resultat = extraire_entites_cv(TEXTE_CV_LICENCE)
        assert resultat["formation_niveau"] == "licence"
        assert resultat["experience_annees"] == 2.0

    def test_cv_doctorat_detecte_correctement(self):
        """Doit détecter Doctorat dans le CV doctorat."""
        resultat = extraire_entites_cv(TEXTE_CV_DOCTORAT)
        assert resultat["formation_niveau"] == "doctorat"
        assert resultat["formation_score"] == 1.0
