"""
Algorithme de Scoring Multicritère — Membre 1 (Chef de projet)
===============================================================
Formule globale :
    Score_Global = poids_competences  * score_competences
                 + poids_experience   * score_experience
                 + poids_formation    * score_formation
                 + poids_personnalite * score_personnalite
"""

from app.schemas.schemas import ScoringInput, ScoringOutput


# ─── Niveaux de formation et leur valeur numérique ───────────────────────────
NIVEAUX_FORMATION = {
    "DOCTORAT": 1.00,
    "MASTER":   0.85,
    "LICENCE":  0.65,
    "BTS":      0.45,
    "AUTRE":    0.25,
}


# ─── 1. Score Compétences ─────────────────────────────────────────────────────

def calculer_score_competences(
    competences_cv: list[str],
    competences_requises: list[str]
) -> tuple[float, dict]:
    """
    Compare les compétences du CV avec celles requises par l'offre.

    Méthode : Jaccard simplifié (insensible à la casse)
    - Normalise tout en minuscules
    - Compte les compétences en commun
    - Divise par le nombre de compétences requises

    Retourne : (score entre 0.0 et 1.0, détail du calcul)
    """
    if not competences_requises:
        return 0.0, {"erreur": "Aucune compétence requise définie"}

    cv_set = {c.lower().strip() for c in competences_cv}
    requises_set = {c.lower().strip() for c in competences_requises}

    correspondances = cv_set & requises_set
    manquantes = requises_set - cv_set
    score = len(correspondances) / len(requises_set)

    return round(score, 4), {
        "competences_trouvees": list(correspondances),
        "competences_manquantes": list(manquantes),
        "nb_requises": len(requises_set),
        "nb_trouvees": len(correspondances),
    }


# ─── 2. Score Expérience ──────────────────────────────────────────────────────

def calculer_score_experience(
    experience_annees: float,
    experience_requise: int
) -> tuple[float, dict]:
    """
    Compare les années d'expérience du candidat avec l'exigence de l'offre.

    Règles :
    - Si expérience requise = 0 → score = 1.0 (pas d'exigence)
    - Si expérience >= requise → score = 1.0 (plafond)
    - Si expérience < requise  → score proportionnel
    - Bonus de 10% si expérience > requise (plafonné à 1.0)

    Retourne : (score entre 0.0 et 1.0, détail du calcul)
    """
    if experience_requise == 0:
        return 1.0, {"message": "Aucune expérience requise"}

    if experience_annees >= experience_requise:
        # Bonus si expérience dépasse le minimum
        bonus = min(0.10, (experience_annees - experience_requise) * 0.02)
        score = min(1.0, 1.0 + bonus)
    else:
        score = experience_annees / experience_requise

    return round(score, 4), {
        "experience_candidat": experience_annees,
        "experience_requise": experience_requise,
        "ecart": experience_annees - experience_requise,
    }


# ─── 3. Score Formation ───────────────────────────────────────────────────────

def calculer_score_formation(formation_niveau: str) -> tuple[float, dict]:
    """
    Évalue le niveau de formation du candidat.

    Barème :
    - Doctorat → 1.00
    - Master   → 0.85
    - Licence  → 0.65
    - BTS      → 0.45
    - Autre    → 0.25

    Retourne : (score entre 0.0 et 1.0, détail du calcul)
    """
    formation_normalisee = formation_niveau.strip().upper()
    score = NIVEAUX_FORMATION.get(formation_normalisee, 0.25)

    return score, {
        "formation_detectee": formation_normalisee,
        "score_attribue": score,
        "bareme": NIVEAUX_FORMATION,
    }


# ─── 4. Score Personnalité OCEAN ──────────────────────────────────────────────

def calculer_score_personnalite(
    scores_candidat: dict,
    ocean_ideal: dict
) -> tuple[float, dict]:
    """
    Compare le profil OCEAN du candidat avec le profil idéal de l'offre.

    Méthode : Distance euclidienne normalisée sur 5 dimensions
    - Calcule la distance entre le candidat et le profil idéal
    - Distance maximale possible = sqrt(5) ≈ 2.236
    - Score = 1 - (distance / distance_max)

    Retourne : (score entre 0.0 et 1.0, détail du calcul)
    """
    import math

    dimensions = ["O", "C", "E", "A", "N"]
    distance_max = math.sqrt(5)  # Distance maximale possible

    ecarts = {}
    somme_carres = 0.0

    for dim in dimensions:
        candidat_val = scores_candidat.get(f"score_{dim}", 0.5)
        ideal_val = ocean_ideal.get(dim, 0.5)
        ecart = candidat_val - ideal_val
        ecarts[dim] = round(ecart, 4)
        somme_carres += ecart ** 2

    distance = math.sqrt(somme_carres)
    score = 1.0 - (distance / distance_max)

    return round(score, 4), {
        "distance_euclidienne": round(distance, 4),
        "distance_max": round(distance_max, 4),
        "ecarts_par_dimension": ecarts,
        "profil_candidat": {d: scores_candidat.get(f"score_{d}", 0.5) for d in dimensions},
        "profil_ideal": {d: ocean_ideal.get(d, 0.5) for d in dimensions},
    }


# ─── 5. Score Global ──────────────────────────────────────────────────────────

def calculer_score_global(
    score_competences: float,
    score_experience: float,
    score_formation: float,
    score_personnalite: float,
    poids: dict
) -> tuple[float, dict]:
    """
    Calcule le score global pondéré du candidat.

    Formule :
        Score_Global = poids_competences  * score_competences
                     + poids_experience   * score_experience
                     + poids_formation    * score_formation
                     + poids_personnalite * score_personnalite

    Retourne : (score global entre 0.0 et 1.0, détail du calcul)
    """
    p_comp = poids.get("competences", 0.40)
    p_exp  = poids.get("experience",  0.25)
    p_form = poids.get("formation",   0.20)
    p_pers = poids.get("personnalite", 0.15)

    score_global = (
        p_comp * score_competences +
        p_exp  * score_experience  +
        p_form * score_formation   +
        p_pers * score_personnalite
    )

    return round(score_global, 4), {
        "contributions": {
            "competences":  round(p_comp * score_competences, 4),
            "experience":   round(p_exp  * score_experience,  4),
            "formation":    round(p_form * score_formation,   4),
            "personnalite": round(p_pers * score_personnalite, 4),
        },
        "poids_utilises": poids,
    }


# ─── Fonction principale ──────────────────────────────────────────────────────

def scorer_candidat(data: ScoringInput) -> ScoringOutput:
    """
    Point d'entrée principal de l'algorithme de scoring.

    Reçoit un ScoringInput (données NLP + OCEAN + exigences offre)
    Retourne un ScoringOutput (tous les scores + détails)
    """
    # 1. Score compétences
    score_comp, detail_comp = calculer_score_competences(
        data.competences_cv,
        data.competences_requises
    )

    # 2. Score expérience
    score_exp, detail_exp = calculer_score_experience(
        data.experience_annees,
        data.experience_requise
    )

    # 3. Score formation
    score_form, detail_form = calculer_score_formation(
        data.formation_niveau
    )

    # 4. Score personnalité OCEAN
    scores_candidat = {
        "score_O": data.score_O,
        "score_C": data.score_C,
        "score_E": data.score_E,
        "score_A": data.score_A,
        "score_N": data.score_N,
    }
    score_pers, detail_pers = calculer_score_personnalite(
        scores_candidat,
        data.ocean_ideal
    )

    # 5. Score global pondéré
    score_global, detail_global = calculer_score_global(
        score_comp, score_exp, score_form, score_pers,
        data.poids
    )

    return ScoringOutput(
        score_competences=score_comp,
        score_experience=score_exp,
        score_formation=score_form,
        score_personnalite=score_pers,
        score_global=score_global,
        detail={
            "competences": detail_comp,
            "experience":  detail_exp,
            "formation":   detail_form,
            "personnalite": detail_pers,
            "global":      detail_global,
        }
    )