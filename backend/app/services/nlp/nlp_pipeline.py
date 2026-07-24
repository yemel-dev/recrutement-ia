"""
nlp_pipeline.py
---------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Modification SSE : accepte maintenant un callback optionnel `on_progress`
qui est appelé à chaque étape pour diffuser la progression via SSE.

CORRECTIONS v2 :
  - Logs détaillés à chaque étape (INFO pour le succès, EXCEPTION pour l'échec)
    → permet de voir exactement où le pipeline s'arrête dans les logs serveur
  - Chaque étape a son propre try/except avec logger.exception() pour que
    la stack trace complète apparaisse dans les logs (plus de silence)
  - L'étape compétences (Sentence-BERT) garde son repli neutre existant,
    mais log maintenant la vraie erreur avec logger.exception()
"""

import logging
import time
from typing import Callable, Optional

from app.services.nlp.cv_extractor     import extraire_texte_cv
from app.services.nlp.preprocessor     import preprocesser_texte
from app.services.nlp.ner_extractor    import extraire_entites_cv
from app.services.nlp.skills_extractor import extraire_et_scorer_competences

logger = logging.getLogger("recrutement_ia.nlp_pipeline")


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
            try:
                on_progress(etape, label, progression)
            except Exception:
                # Une erreur SSE ne doit jamais interrompre l'analyse
                logger.warning(
                    "[NLP] emit() a échoué (étape %s / %s%%) — analyse continue",
                    etape, progression,
                )

    debut = time.time()
    logger.info("[NLP] ── Début pipeline ── fichier: %s", chemin_fichier)

    # ── Étape 1 : Extraction du texte brut ──────────────────────────────────
    emit(1, "Extraction du texte brut", 10)
    logger.info("[NLP] Étape 1 — extraction du texte brut")
    try:
        texte_brut = extraire_texte_cv(chemin_fichier)
        logger.info("[NLP] Étape 1 ✅ — %d caractères extraits", len(texte_brut))
    except Exception:
        logger.exception(
            "[NLP] Étape 1 ❌ — échec extraction texte (fichier: %s)",
            chemin_fichier,
        )
        raise
    emit(1, "Extraction du texte brut", 20)

    # ── Étape 2 : Prétraitement NLP ──────────────────────────────────────────
    emit(2, "Prétraitement NLP", 30)
    logger.info("[NLP] Étape 2 — prétraitement NLP")
    try:
        resultat_preprocessing = preprocesser_texte(texte_brut)
        tokens       = resultat_preprocessing["tokens"]
        texte_propre = resultat_preprocessing["texte_nettoye"]
        logger.info(
            "[NLP] Étape 2 ✅ — %d tokens, texte nettoyé: %d caractères",
            len(tokens), len(texte_propre),
        )
    except Exception:
        logger.exception("[NLP] Étape 2 ❌ — échec prétraitement NLP")
        raise
    emit(2, "Prétraitement NLP", 40)

    # ── Étape 3 : Extraction des entités nommées ─────────────────────────────
    emit(3, "Extraction des entités", 55)
    logger.info("[NLP] Étape 3 — extraction des entités nommées (spaCy)")
    try:
        resultat_ner = extraire_entites_cv(texte_brut)
        logger.info(
            "[NLP] Étape 3 ✅ — expérience: %s ans | formation: %s (score: %.2f) "
            "| orgs: %d | dates: %d | lieux: %d | personnes: %d",
            resultat_ner["experience_annees"],
            resultat_ner["formation_niveau"],
            resultat_ner["formation_score"],
            len(resultat_ner["organisations"]),
            len(resultat_ner["dates"]),
            len(resultat_ner["lieux"]),
            len(resultat_ner["personnes"]),
        )
    except Exception:
        logger.exception("[NLP] Étape 3 ❌ — échec NER (spaCy fr_core_news_lg)")
        raise
    emit(3, "Extraction des entités", 60)

    # ── Étape 4 : Extraction et scoring des compétences ──────────────────────
    # Isolée dans son propre try/except : cette étape charge le modèle
    # Sentence-BERT (sentence-transformers), qui a besoin de le télécharger
    # depuis Hugging Face au tout premier lancement. Si ça échoue (pas
    # d'accès internet, pare-feu, etc.), on ne veut PAS perdre les résultats
    # déjà obtenus aux étapes précédentes (formation, expérience).
    emit(4, "Matching des compétences", 75)
    logger.info(
        "[NLP] Étape 4 — matching compétences (Sentence-BERT) | %d compétences offre: %s",
        len(competences_offre), competences_offre,
    )
    try:
        resultat_skills = extraire_et_scorer_competences(tokens, competences_offre)
        logger.info(
            "[NLP] Étape 4 ✅ — %d compétences extraites | score: %.2f | "
            "couverture: %.0f%% | communes: %s",
            len(resultat_skills["competences_extraites"]),
            resultat_skills["score_competences"],
            resultat_skills["taux_couverture"] * 100,
            resultat_skills["competences_communes"],
        )
    except Exception as erreur_skills:
        logger.exception(
            "[NLP] Étape 4 ❌ — Sentence-BERT en échec — "
            "on continue avec une liste vide plutôt que de tout perdre."
        )
        resultat_skills = {
            "competences_extraites": [],
            "score_competences": 0.0,
            "competences_communes": [],
            "taux_couverture": 0.0,
            "erreur": str(erreur_skills),
        }
    emit(4, "Matching des compétences", 80)

    # ── Assemblage final ─────────────────────────────────────────────────────
    emit(5, "Calcul du score final", 90)
    duree = round(time.time() - debut, 2)

    logger.info(
        "[NLP] ── Pipeline terminé en %.2fs ── "
        "expérience: %s ans | formation: %s | "
        "score_compétences: %.2f | compétences extraites: %d",
        duree,
        resultat_ner["experience_annees"],
        resultat_ner["formation_niveau"],
        resultat_skills["score_competences"],
        len(resultat_skills["competences_extraites"]),
    )

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