"""
Membre 2
Router Personality — Endpoints du test de personnalité Big Five (OCEAN)

    GET  /personality-tests/questions  → renvoie les 25 questions au frontend
    POST /personality-tests            → le candidat soumet ses réponses,
                                          on calcule et on enregistre ses scores O/C/E/A/N
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.personality_test import PersonalityTest
from app.models.application import Application
from app.schemas.schemas import PersonalityTestCreate, PersonalityTestResponse
from app.services.psych.big_five_service import (
    calculer_scores_ocean,
    obtenir_questions,
    ReponsesInvalidesError,
)
from app.services.ranking_service import tenter_calculer_score
from app.routers.auth import get_current_user

router = APIRouter(prefix="/personality-tests", tags=["Test de personnalité (Big Five)"])


# ─── GET /personality-tests/questions ────────────────────────────────────────

@router.get("/questions")
def get_questions(current_user: User = Depends(get_current_user)):
    """
    Retourne les 25 questions du test Big Five, à afficher côté frontend.
    Nécessite d'être connecté (candidat ou recruteur peuvent consulter).
    """
    return {"questions": obtenir_questions()}


# ─── POST /personality-tests ──────────────────────────────────────────────────

@router.post("", response_model=PersonalityTestResponse, status_code=status.HTTP_201_CREATED)
def soumettre_test(
    data: PersonalityTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Le candidat soumet ses 25 réponses.

    Étapes :
        1. Seul un candidat peut passer le test (pas un recruteur)
        2. Un candidat ne peut passer le test qu'une seule fois
        3. On calcule les scores O/C/E/A/N via big_five_service
        4. On enregistre le résultat en base
    """
    if current_user.role != UserRole.candidat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un candidat peut passer le test de personnalité",
        )

    test_existant = (
        db.query(PersonalityTest)
        .filter(PersonalityTest.candidat_id == current_user.id)
        .first()
    )
    if test_existant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous avez déjà passé le test de personnalité",
        )

    try:
        scores = calculer_scores_ocean(data.reponses)
    except ReponsesInvalidesError as erreur:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(erreur),
        )

    import json

    nouveau_test = PersonalityTest(
        candidat_id=current_user.id,
        score_O=scores["O"],
        score_C=scores["C"],
        score_E=scores["E"],
        score_A=scores["A"],
        score_N=scores["N"],
        reponses_brutes=json.dumps(data.reponses),
    )
    db.add(nouveau_test)
    db.commit()
    db.refresh(nouveau_test)

    # Le test Big Five est l'une des deux conditions nécessaires au scoring
    # (l'autre étant l'analyse NLP du CV). On vérifie donc si, pour chacune
    # des candidatures déjà déposées par ce candidat, le score peut maintenant
    # être calculé (cas où le CV avait déjà été analysé avant le test).
    candidatures_du_candidat = (
        db.query(Application)
        .filter(Application.candidat_id == current_user.id)
        .all()
    )
    for candidature in candidatures_du_candidat:
        tenter_calculer_score(db, candidature)

    return nouveau_test
