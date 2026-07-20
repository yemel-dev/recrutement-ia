"""
preprocessor.py
---------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Nettoyer et préparer le texte brut extrait d'un CV pour l'analyse NLP.
C'est la deuxième étape du pipeline — elle reçoit le texte de cv_extractor.py
et produit des tokens propres et lemmatisés pour les étapes suivantes.

Dépendances :
    - spacy + fr_core_news_lg : tokenisation, lemmatisation, stopwords
    - re                      : nettoyage du texte par expressions régulières
"""

import re
import spacy
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# Chargement du modèle spaCy (fait UNE SEULE FOIS au démarrage)
# ──────────────────────────────────────────────────────────────────────────────
# On charge le modèle en dehors des fonctions pour éviter de le recharger
# à chaque appel — c'est une optimisation importante car charger un modèle
# spaCy prend environ 2-3 secondes.

_nlp_model: Optional[spacy.language.Language] = None


def _get_modele_spacy() -> spacy.language.Language:
    """
    Charge et retourne le modèle spaCy fr_core_news_lg.
    Le modèle est chargé une seule fois puis mis en cache (variable globale).

    Returns:
        Le modèle spaCy chargé et prêt à l'emploi.

    Raises:
        OSError : si le modèle fr_core_news_lg n'est pas installé.
                  Solution : python -m spacy download fr_core_news_lg
    """
    global _nlp_model

    if _nlp_model is None:
        try:
            _nlp_model = spacy.load("fr_core_news_lg")
        except OSError:
            raise OSError(
                "Modèle spaCy 'fr_core_news_lg' introuvable. "
                "Installe-le avec : python -m spacy download fr_core_news_lg"
            )

    return _nlp_model


# ──────────────────────────────────────────────────────────────────────────────
# Fonctions privées (usage interne uniquement)
# ──────────────────────────────────────────────────────────────────────────────

def _nettoyer_texte(texte: str) -> str:
    """
    Nettoie le texte brut avant de le donner à spaCy.

    Opérations effectuées dans l'ordre :
        1. Conversion en minuscules
        2. Suppression des URLs (http://..., www....)
        3. Suppression des emails (nom@domaine.com)
        4. Suppression des caractères spéciaux (garde lettres, chiffres, espaces)
        5. Suppression des espaces multiples → un seul espace
        6. Suppression des espaces en début/fin

    Args:
        texte : texte brut extrait du CV.

    Returns:
        Texte nettoyé, normalisé, en minuscules.

    Exemple:
        >>> _nettoyer_texte("Jean DUPONT - Ingénieur IA\\n\\nEmail: j@test.com")
        "jean dupont ingénieur ia"
    """
    if not texte or not texte.strip():
        return ""

    # Étape 1 : minuscules
    texte = texte.lower()

    # Étape 2 : suppression des URLs
    texte = re.sub(r"http\S+|www\.\S+", " ", texte)

    # Étape 3 : suppression des emails
    texte = re.sub(r"\S+@\S+\.\S+", " ", texte)

    # Étape 4 : on garde uniquement lettres (avec accents), chiffres et espaces
    # \w capture les lettres unicode (é, è, ç...) + chiffres + underscore
    texte = re.sub(r"[^\w\s]", " ", texte)

    # Étape 5 : espaces multiples → un seul espace
    texte = re.sub(r"\s+", " ", texte)

    # Étape 6 : supprimer espaces début/fin
    texte = texte.strip()

    return texte


def _lemmatiser_et_filtrer(texte_nettoye: str) -> list[str]:
    """
    Tokenise, lemmatise et filtre le texte nettoyé avec spaCy.

    Vocabulaire important :
        - Token     : un mot ou signe découpé par spaCy ("travaillait" = 1 token)
        - Lemme     : forme canonique du token ("travaillait" → "travailler")
        - Stopword  : mot sans valeur sémantique ("le", "de", "et", "un"...)
        - Ponctuation : signes comme ".", ",", "!", etc.

    Opérations :
        1. spaCy analyse le texte (tokenisation + lemmatisation automatique)
        2. On filtre les stopwords français
        3. On filtre la ponctuation
        4. On filtre les tokens trop courts (1 caractère)
        5. On retourne la liste des lemmes utiles

    Args:
        texte_nettoye : texte déjà nettoyé par _nettoyer_texte().

    Returns:
        Liste de lemmes filtrés. Ex: ["ingénieur", "intelligence", "artificiel"]
    """
    if not texte_nettoye:
        return []

    nlp = _get_modele_spacy()

    # spaCy analyse le texte complet — doc est un objet itérable de tokens
    doc = nlp(texte_nettoye)

    lemmes_filtres = []

    for token in doc:
        # On ignore les stopwords ("le", "de", "un", "dans"...)
        if token.is_stop:
            continue

        # On ignore la ponctuation (".", ",", "-"...)
        if token.is_punct:
            continue

        # On ignore les espaces
        if token.is_space:
            continue

        # On ignore les tokens trop courts (lettres isolées sans sens)
        if len(token.lemma_) <= 1:
            continue

        # token.lemma_ : la forme lemmatisée du mot
        lemmes_filtres.append(token.lemma_.lower())

    return lemmes_filtres


# ──────────────────────────────────────────────────────────────────────────────
# Fonction publique principale (utilisée par le pipeline NLP)
# ──────────────────────────────────────────────────────────────────────────────

def preprocesser_texte(texte_brut: str) -> dict:
    """
    Fonction principale du module.
    Prend le texte brut d'un CV et retourne un dictionnaire avec :
        - le texte nettoyé (pour affichage / debug)
        - la liste des tokens lemmatisés (pour NER et matching compétences)

    Cette fonction est appelée par nlp_pipeline.py après cv_extractor.py.

    Args:
        texte_brut : texte brut extrait du CV (sortie de cv_extractor.py).

    Returns:
        Dictionnaire avec deux clés :
            {
                "texte_nettoye" : str,        # texte nettoyé
                "tokens"        : list[str],  # lemmes filtrés
            }

    Raises:
        ValueError : si le texte brut est vide ou None.

    Exemple:
        >>> resultat = preprocesser_texte("Jean DUPONT - Ingénieur en IA")
        >>> resultat["texte_nettoye"]
        "jean dupont ingénieur en ia"
        >>> resultat["tokens"]
        ["jean", "dupont", "ingénieur"]
    """
    if not texte_brut or not texte_brut.strip():
        raise ValueError(
            "Le texte brut est vide. "
            "Vérifie que cv_extractor.py a bien extrait le texte du CV."
        )

    # Étape 1 : nettoyage
    texte_nettoye = _nettoyer_texte(texte_brut)

    # Étape 2 : lemmatisation + filtrage
    tokens = _lemmatiser_et_filtrer(texte_nettoye)

    return {
        "texte_nettoye": texte_nettoye,
        "tokens": tokens,
    }
