"""
--Membre 2
big_five_service.py — Calcul des scores OCEAN à partir des réponses brutes

Rôle de ce module (une seule responsabilité, comme cv_extractor.py pour le NLP) :
    ENTRÉE  : les 25 réponses brutes du candidat, ex. {"q1": 4, "q2": 2, ...}
    SORTIE  : les 5 scores normalisés O, C, E, A, N (chacun entre 0.0 et 1.0)

C'est exactement ce qu'attend le schéma ScoringInput écrit par le chef de
projet (score_O, score_C, score_E, score_A, score_N), qui alimentera plus
tard l'algorithme de scoring multicritère (services/scoring_service.py).

Rappel du principe de calcul :
    1. Pour chaque dimension (O, C, E, A, N), on a 5 questions.
    2. Pour chaque question :
        - si elle est "directe" → on garde la note telle quelle (1 à 5)
        - si elle est "inversée" → on inverse la note : 6 - note
          (une note de 5 sur une question inversée devient 1, etc.)
    3. On additionne les 5 notes (déjà inversées si besoin) → un total
       entre 5 (minimum) et 25 (maximum) par dimension.
    4. On normalise ce total sur une échelle de 0.0 à 1.0 :
           score = (total - 5) / (25 - 5)
       Exemple : total = 15 → score = (15-5)/20 = 0.5 (score moyen)
"""

from app.services.psych.questions import (
    QUESTIONS,
    DIMENSIONS,
    QUESTIONS_PAR_DIMENSION,
    LIKERT_MIN,
    LIKERT_MAX,
)


class ReponsesInvalidesError(ValueError):
    """Levée quand les réponses fournies par le candidat sont incomplètes
    ou hors de l'échelle autorisée (1 à 5)."""
    pass


def obtenir_questions() -> list[dict]:
    """
    Retourne la liste des 25 questions, prête à être envoyée au frontend
    (sans le champ "reverse" ni "dimension", que le candidat n'a pas
    besoin de voir).
    """
    return [{"id": q["id"], "texte": q["texte"]} for q in QUESTIONS]


def _valider_reponses(reponses: dict) -> None:
    """
    Vérifie que les réponses sont exploitables avant tout calcul.

    Règles :
        - il doit y avoir exactement une réponse par question (25 au total)
        - chaque valeur doit être un entier entre LIKERT_MIN (1) et LIKERT_MAX (5)
    """
    ids_attendus = {q["id"] for q in QUESTIONS}
    ids_recus = set(reponses.keys())

    manquants = ids_attendus - ids_recus
    if manquants:
        raise ReponsesInvalidesError(
            f"Réponses manquantes pour : {sorted(manquants)}"
        )

    inconnus = ids_recus - ids_attendus
    if inconnus:
        raise ReponsesInvalidesError(
            f"Identifiants de question inconnus : {sorted(inconnus)}"
        )

    for question_id, valeur in reponses.items():
        if not isinstance(valeur, int) or isinstance(valeur, bool):
            raise ReponsesInvalidesError(
                f"La réponse à '{question_id}' doit être un entier, reçu : {valeur!r}"
            )
        if not (LIKERT_MIN <= valeur <= LIKERT_MAX):
            raise ReponsesInvalidesError(
                f"La réponse à '{question_id}' doit être entre {LIKERT_MIN} "
                f"et {LIKERT_MAX}, reçu : {valeur}"
            )


def calculer_scores_ocean(reponses: dict) -> dict:
    """
    Transforme les 25 réponses brutes en 5 scores OCEAN normalisés.

    Args:
        reponses: dict du type {"q1": 4, "q2": 2, ..., "q25": 3}

    Returns:
        dict du type {"O": 0.65, "C": 0.80, "E": 0.40, "A": 0.55, "N": 0.30}

    Raises:
        ReponsesInvalidesError: si les réponses sont incomplètes ou invalides
    """
    _valider_reponses(reponses)

    # Regrouper les questions par dimension pour ne parcourir la liste qu'une fois
    questions_par_dimension = {dim: [] for dim in DIMENSIONS}
    for question in QUESTIONS:
        questions_par_dimension[question["dimension"]].append(question)

    scores = {}
    total_min = QUESTIONS_PAR_DIMENSION * LIKERT_MIN  # 5
    total_max = QUESTIONS_PAR_DIMENSION * LIKERT_MAX  # 25

    for dimension in DIMENSIONS:
        total_dimension = 0
        for question in questions_par_dimension[dimension]:
            valeur_brute = reponses[question["id"]]
            if question["reverse"]:
                valeur_ajustee = (LIKERT_MAX + LIKERT_MIN) - valeur_brute  # 6 - valeur
            else:
                valeur_ajustee = valeur_brute
            total_dimension += valeur_ajustee

        score_normalise = (total_dimension - total_min) / (total_max - total_min)
        scores[dimension] = round(score_normalise, 4)

    return scores
