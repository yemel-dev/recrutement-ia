"""
nlp_pipeline.py
---------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Modification SSE : accepte maintenant un callback optionnel `on_progress`
qui est appelé à chaque étape pour diffuser la progression via SSE.
"""

import time
from typing import Callable, Optional

from app.services.nlp.cv_extractor     import extraire_texte_cv
from app.services.nlp.preprocessor     import preprocesser_texte
from app.services.nlp.ner_extractor    import extraire_entites_cv
from app.services.nlp.skills_extractor import extraire_et_scorer_competences


def analyser_cv(
    chemin_fichier: str,
    competences_offre: list[str],
    on_progress: Optional[Callable[[int, str, int], None]] = None,
) -> dict:
    """
    Pipeline NLP complet avec support de progression SSE.

    Args:
        chemin_fichier    : chemin vers le CV (PDF ou DOCX)
        competences_offre : compétences requises par l'offre
        on_progress       : callback optionnel appelé à chaque étape.
                            Signature : on_progress(etape: int, label: str, progression: int)

    Returns:
        Dictionnaire complet des résultats NLP.
    """

    def emit(etape: int, label: str, progression: int):
        if on_progress:
            on_progress(etape, label, progression)

    debut = time.time()

    # ── Étape 1 : Extraction du texte brut ──────────────────────────────────
    emit(1, "Extraction du texte brut", 10)
    texte_brut = extraire_texte_cv(chemin_fichier)
    emit(1, "Extraction du texte brut", 20)

    # ── Étape 2 : Prétraitement NLP ──────────────────────────────────────────
    emit(2, "Prétraitement NLP", 30)
    resultat_preprocessing = preprocesser_texte(texte_brut)
    tokens       = resultat_preprocessing["tokens"]
    texte_propre = resultat_preprocessing["texte_nettoye"]
    emit(2, "Prétraitement NLP", 40)

    # ── Étape 3 : Extraction des entités nommées ─────────────────────────────
    emit(3, "Extraction des entités", 55)
    resultat_ner = extraire_entites_cv(texte_brut)
    emit(3, "Extraction des entités", 60)

    # ── Étape 4 : Extraction et scoring des compétences ──────────────────────
    emit(4, "Matching des compétences", 75)
    resultat_skills = extraire_et_scorer_competences(tokens, competences_offre)
    emit(4, "Matching des compétences", 80)

    # ── Assemblage final ─────────────────────────────────────────────────────
    emit(5, "Calcul du score final", 90)
    duree = round(time.time() - debut, 2)

    return {
        "competences_extraites":  resultat_skills["competences_extraites"],
        "experience_annees":      resultat_ner["experience_annees"],
        "formation_niveau":       resultat_ner["formation_niveau"],
        "entites_nommees": {
            "organisations": resultat_ner["organisations"],
            "dates":         resultat_ner["dates"],
            "lieux":         resultat_ner["lieux"],
            "personnes":     resultat_ner["personnes"],
        },
        "score_competences": resultat_skills["score_competences"],
        "formation_score":   resultat_ner["formation_score"],
        "competences_communes":   resultat_skills["competences_communes"],
        "taux_couverture":        resultat_skills["taux_couverture"],
        "texte_extrait":          texte_brut,
        "duree_analyse_secondes": duree,
    }