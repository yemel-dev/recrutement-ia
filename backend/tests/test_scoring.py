"""
Tests unitaires pour l'algorithme de scoring multicritère.
Lance avec : pytest tests/test_scoring.py -v
"""
import pytest
from app.services.scoring_service import (
    calculer_score_competences,
    calculer_score_experience,
    calculer_score_formation,
    calculer_score_personnalite,
    calculer_score_global,
    scorer_candidat,
)
from app.schemas.schemas import ScoringInput


# ─── Tests Score Compétences ──────────────────────────────────────────────────

class TestScoreCompetences:

    def test_toutes_competences_trouvees(self):
        """Candidat a toutes les compétences requises → score = 1.0"""
        score, detail = calculer_score_competences(
            competences_cv=["Python", "spaCy", "SQL", "TensorFlow"],
            competences_requises=["Python", "spaCy", "SQL", "TensorFlow"]
        )
        assert score == 1.0
        assert len(detail["competences_manquantes"]) == 0

    def test_aucune_competence_trouvee(self):
        """Candidat n'a aucune compétence requise → score = 0.0"""
        score, detail = calculer_score_competences(
            competences_cv=["Java", "C++"],
            competences_requises=["Python", "spaCy", "SQL"]
        )
        assert score == 0.0
        assert len(detail["competences_trouvees"]) == 0

    def test_competences_partielles(self):
        """Candidat a 2 compétences sur 4 → score = 0.5"""
        score, detail = calculer_score_competences(
            competences_cv=["Python", "SQL", "Java"],
            competences_requises=["Python", "spaCy", "SQL", "TensorFlow"]
        )
        assert score == 0.5
        assert detail["nb_trouvees"] == 2
        assert detail["nb_requises"] == 4

    def test_insensible_casse(self):
        """La comparaison ne doit pas être sensible à la casse"""
        score, _ = calculer_score_competences(
            competences_cv=["PYTHON", "spacy", "Sql"],
            competences_requises=["python", "spaCy", "SQL"]
        )
        assert score == 1.0

    def test_competences_requises_vides(self):
        """Si aucune compétence requise → score = 0.0"""
        score, detail = calculer_score_competences(
            competences_cv=["Python"],
            competences_requises=[]
        )
        assert score == 0.0
        assert "erreur" in detail


# ─── Tests Score Expérience ───────────────────────────────────────────────────

class TestScoreExperience:

    def test_experience_exacte(self):
        """Candidat a exactement l'expérience requise → score = 1.0"""
        score, _ = calculer_score_experience(
            experience_annees=3.0,
            experience_requise=3
        )
        assert score == 1.0

    def test_experience_insuffisante(self):
        """Candidat a 1 an pour 4 requis → score = 0.25"""
        score, detail = calculer_score_experience(
            experience_annees=1.0,
            experience_requise=4
        )
        assert score == 0.25
        assert detail["ecart"] == -3.0

    def test_experience_superieure(self):
        """Candidat dépasse l'exigence → score plafonné à 1.0"""
        score, _ = calculer_score_experience(
            experience_annees=10.0,
            experience_requise=2
        )
        assert score == 1.0

    def test_aucune_experience_requise(self):
        """Offre sans exigence d'expérience → score = 1.0"""
        score, detail = calculer_score_experience(
            experience_annees=0.0,
            experience_requise=0
        )
        assert score == 1.0
        assert "message" in detail

    def test_experience_nulle_requise(self):
        """Candidat sans expérience pour un poste qui en requiert → score faible"""
        score, _ = calculer_score_experience(
            experience_annees=0.0,
            experience_requise=5
        )
        assert score == 0.0


# ─── Tests Score Formation ────────────────────────────────────────────────────

class TestScoreFormation:

    def test_doctorat(self):
        score, _ = calculer_score_formation("Doctorat")
        assert score == 1.00

    def test_master(self):
        score, _ = calculer_score_formation("Master")
        assert score == 0.85

    def test_licence(self):
        score, _ = calculer_score_formation("Licence")
        assert score == 0.65

    def test_bts(self):
        score, _ = calculer_score_formation("BTS")
        assert score == 0.45

    def test_autre(self):
        score, _ = calculer_score_formation("Autre")
        assert score == 0.25

    def test_formation_inconnue(self):
        """Formation non reconnue → score par défaut = 0.25"""
        score, _ = calculer_score_formation("Certificat")
        assert score == 0.25

    def test_insensible_casse(self):
        """La formation doit être reconnue quelle que soit la casse"""
        score, _ = calculer_score_formation("master")
        assert score == 0.85


# ─── Tests Score Personnalité OCEAN ──────────────────────────────────────────

class TestScorePersonnalite:

    def test_profil_parfait(self):
        """Candidat a exactement le profil OCEAN idéal → score = 1.0"""
        scores_candidat = {
            "score_O": 0.8, "score_C": 0.7,
            "score_E": 0.5, "score_A": 0.6, "score_N": 0.3
        }
        ocean_ideal = {"O": 0.8, "C": 0.7, "E": 0.5, "A": 0.6, "N": 0.3}
        score, detail = calculer_score_personnalite(scores_candidat, ocean_ideal)
        assert score == 1.0
        assert detail["distance_euclidienne"] == 0.0

    def test_profil_oppose(self):
        """Candidat a le profil opposé → score proche de 0.0"""
        scores_candidat = {
            "score_O": 0.0, "score_C": 0.0,
            "score_E": 0.0, "score_A": 0.0, "score_N": 0.0
        }
        ocean_ideal = {"O": 1.0, "C": 1.0, "E": 1.0, "A": 1.0, "N": 1.0}
        score, _ = calculer_score_personnalite(scores_candidat, ocean_ideal)
        assert score == 0.0

    def test_score_entre_0_et_1(self):
        """Le score de personnalité doit toujours être entre 0 et 1"""
        scores_candidat = {
            "score_O": 0.6, "score_C": 0.4,
            "score_E": 0.7, "score_A": 0.5, "score_N": 0.6
        }
        ocean_ideal = {"O": 0.8, "C": 0.7, "E": 0.5, "A": 0.6, "N": 0.3}
        score, _ = calculer_score_personnalite(scores_candidat, ocean_ideal)
        assert 0.0 <= score <= 1.0


# ─── Tests Score Global ───────────────────────────────────────────────────────

class TestScoreGlobal:

    def test_candidat_parfait(self):
        """Candidat parfait sur tous les critères → score global = 1.0"""
        score, detail = calculer_score_global(
            score_competences=1.0,
            score_experience=1.0,
            score_formation=1.0,
            score_personnalite=1.0,
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )
        assert score == 1.0

    def test_candidat_nul(self):
        """Candidat nul sur tous les critères → score global = 0.0"""
        score, _ = calculer_score_global(
            score_competences=0.0,
            score_experience=0.0,
            score_formation=0.0,
            score_personnalite=0.0,
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )
        assert score == 0.0

    def test_formule_correcte(self):
        """Vérifie que la formule de scoring est appliquée correctement"""
        score, detail = calculer_score_global(
            score_competences=0.80,
            score_experience=0.60,
            score_formation=0.85,
            score_personnalite=0.70,
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )
        attendu = (0.80 * 0.40) + (0.60 * 0.25) + (0.85 * 0.20) + (0.70 * 0.15)
        assert abs(score - round(attendu, 4)) < 0.0001

    def test_contributions_detail(self):
        """Vérifie que le détail des contributions est correct"""
        score, detail = calculer_score_global(
            score_competences=1.0,
            score_experience=0.0,
            score_formation=0.0,
            score_personnalite=0.0,
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )
        assert detail["contributions"]["competences"] == 0.40
        assert detail["contributions"]["experience"] == 0.0


# ─── Test Intégration — scorer_candidat() ────────────────────────────────────

class TestScorerCandidat:

    def get_input_complet(self):
        return ScoringInput(
            competences_cv=["Python", "spaCy", "SQL", "Machine Learning"],
            experience_annees=3.0,
            formation_niveau="Master",
            score_O=0.75,
            score_C=0.68,
            score_E=0.52,
            score_A=0.78,
            score_N=0.32,
            competences_requises=["Python", "spaCy", "SQL", "TensorFlow"],
            experience_requise=2,
            ocean_ideal={"O": 0.8, "C": 0.7, "E": 0.5, "A": 0.6, "N": 0.3},
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )

    def test_scoring_complet(self):
        """Test d'intégration : scoring complet d'un candidat"""
        data = self.get_input_complet()
        result = scorer_candidat(data)

        assert result.score_competences == 0.75   # 3 sur 4 compétences
        assert result.score_experience == 1.0     # 3 ans pour 2 requis
        assert result.score_formation == 0.85     # Master
        assert 0.0 <= result.score_personnalite <= 1.0
        assert 0.0 <= result.score_global <= 1.0

    def test_detail_present(self):
        """Le détail du scoring doit toujours être présent"""
        data = self.get_input_complet()
        result = scorer_candidat(data)

        assert "competences" in result.detail
        assert "experience" in result.detail
        assert "formation" in result.detail
        assert "personnalite" in result.detail
        assert "global" in result.detail

    def test_classement_logique(self):
        """Un meilleur candidat doit avoir un score plus élevé"""
        candidat_fort = ScoringInput(
            competences_cv=["Python", "spaCy", "SQL", "TensorFlow"],
            experience_annees=5.0,
            formation_niveau="Doctorat",
            score_O=0.8, score_C=0.7, score_E=0.5, score_A=0.6, score_N=0.3,
            competences_requises=["Python", "spaCy", "SQL", "TensorFlow"],
            experience_requise=2,
            ocean_ideal={"O": 0.8, "C": 0.7, "E": 0.5, "A": 0.6, "N": 0.3},
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )
        candidat_faible = ScoringInput(
            competences_cv=["Java"],
            experience_annees=0.0,
            formation_niveau="BTS",
            score_O=0.2, score_C=0.2, score_E=0.2, score_A=0.2, score_N=0.9,
            competences_requises=["Python", "spaCy", "SQL", "TensorFlow"],
            experience_requise=2,
            ocean_ideal={"O": 0.8, "C": 0.7, "E": 0.5, "A": 0.6, "N": 0.3},
            poids={"competences": 0.40, "experience": 0.25,
                   "formation": 0.20, "personnalite": 0.15}
        )

        result_fort = scorer_candidat(candidat_fort)
        result_faible = scorer_candidat(candidat_faible)

        assert result_fort.score_global > result_faible.score_global, (
            f"Le candidat fort ({result_fort.score_global}) doit scorer "
            f"plus haut que le faible ({result_faible.score_global})"
        )