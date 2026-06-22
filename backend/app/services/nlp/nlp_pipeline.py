"""
nlp_pipeline.py
---------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Orchestrateur du pipeline NLP complet.
       Reçoit un fichier CV + compétences de l'offre, appelle les 4 modules
       dans l'ordre et retourne un dictionnaire complet prêt pour la BDD.

Chaîne d'appel :
    1. cv_extractor.py     → extraire le texte brut du fichier CV
    2. preprocessor.py     → nettoyer et lemmatiser le texte
    3. ner_extractor.py    → extraire entités (expérience, formation)
    4. skills_extractor.py → extraire compétences et calculer le score

Ce module est le seul point d'entrée appelé par le router FastAPI (Membre 3).
"""

import time
from app.services.nlp.cv_extractor     import extraire_texte_cv
from app.services.nlp.preprocessor     import preprocesser_texte
from app.services.nlp.ner_extractor    import extraire_entites_cv
from app.services.nlp.skills_extractor import extraire_et_scorer_competences


def analyser_cv(chemin_fichier: str, competences_offre: list[str]) -> dict:
    """
    Fonction principale et unique point d'entrée du pipeline NLP.

    Orchestre les 4 modules dans l'ordre pour analyser un CV complet.
    Appelée par le router FastAPI après l'upload d'un CV par un candidat.

    Args:
        chemin_fichier    : chemin absolu vers le CV (PDF ou DOCX)
        competences_offre : liste des compétences requises par l'offre d'emploi
                           Ex: ["python", "machine learning", "docker"]

    Returns:
        Dictionnaire complet des résultats NLP :
        {
            # ── Champs pour la table 'applications' (BDD Membre 3) ──
            "competences_extraites" : list[str],  # compétences du CV
            "experience_annees"     : float,      # années d'expérience
            "formation_niveau"      : str,        # "master", "licence"...
            "entites_nommees"       : dict,       # organisations, lieux...

            # ── Champs pour le scoring (Membre 1) ──
            "score_competences"     : float,      # Score_Competences (0-1)
            "formation_score"       : float,      # Score_Formation (0-1)

            # ── Informations supplémentaires ──
            "competences_communes"  : list[str],  # CV ∩ offre
            "taux_couverture"       : float,      # % offre couverte
            "texte_extrait"         : str,        # texte brut du CV
            "duree_analyse_secondes": float,      # temps de traitement
        }

    Raises:
        FileNotFoundError : si le fichier CV n'existe pas
        ValueError        : si le fichier est vide ou format non supporté
    """
    debut = time.time()

    # ── Étape 1 : Extraction du texte brut ──────────────────────────────────
    texte_brut = extraire_texte_cv(chemin_fichier)

    # ── Étape 2 : Prétraitement NLP ──────────────────────────────────────────
    resultat_preprocessing = preprocesser_texte(texte_brut)
    tokens       = resultat_preprocessing["tokens"]
    texte_propre = resultat_preprocessing["texte_nettoye"]

    # ── Étape 3 : Extraction des entités nommées ─────────────────────────────
    resultat_ner = extraire_entites_cv(texte_brut)

    # ── Étape 4 : Extraction et scoring des compétences ──────────────────────
    resultat_skills = extraire_et_scorer_competences(tokens, competences_offre)

    # ── Assemblage du résultat final ─────────────────────────────────────────
    duree = round(time.time() - debut, 2)

    return {
        # Champs BDD (table applications)
        "competences_extraites":  resultat_skills["competences_extraites"],
        "experience_annees":      resultat_ner["experience_annees"],
        "formation_niveau":       resultat_ner["formation_niveau"],
        "entites_nommees": {
            "organisations": resultat_ner["organisations"],
            "dates":         resultat_ner["dates"],
            "lieux":         resultat_ner["lieux"],
            "personnes":     resultat_ner["personnes"],
        },

        # Champs scoring (Membre 1)
        "score_competences": resultat_skills["score_competences"],
        "formation_score":   resultat_ner["formation_score"],

        # Informations supplémentaires
        "competences_communes":   resultat_skills["competences_communes"],
        "taux_couverture":        resultat_skills["taux_couverture"],
        "texte_extrait":          texte_brut,
        "duree_analyse_secondes": duree,
    }
