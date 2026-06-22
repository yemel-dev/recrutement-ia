"""
test_cv_extractor.py
---------------------
Tests unitaires pour le module cv_extractor.py
Membre 2 - NLP/IA | Université de Dschang 2024-2025

Comment lire ces tests :
    Chaque fonction test_xxx() vérifie UN comportement précis du module.
    On utilise pytest — pour lancer les tests :
        cd backend
        pytest tests/test_cv_extractor.py -v

Structure des tests :
    1. Tests sur PDF  (cas normal + cas d'erreur)
    2. Tests sur DOCX (cas normal + cas d'erreur)
    3. Tests sur la fonction principale extraire_texte_cv()
"""

import pytest
from pathlib import Path

# On importe le module qu'on veut tester
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.services.nlp.cv_extractor import (
    extraire_texte_cv,
    _extraire_texte_pdf,
    _extraire_texte_docx,
)

# ──────────────────────────────────────────────────────────────────────────────
# Chemins vers les fichiers de test (créés à côté de ce fichier)
# ──────────────────────────────────────────────────────────────────────────────
DOSSIER_TESTS = Path(__file__).parent
CV_PDF   = str(DOSSIER_TESTS / "cv_test.pdf")
CV_DOCX  = str(DOSSIER_TESTS / "cv_test.docx")


# ==============================================================================
# BLOC 1 — Tests extraction PDF
# ==============================================================================

class TestExtractionPDF:
    """Tests pour la fonction _extraire_texte_pdf()"""

    def test_extraction_retourne_une_chaine(self):
        """Le résultat doit être une chaîne de caractères (str)."""
        resultat = _extraire_texte_pdf(CV_PDF)
        assert isinstance(resultat, str)

    def test_extraction_non_vide(self):
        """Le texte extrait ne doit pas être vide."""
        resultat = _extraire_texte_pdf(CV_PDF)
        assert len(resultat) > 0

    def test_extraction_contient_nom_candidat(self):
        """Le nom 'Jean Dupont' doit être présent dans le texte extrait."""
        resultat = _extraire_texte_pdf(CV_PDF)
        assert "Jean Dupont" in resultat

    def test_extraction_contient_competences(self):
        """Les compétences du CV de test doivent être détectées."""
        resultat = _extraire_texte_pdf(CV_PDF)
        assert "Python" in resultat

    def test_fichier_inexistant_leve_erreur(self):
        """Un fichier qui n'existe pas doit lever FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            _extraire_texte_pdf("fichier_qui_nexiste_pas.pdf")

    def test_message_erreur_contient_chemin(self):
        """Le message d'erreur doit indiquer le chemin du fichier introuvable."""
        chemin_faux = "dossier/cv_fantome.pdf"
        with pytest.raises(FileNotFoundError, match=chemin_faux):
            _extraire_texte_pdf(chemin_faux)


# ==============================================================================
# BLOC 2 — Tests extraction DOCX
# ==============================================================================

class TestExtractionDOCX:
    """Tests pour la fonction _extraire_texte_docx()"""

    def test_extraction_retourne_une_chaine(self):
        """Le résultat doit être une chaîne de caractères (str)."""
        resultat = _extraire_texte_docx(CV_DOCX)
        assert isinstance(resultat, str)

    def test_extraction_non_vide(self):
        """Le texte extrait ne doit pas être vide."""
        resultat = _extraire_texte_docx(CV_DOCX)
        assert len(resultat) > 0

    def test_extraction_contient_nom_candidat(self):
        """Le nom 'Marie Curie' doit être présent dans le texte extrait."""
        resultat = _extraire_texte_docx(CV_DOCX)
        assert "Marie Curie" in resultat

    def test_extraction_contient_competences(self):
        """Les compétences du CV de test doivent être détectées."""
        resultat = _extraire_texte_docx(CV_DOCX)
        assert "TensorFlow" in resultat

    def test_fichier_inexistant_leve_erreur(self):
        """Un fichier qui n'existe pas doit lever FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            _extraire_texte_docx("fichier_qui_nexiste_pas.docx")


# ==============================================================================
# BLOC 3 — Tests de la fonction principale extraire_texte_cv()
# ==============================================================================

class TestExtraireTexteCv:
    """Tests pour la fonction publique principale extraire_texte_cv()"""

    def test_detecte_pdf_automatiquement(self):
        """La fonction doit détecter et traiter un PDF sans qu'on lui dise."""
        resultat = extraire_texte_cv(CV_PDF)
        assert isinstance(resultat, str)
        assert len(resultat) > 0

    def test_detecte_docx_automatiquement(self):
        """La fonction doit détecter et traiter un DOCX sans qu'on lui dise."""
        resultat = extraire_texte_cv(CV_DOCX)
        assert isinstance(resultat, str)
        assert len(resultat) > 0

    def test_format_non_supporte_leve_erreur(self):
        """Un fichier .txt ou .png doit lever ValueError."""
        with pytest.raises(ValueError, match="non supporté"):
            extraire_texte_cv("cv.txt")

    def test_extension_majuscule_traitee_comme_pdf(self):
        """
        Une extension .PDF en majuscule est gérée par .lower() dans le code.
        Donc elle est reconnue comme PDF — mais si le fichier n'existe pas,
        on obtient FileNotFoundError (ce qui est le comportement correct).
        """
        with pytest.raises(FileNotFoundError):
            extraire_texte_cv("mon_cv.PDF")

    def test_fichier_pdf_inexistant(self):
        """Un chemin PDF inexistant doit lever FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            extraire_texte_cv("cv_fantome.pdf")

    def test_fichier_docx_inexistant(self):
        """Un chemin DOCX inexistant doit lever FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            extraire_texte_cv("cv_fantome.docx")

    def test_pdf_et_docx_retournent_bien_du_texte(self):
        """Les deux formats doivent retourner un texte de longueur raisonnable."""
        texte_pdf  = extraire_texte_cv(CV_PDF)
        texte_docx = extraire_texte_cv(CV_DOCX)
        # Un CV réel a au minimum quelques dizaines de caractères
        assert len(texte_pdf)  > 50
        assert len(texte_docx) > 50
