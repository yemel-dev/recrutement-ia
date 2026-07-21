"""
skills_extractor.py
-------------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Extraire les compétences d'un CV et calculer leur score de correspondance
       avec les compétences requises par une offre d'emploi.

Deux approches complémentaires :
    1. Sentence-BERT : similarité sémantique (comprend le sens des mots)
    2. TF-IDF + cosinus : similarité lexicale (compare les fréquences de mots)

C'est la quatrième étape du pipeline NLP.
Elle produit 'competences_extraites' et 'score_competences' pour le Membre 1.

Dépendances :
    - sentence-transformers : modèle paraphrase-multilingual-MiniLM-L12-v2
    - scikit-learn          : TF-IDF vectorizer + similarité cosinus
"""

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
# Le pipeline compare les tokens du CV avec cette liste via Sentence-BERT.

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

def _extraire_competences_sbert(
    tokens_cv: list[str],
    seuil_similarite: float = 0.55
) -> list[str]:
    """
    Extrait les compétences du CV par comparaison sémantique avec l'ontologie ESCO.

    Fonctionnement :
        1. Sentence-BERT transforme chaque token du CV en vecteur numérique
           (embedding) qui représente son sens dans l'espace vectoriel
        2. On calcule la similarité cosinus entre chaque token et chaque
           compétence de l'ontologie ESCO
        3. Si la similarité dépasse le seuil, on considère que c'est une
           compétence reconnue

    Vocabulaire :
        - Embedding : représentation vectorielle d'un texte (liste de nombres)
        - Similarité cosinus : mesure l'angle entre deux vecteurs (0=opposés, 1=identiques)
        - Seuil : score minimum pour considérer deux textes comme similaires

    Args:
        tokens_cv         : liste de tokens lemmatisés du CV (de preprocessor.py)
        seuil_similarite  : score minimum de similarité (entre 0.0 et 1.0)
                           0.55 = bon compromis précision/rappel

    Returns:
        Liste des compétences reconnues dans le CV.
        Ex: ["python", "machine learning", "tensorflow", "docker"]
    """
    if not tokens_cv:
        return []

    modele = _get_modele_sbert()

    # Encoder tous les tokens du CV en embeddings
    # encode() retourne une matrice numpy de shape (nb_tokens, 384)
    embeddings_cv = modele.encode(tokens_cv, show_progress_bar=False)

    # Encoder toutes les compétences de l'ontologie
    embeddings_ontologie = modele.encode(
        ONTOLOGIE_COMPETENCES,
        show_progress_bar=False
    )

    competences_trouvees = set()  # set pour éviter les doublons

    for i, token in enumerate(tokens_cv):
        # Calculer la similarité entre ce token et toutes les compétences
        # reshape(1,-1) : transformer le vecteur 1D en matrice 2D pour sklearn
        similarites = cosine_similarity(
            embeddings_cv[i].reshape(1, -1),
            embeddings_ontologie
        )[0]  # [0] pour récupérer le tableau 1D

        # Trouver la compétence la plus similaire
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

    Fonctionnement :
        1. TF-IDF transforme les deux listes de compétences en vecteurs numériques
           TF = fréquence du terme dans le document
           IDF = importance du terme dans l'ensemble des documents
        2. La similarité cosinus entre les deux vecteurs donne le score

    Args:
        competences_cv     : compétences extraites du CV
        competences_offre  : compétences requises par l'offre d'emploi

    Returns:
        Score de correspondance entre 0.0 et 1.0
        1.0 = correspondance parfaite
        0.0 = aucune compétence commune

    Exemple:
        CV    : ["python", "machine learning", "docker"]
        Offre : ["python", "tensorflow", "docker"]
        Score : ~0.67 (2 compétences sur 3 en commun)
    """
    if not competences_cv or not competences_offre:
        return 0.0

    # Convertir les listes en chaînes de texte pour TF-IDF
    texte_cv    = " ".join(competences_cv)
    texte_offre = " ".join(competences_offre)

    try:
        # TfidfVectorizer transforme les textes en vecteurs numériques
        vectoriseur = TfidfVectorizer()
        matrice_tfidf = vectoriseur.fit_transform([texte_cv, texte_offre])

        # Calcul de la similarité cosinus entre le CV et l'offre
        # matrice_tfidf[0] = vecteur CV, matrice_tfidf[1] = vecteur offre
        score = cosine_similarity(
            matrice_tfidf[0],
            matrice_tfidf[1]
        )[0][0]

        # S'assurer que le score est bien entre 0 et 1
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

    Cette fonction est appelée par nlp_pipeline.py.
    Elle produit les champs attendus par le scoring du Membre 1 :
        - competences_extraites → liste des compétences détectées
        - score_competences     → Score_Competences (0.0 à 1.0)

    Args:
        tokens_cv          : tokens lemmatisés du CV (de preprocessor.py)
        competences_offre  : compétences requises par l'offre d'emploi
        seuil_similarite   : seuil de détection Sentence-BERT (défaut: 0.55)

    Returns:
        Dictionnaire :
        {
            "competences_extraites" : list[str],  # ← pour BDD + scoring
            "score_competences"     : float,      # ← pour scoring Membre 1
            "competences_communes"  : list[str],  # compétences en commun
            "taux_couverture"       : float,      # % offre couverte par le CV
        }

    Raises:
        ValueError : si tokens_cv est None.
    """
    if tokens_cv is None:
        raise ValueError(
            "La liste de tokens est None. "
            "Vérifie que preprocessor.py a bien traité le texte du CV."
        )

    # Étape 1 : extraire les compétences du CV via Sentence-BERT
    competences_cv = _extraire_competences_sbert(tokens_cv, seuil_similarite)

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

    return {
        "competences_extraites": competences_cv,
        "score_competences":     score,
        "competences_communes":  competences_communes,
        "taux_couverture":       float(taux_couverture),
    }
