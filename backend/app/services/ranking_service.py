"""
Membre 2
ranking_service.py — Orchestration du scoring final et du classement

Rôle : d'après le PDF du projet (étape 5 du workflow), le score global
d'un candidat ne peut être calculé que lorsque DEUX conditions sont réunies :
    1. Son CV a été analysé par le pipeline NLP (Membre 2)
    2. Il a passé le test de personnalité Big Five

Ces deux événements arrivent de façon indépendante et asynchrone :
    - L'analyse NLP se termine en tâche de fond après l'upload du CV
    - Le test Big Five est soumis quand le candidat veut

Donc CHAQUE fois que l'un des deux événements se termine, ce module vérifie
si l'autre est déjà prêt. Si oui → on calcule le score. Si non → on attend.

C'est pourquoi tenter_calculer_score() est appelée à deux endroits différents
dans le projet :
    - à la fin de l'analyse NLP en arrière-plan (routers/applications.py)
    - juste après la soumission du test Big Five (routers/personality.py)
"""
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.job_offer import JobOffer
from app.models.ranking import Ranking
from app.schemas.schemas import ScoringInput
from app.services.scoring_service import scorer_candidat
import json


# ─── Pont de vocabulaire : diplômes détectés (Membre 2) → barème du chef ──────
#
# Le pipeline NLP (ner_extractor.py) détecte des diplômes précis :
#     doctorat, phd, master, m1, m2, mba, ingenieur, licence, bachelor, bts, dut, bac
# Le barème de scoring (scoring_service.py) ne connaît que 5 catégories :
#     DOCTORAT, MASTER, LICENCE, BTS, AUTRE
#
# Sans cette conversion, un diplôme comme "ingenieur" ou "mba" (niveau Bac+5,
# équivalent Master) retomberait sur le score par défaut le plus bas ("AUTRE"
# = 0.25) au lieu du score attendu (~0.85) — une perte de précision silencieuse.
#
# Convention retenue (à ajuster en équipe si désaccord) : Ingénieur et MBA sont
# traités comme équivalents à un Master (Bac+5). DUT est traité comme un BTS
# (Bac+2). Un Bac seul ou un diplôme non reconnu tombe dans "AUTRE".
_MAPPING_FORMATION_VERS_BAREME_CHEF = {
    "doctorat": "DOCTORAT", "phd": "DOCTORAT",
    "master": "MASTER", "m1": "MASTER", "m2": "MASTER",
    "mba": "MASTER", "ingenieur": "MASTER", "ingénieur": "MASTER",
    "licence": "LICENCE", "bachelor": "LICENCE",
    "bts": "BTS", "dut": "BTS",
}


def _normaliser_formation(niveau_brut: str) -> str:
    """Convertit le diplôme détecté par le NLP vers une des 5 catégories du barème du chef."""
    return _MAPPING_FORMATION_VERS_BAREME_CHEF.get((niveau_brut or "").lower().strip(), "AUTRE")


def tenter_calculer_score(db: Session, application: Application) -> bool:
    """
    Calcule le score global d'une candidature SI les deux conditions
    (NLP terminé + test Big Five passé) sont réunies.

    Retourne True si le score a été calculé, False si on doit encore attendre.
    """
    # Condition 1 : le NLP a-t-il fini ? (competences_extraites est rempli après analyse)
    if application.competences_extraites is None:
        return False

    # Condition 2 : le candidat a-t-il passé le test Big Five ?
    test_personnalite = application.candidat.personality_test
    if test_personnalite is None:
        return False

    offre = application.offre

    donnees_scoring = ScoringInput(
        competences_cv=json.loads(application.competences_extraites),
        experience_annees=application.experience_annees or 0.0,
        formation_niveau=_normaliser_formation(application.formation_niveau),
        score_O=test_personnalite.score_O,
        score_C=test_personnalite.score_C,
        score_E=test_personnalite.score_E,
        score_A=test_personnalite.score_A,
        score_N=test_personnalite.score_N,
        competences_requises=json.loads(offre.competences_requises),
        experience_requise=offre.experience_requise,
        ocean_ideal={
            "O": offre.ocean_O, "C": offre.ocean_C, "E": offre.ocean_E,
            "A": offre.ocean_A, "N": offre.ocean_N,
        },
        poids={
            "competences": offre.poids_competences,
            "experience": offre.poids_experience,
            "formation": offre.poids_formation,
            "personnalite": offre.poids_personnalite,
        },
    )

    resultat = scorer_candidat(donnees_scoring)

    application.score_competences = resultat.score_competences
    application.score_experience = resultat.score_experience
    application.score_formation = resultat.score_formation
    application.score_personnalite = resultat.score_personnalite
    application.score_global = resultat.score_global
    application.statut = ApplicationStatus.analyse

    db.commit()

    _recalculer_classement(db, offre.id)
    return True


def _recalculer_classement(db: Session, offre_id: int) -> None:
    """
    Recalcule entièrement le classement (table Ranking) d'une offre :
    on repart de zéro et on reconstruit l'ordre des candidats scorés,
    du meilleur score_global au moins bon.
    """
    candidatures_scorees = (
        db.query(Application)
        .filter(Application.offre_id == offre_id, Application.score_global.isnot(None))
        .order_by(Application.score_global.desc())
        .all()
    )

    # On supprime l'ancien classement pour cette offre avant de le reconstruire
    db.query(Ranking).filter(Ranking.offre_id == offre_id).delete()

    for position, candidature in enumerate(candidatures_scorees, start=1):
        db.add(Ranking(
            offre_id=offre_id,
            application_id=candidature.id,
            position=position,
            score_global=candidature.score_global,
            score_competences=candidature.score_competences,
            score_experience=candidature.score_experience,
            score_formation=candidature.score_formation,
            score_personnalite=candidature.score_personnalite,
        ))

    db.commit()
