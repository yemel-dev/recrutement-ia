"""
ner_extractor.py
----------------
Membre 2 - NLP/IA | Recrutement Intelligent | Université de Dschang 2024-2025

Rôle : Extraire les entités nommées importantes d'un CV.
       - Organisations (entreprises, universités)
       - Dates (années d'expérience)
       - Diplômes (niveau de formation)
       - Lieux (villes, pays)

C'est la troisième étape du pipeline NLP.
Elle reçoit le texte nettoyé de preprocessor.py et produit les champs
'experience_annees' et 'formation_niveau' attendus par le scoring du Membre 1.

Dépendances :
    - spacy + fr_core_news_lg : NER automatique (ORG, DATE, LOC)
    - re                      : détection des diplômes par patterns
"""

import re
import spacy
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# Référence du modèle spaCy (réutilisé depuis preprocessor si déjà chargé)
# ──────────────────────────────────────────────────────────────────────────────

_nlp_model: Optional[spacy.language.Language] = None


def _get_modele_spacy() -> spacy.language.Language:
    """Charge le modèle spaCy une seule fois (même logique que preprocessor)."""
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
# Constantes : patterns de détection des diplômes
# ──────────────────────────────────────────────────────────────────────────────

# Dictionnaire de correspondance diplôme → score (même table que le scoring)
# Source : scoring_service.py du Membre 1
DIPLOMES_SCORES = {
    "doctorat": 1.0,
    "phd":      1.0,
    "master":   0.9,
    "m2":       0.9,
    "m1":       0.8,
    "mba":      0.9,
    "ingenieur": 0.9,
    "ingénieur": 0.9,
    "licence":  0.6,
    "bachelor": 0.6,
    "bts":      0.5,
    "dut":      0.5,
    "bac":      0.4,
}

# Patterns regex pour détecter les diplômes dans le texte
# On cherche ces mots même s'ils sont suivis d'autres mots
PATTERNS_DIPLOMES = [
    r"\bdoctorat\b", r"\bphd\b", r"\bph\.d\b",
    r"\bmaster\b", r"\bm2\b", r"\bm1\b", r"\bmba\b",
    r"\bingenieur\b", r"\bingénieur\b",
    r"\blicence\b", r"\bbachelor\b",
    r"\bbts\b", r"\bdut\b",
    r"\bbac\b",
]


# ──────────────────────────────────────────────────────────────────────────────
# Fonctions privées
# ──────────────────────────────────────────────────────────────────────────────

def _extraire_entites_spacy(texte: str) -> dict:
    """
    Utilise spaCy pour détecter les entités nommées standard.

    Les types d'entités détectées par fr_core_news_lg :
        - ORG  : organisations (entreprises, universités, associations)
        - DATE : expressions de dates ("2020", "janvier 2019", "3 ans")
        - LOC  : lieux (villes, pays, régions)
        - PER  : personnes (nom du candidat généralement)

    Args:
        texte : texte brut ou nettoyé du CV.

    Returns:
        Dictionnaire avec listes d'entités par type :
        {
            "organisations" : ["Google", "Université de Dschang"],
            "dates"         : ["2020", "3 ans", "janvier 2024"],
            "lieux"         : ["Yaoundé", "Cameroun"],
            "personnes"     : ["Jean Dupont"],
        }
    """
    if not texte or not texte.strip():
        return {"organisations": [], "dates": [], "lieux": [], "personnes": []}

    nlp = _get_modele_spacy()
    doc = nlp(texte)

    organisations = []
    dates = []
    lieux = []
    personnes = []

    for entite in doc.ents:
        # entite.text  : le texte de l'entité ("Google", "2020"...)
        # entite.label_: le type de l'entité ("ORG", "DATE"...)
        texte_entite = entite.text.strip()

        if entite.label_ == "ORG" and texte_entite:
            organisations.append(texte_entite)

        elif entite.label_ == "DATE" and texte_entite:
            dates.append(texte_entite)

        elif entite.label_ in ("LOC", "GPE") and texte_entite:
            lieux.append(texte_entite)

        elif entite.label_ == "PER" and texte_entite:
            personnes.append(texte_entite)

    return {
        "organisations": organisations,
        "dates":         dates,
        "lieux":         lieux,
        "personnes":     personnes,
    }


def _extraire_annees_experience(texte: str, dates_spacy: list[str]) -> float:
    """
    Estime le nombre d'années d'expérience à partir du texte du CV.

    Stratégie en 2 passes :
        1. Cherche des patterns explicites : "3 ans d'expérience", "5 années"
        2. Compte les années distinctes dans les dates détectées par spaCy

    Args:
        texte        : texte brut du CV (en minuscules de préférence).
        dates_spacy  : liste de dates détectées par spaCy.

    Returns:
        Nombre d'années d'expérience estimé (float).
        Retourne 0.0 si aucune information trouvée.

    Exemples:
        "5 ans d'expérience en Python"  → 5.0
        "3 années dans le domaine NLP"  → 3.0
        dates: ["2019", "2020", "2022"] → 3.0 (3 années distinctes)
    """
    texte_lower = texte.lower()

    # ── Passe 1 : patterns explicites "X ans" ou "X années" ──
    patterns_experience = [
        r"(\d+)\s*ans?\s+d[e']exp[ée]rience",
        r"(\d+)\s*années?\s+d[e']exp[ée]rience",
        r"(\d+)\s*ans?\s+d[e']expertise",
        r"exp[ée]rience\s+de\s+(\d+)\s*ans?",
        r"(\d+)\s*ans?\s+en\s+\w+",
        r"(\d+)\s*années?\s+en\s+\w+",
    ]

    for pattern in patterns_experience:
        correspondance = re.search(pattern, texte_lower)
        if correspondance:
            annees = float(correspondance.group(1))
            # On plafonne à 50 ans pour éviter les faux positifs
            if 0 < annees <= 50:
                return annees

    # ── Passe 1.5 : plages de dates explicites dans le texte lui-même ──
    # Beaucoup de CV n'écrivent jamais "X ans d'expérience" : ils listent un
    # historique de postes avec des dates ("2019 - 2022", "2020 à 2023",
    # "Depuis 2021"). On les détecte directement dans le texte brut, sans
    # dépendre uniquement de la qualité du NER spaCy sur ce type de mise en
    # forme (peu fiable sur des CV en liste à puces).
    annee_courante = 2026
    plages = re.findall(r"\b(19[7-9]\d|20[0-2]\d)\s*(?:-|–|—|à|to)\s*(19[7-9]\d|20[0-2]\d)\b", texte_lower)
    depuis = re.findall(r"depuis\s+(19[7-9]\d|20[0-2]\d)", texte_lower)

    annees_trouvees_texte = set()
    for debut, fin in plages:
        annees_trouvees_texte.update({int(debut), int(fin)})
    for annee in depuis:
        annees_trouvees_texte.update({int(annee), annee_courante})

    if annees_trouvees_texte:
        experience = max(annees_trouvees_texte) - min(annees_trouvees_texte)
        if experience > 0:
            return float(experience)

    # ── Passe 2 : compter les années distinctes dans les dates spaCy ──
    annees_trouvees = set()

    for date in dates_spacy:
        # Cherche un nombre à 4 chiffres ressemblant à une année (1970-2030)
        correspondances = re.findall(r"\b(19[7-9]\d|20[0-2]\d)\b", date)
        for annee in correspondances:
            annees_trouvees.add(int(annee))

    if annees_trouvees:
        # Nombre d'années = différence entre la plus récente et la plus ancienne
        experience = max(annees_trouvees) - min(annees_trouvees)
        return float(experience) if experience > 0 else 1.0

    return 0.0


def _extraire_formation(texte: str) -> dict:
    """
    Détecte le niveau de formation le plus élevé mentionné dans le CV.

    Utilise des patterns regex sur le texte (en minuscules) pour identifier
    les diplômes. Retourne le diplôme le plus élevé selon la table DIPLOMES_SCORES.

    Args:
        texte : texte brut du CV.

    Returns:
        Dictionnaire :
        {
            "niveau"  : str,   # ex: "master", "licence", "bac"
            "score"   : float, # ex: 0.9, 0.6, 0.4
        }
        Retourne {"niveau": "inconnu", "score": 0.3} si rien trouvé.
    """
    texte_lower = texte.lower()

    # On collecte tous les diplômes trouvés avec leurs scores
    diplomes_trouves = []

    for pattern in PATTERNS_DIPLOMES:
        if re.search(pattern, texte_lower):
            # Extraire le nom du diplôme depuis le pattern (enlever \b)
            nom_diplome = pattern.replace(r"\b", "").replace("\\b", "")
            # Trouver le score correspondant
            for cle, score in DIPLOMES_SCORES.items():
                if cle in nom_diplome or nom_diplome in cle:
                    diplomes_trouves.append({
                        "niveau": cle,
                        "score": score
                    })
                    break

    if not diplomes_trouves:
        return {"niveau": "inconnu", "score": 0.3}

    # Retourner le diplôme avec le score le plus élevé
    meilleur_diplome = max(diplomes_trouves, key=lambda x: x["score"])
    return meilleur_diplome


# ──────────────────────────────────────────────────────────────────────────────
# Fonction publique principale
# ──────────────────────────────────────────────────────────────────────────────

def extraire_entites_cv(texte_brut: str) -> dict:
    """
    Fonction principale du module.
    Extrait toutes les entités nommées importantes d'un CV.

    Cette fonction est appelée par nlp_pipeline.py après preprocessor.py.
    Elle produit les champs attendus par le scoring du Membre 1 :
        - experience_annees  → utilisé par Score_Experience
        - formation_niveau   → utilisé par Score_Formation

    Args:
        texte_brut : texte brut extrait du CV (sortie de cv_extractor.py).

    Returns:
        Dictionnaire complet des entités extraites :
        {
            "organisations"    : list[str],  # entreprises, universités
            "dates"            : list[str],  # dates détectées
            "lieux"            : list[str],  # villes, pays
            "personnes"        : list[str],  # nom du candidat
            "experience_annees": float,      # ← pour scoring Membre 1
            "formation_niveau" : str,        # ← pour scoring Membre 1
            "formation_score"  : float,      # score de formation (0.0-1.0)
        }

    Raises:
        ValueError : si le texte est vide ou None.
    """
    if not texte_brut or not texte_brut.strip():
        raise ValueError(
            "Le texte brut est vide. "
            "Vérifie que cv_extractor.py a bien extrait le texte du CV."
        )

    # Étape 1 : entités spaCy (ORG, DATE, LOC, PER)
    entites = _extraire_entites_spacy(texte_brut)

    # Étape 2 : années d'expérience
    experience_annees = _extraire_annees_experience(
        texte_brut,
        entites["dates"]
    )

    # Étape 3 : niveau de formation
    formation = _extraire_formation(texte_brut)

    return {
        "organisations":     entites["organisations"],
        "dates":             entites["dates"],
        "lieux":             entites["lieux"],
        "personnes":         entites["personnes"],
        "experience_annees": experience_annees,
        "formation_niveau":  formation["niveau"],
        "formation_score":   formation["score"],
    }