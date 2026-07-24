"""
skills_extractor.py
-------------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Extraire les compétences d'un CV et calculer leur score de correspondance
       avec les compétences requises par une offre d'emploi.

Méthode d'extraction : correspondance de mots-clés exacte contre une
ontologie ESCO simplifiée (voir _extraire_competences_motscles ci-dessous
pour le détail du choix, suite à un bug de faux positifs massifs avec
l'ancienne approche par similarité Sentence-BERT).

Le score de correspondance CV / offre reste calculé par TF-IDF + cosinus.

C'est la quatrième étape du pipeline NLP.
Elle produit 'competences_extraites' et 'score_competences' pour le Membre 1.

Dépendances :
    - scikit-learn : TF-IDF vectorizer + similarité cosinus
    - sentence-transformers : conservé uniquement pour _extraire_competences_sbert
      (ancienne méthode, gardée pour les tests existants — plus utilisée
      en production, voir extraire_et_scorer_competences)
"""

import re
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Optional
import numpy as np


# ──────────────────────────────────────────────────────────────────────────────
# Ontologie ESCO simplifiée (compétences de référence)
# ──────────────────────────────────────────────────────────────────────────────
# Source : Commission Européenne ESCO v1.1 (open data)
# On utilise un extrait centré sur les métiers de l'IA et du numérique.

ONTOLOGIE_COMPETENCES = [
    # Langages de programmation
    "python", "java", "javascript", "typescript", "c++", "c#", "r", "scala",
    "go", "rust", "php", "swift", "kotlin", "matlab",
    # IA et Machine Learning
    "machine learning", "deep learning", "intelligence artificielle",
    "apprentissage automatique", "apprentissage profond", "réseaux de neurones",
    "neural networks", "computer vision", "vision par ordinateur",
    "traitement du langage naturel", "natural language processing", "nlp",
    # Frameworks IA
    "tensorflow", "pytorch", "keras", "scikit-learn", "huggingface",
    "transformers", "bert", "gpt", "llm", "spacy", "nltk",
    # Data Science
    "data science", "analyse de données", "data analysis", "statistiques",
    "visualisation de données", "data visualization", "pandas", "numpy",
    "matplotlib", "seaborn", "plotly",
    # Bases de données
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "base de données", "database",
    # Cloud et DevOps
    "docker", "kubernetes", "git", "ci/cd", "aws", "azure", "gcp",
    "cloud computing", "devops", "linux",
    # Web
    "react", "vue.js", "angular", "node.js", "fastapi", "django", "flask",
    "rest api", "graphql", "html", "css",
    # Soft skills techniques
    "algorithmique", "structures de données", "conception logicielle",
    "architecture logicielle", "méthodes agiles", "scrum",
]


# ──────────────────────────────────────────────────────────────────────────────
# Chargement du modèle Sentence-BERT (fait UNE SEULE FOIS)
# ──────────────────────────────────────────────────────────────────────────────

_modele_sbert: Optional[SentenceTransformer] = None


def _get_modele_sbert() -> SentenceTransformer:
    """
    Charge et retourne le modèle Sentence-BERT multilingue.
    Le modèle est mis en cache pour éviter de le recharger à chaque appel.

    Modèle utilisé : paraphrase-multilingual-MiniLM-L12-v2
        - Multilingue : fonctionne en français ET en anglais
        - Léger : 12 couches MiniLM, rapide à l'inférence
        - Précis : entraîné pour la similarité sémantique de phrases

    Returns:
        Modèle SentenceTransformer prêt à l'emploi.
    """
    global _modele_sbert

    if _modele_sbert is None:
        _modele_sbert = SentenceTransformer(
            "paraphrase-multilingual-MiniLM-L12-v2"
        )

    return _modele_sbert


# ──────────────────────────────────────────────────────────────────────────────
# Fonctions privées
# ──────────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────────
# Extraction en production : correspondance de mots-clés exacte
# ──────────────────────────────────────────────────────────────────────────────
#
# CORRECTIF : l'ancienne extraction (_extraire_competences_sbert, conservée
# plus bas pour les tests existants) comparait CHAQUE token du CV à l'ontologie
# via Sentence-BERT avec un seuil de 0.55. Problème : pour ce modèle
# multilingue, la similarité cosinus "de base" entre un mot générique
# quelconque et n'importe quel terme technique tourne déjà autour de 0.4-0.6
# (anisotropie de l'espace d'embeddings) — le seuil ne filtrait donc presque
# rien, et le pipeline "détectait" quasi le même sous-ensemble d'une
# trentaine de compétences sur n'importe quel CV, indépendamment de son
# contenu réel.
#
# Pour des termes techniques précis (langages, frameworks...), une
# correspondance de mots-clés exacte est plus fiable qu'une similarité
# sémantique approximative — et supprime au passage l'appel réseau vers
# Hugging Face à chaque analyse.

def _extraire_competences_motscles(tokens_cv: list[str]) -> list[str]:
    """
    Extrait les compétences du CV par correspondance exacte de mots-clés
    contre l'ontologie ESCO simplifiée.

    Args:
        tokens_cv : liste de tokens lemmatisés du CV (de preprocessor.py)

    Returns:
        Liste des compétences de l'ontologie effectivement présentes dans
        le CV (recherche insensible à la casse, avec limites de mots pour
        éviter les faux positifs comme "r" dans "pour").
    """
    if not tokens_cv:
        return []

    texte = " " + " ".join(tokens_cv).lower() + " "
    trouvees = []
    for terme in ONTOLOGIE_COMPETENCES:
        pattern = r"(?<![a-zà-ÿ0-9])" + re.escape(terme) + r"(?![a-zà-ÿ0-9])"
        if re.search(pattern, texte):
            trouvees.append(terme)
    return trouvees


def _extraire_competences_sbert(
    tokens_cv: list[str],
    seuil_similarite: float = 0.55
) -> list[str]:
    """
    [ANCIENNE MÉTHODE — plus utilisée en production, voir
    extraire_et_scorer_competences. Conservée pour les tests existants.]

    Extrait les compétences du CV par comparaison sémantique avec l'ontologie ESCO.

    Fonctionnement :
        1. Sentence-BERT transforme chaque token du CV en vecteur numérique
           (embedding) qui représente son sens dans l'espace vectoriel
        2. On calcule la similarité cosinus entre chaque token et chaque
           compétence de l'ontologie ESCO
        3. Si la similarité dépasse le seuil, on considère que c'est une
           compétence reconnue

    Args:
        tokens_cv         : liste de tokens lemmatisés du CV (de preprocessor.py)
        seuil_similarite  : score minimum de similarité (entre 0.0 et 1.0)

    Returns:
        Liste des compétences reconnues dans le CV.
    """
    if not tokens_cv:
        return []

    modele = _get_modele_sbert()

    embeddings_cv = modele.encode(tokens_cv, show_progress_bar=False)
    embeddings_ontologie = modele.encode(
        ONTOLOGIE_COMPETENCES,
        show_progress_bar=False
    )

    competences_trouvees = set()

    for i, token in enumerate(tokens_cv):
        similarites = cosine_similarity(
            embeddings_cv[i].reshape(1, -1),
            embeddings_ontologie
        )[0]

        indice_max = np.argmax(similarites)
        score_max = similarites[indice_max]

        if score_max >= seuil_similarite:
            competence_reconnue = ONTOLOGIE_COMPETENCES[indice_max]
            competences_trouvees.add(competence_reconnue)

    return list(competences_trouvees)


def _calculer_score_tfidf(
    competences_cv: list[str],
    competences_offre: list[str]
) -> float:
    """
    Calcule le score de correspondance entre les compétences du CV
    et les compétences requises par l'offre d'emploi via TF-IDF.

    Args:
        competences_cv     : compétences extraites du CV
        competences_offre  : compétences requises par l'offre d'emploi

    Returns:
        Score de correspondance entre 0.0 et 1.0
    """
    if not competences_cv or not competences_offre:
        return 0.0

    texte_cv    = " ".join(competences_cv)
    texte_offre = " ".join(competences_offre)

    try:
        vectoriseur = TfidfVectorizer()
        matrice_tfidf = vectoriseur.fit_transform([texte_cv, texte_offre])

        score = cosine_similarity(
            matrice_tfidf[0],
            matrice_tfidf[1]
        )[0][0]

        return float(np.clip(score, 0.0, 1.0))

    except Exception:
        return 0.0


# ──────────────────────────────────────────────────────────────────────────────
# Fonction publique principale
# ──────────────────────────────────────────────────────────────────────────────

def extraire_et_scorer_competences(
    tokens_cv: list[str],
    competences_offre: list[str],
    seuil_similarite: float = 0.55
) -> dict:
    """
    Fonction principale du module.
    Extrait les compétences du CV et calcule leur score de correspondance
    avec les compétences de l'offre d'emploi.
    """
    if tokens_cv is None:
        raise ValueError(
            "La liste de tokens est None. "
            "Vérifie que preprocessor.py a bien traité le texte du CV."
        )

    # Étape 1 : extraire les compétences du CV par mots-clés exacts
    # Garde-fou : cette étape ne doit JAMAIS faire planter tout le pipeline
    # NLP ni faire renvoyer None par cette fonction (nlp_pipeline.py accède
    # directement aux clés du dict retourné, sans re-vérifier qu'il existe).
    try:
        competences_cv = _extraire_competences_motscles(tokens_cv)
    except Exception:
        competences_cv = []

    # Étape 2 : calculer le score TF-IDF entre CV et offre
    score = _calculer_score_tfidf(competences_cv, competences_offre)

    # Étape 3 : identifier les compétences en commun
    competences_communes = [
        c for c in competences_cv
        if c in competences_offre
    ]

    # Étape 4 : calculer le taux de couverture de l'offre
    taux_couverture = (
        len(competences_communes) / len(competences_offre)
        if competences_offre else 0.0
    )

    resultat = {
        "competences_extraites": competences_cv,
        "score_competences":     score,
        "competences_communes":  competences_communes,
        "taux_couverture":       float(taux_couverture),
    }
    assert resultat is not None  # garde-fou explicite — ne doit jamais arriver
    return resultat