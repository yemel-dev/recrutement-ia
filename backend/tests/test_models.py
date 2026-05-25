"""
Tests unitaires pour les modèles de base de données.
Lance avec : pytest tests/test_models.py -v
"""
import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, UserRole, JobOffer, Application, ApplicationStatus, PersonalityTest, Ranking


# ─── Configuration base de données de test ───────────────────────────────────
# On utilise une BDD SQLite en mémoire pour les tests (indépendante de la vraie)
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Crée une session de test propre pour chaque test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


# ─── Données de test réutilisables ───────────────────────────────────────────
def make_candidat(db):
    candidat = User(
        nom="Kamga",
        prenom="Jean",
        email="jean.kamga@univ-dschang.cm",
        hashed_password="hashed_password_test",
        role=UserRole.candidat
    )
    db.add(candidat)
    db.commit()
    db.refresh(candidat)
    return candidat


def make_recruteur(db):
    recruteur = User(
        nom="Fopa",
        prenom="Marie",
        email="marie.fopa@entreprise.cm",
        hashed_password="hashed_password_test",
        role=UserRole.recruteur
    )
    db.add(recruteur)
    db.commit()
    db.refresh(recruteur)
    return recruteur


def make_offre(db, recruteur):
    offre = JobOffer(
        titre="Ingénieur IA",
        description="Développement de modèles NLP pour l'analyse de données textuelles.",
        competences_requises=json.dumps(["Python", "spaCy", "TensorFlow", "SQL"]),
        experience_requise=2,
        ocean_O=0.8,
        ocean_C=0.7,
        ocean_E=0.5,
        ocean_A=0.6,
        ocean_N=0.3,
        poids_competences=0.40,
        poids_experience=0.25,
        poids_formation=0.20,
        poids_personnalite=0.15,
        recruteur_id=recruteur.id
    )
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre


# ─── Tests User ──────────────────────────────────────────────────────────────
class TestUser:

    def test_creer_candidat(self, db):
        """Vérifie qu'on peut créer un candidat en base."""
        candidat = make_candidat(db)
        assert candidat.id is not None
        assert candidat.nom == "Kamga"
        assert candidat.prenom == "Jean"
        assert candidat.role == UserRole.candidat
        assert candidat.is_active is True

    def test_creer_recruteur(self, db):
        """Vérifie qu'on peut créer un recruteur en base."""
        recruteur = make_recruteur(db)
        assert recruteur.id is not None
        assert recruteur.role == UserRole.recruteur

    def test_email_unique(self, db):
        """Vérifie que deux utilisateurs ne peuvent pas avoir le même email."""
        make_candidat(db)
        doublon = User(
            nom="Autre",
            prenom="Personne",
            email="jean.kamga@univ-dschang.cm",  # même email
            hashed_password="autre_password",
            role=UserRole.candidat
        )
        db.add(doublon)
        with pytest.raises(Exception):
            db.commit()

    def test_role_par_defaut(self, db):
        """Vérifie que le rôle par défaut est candidat."""
        user = User(
            nom="Test",
            prenom="User",
            email="test@test.cm",
            hashed_password="pwd"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.role == UserRole.candidat


# ─── Tests JobOffer ───────────────────────────────────────────────────────────
class TestJobOffer:

    def test_creer_offre(self, db):
        """Vérifie qu'on peut créer une offre d'emploi."""
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)
        assert offre.id is not None
        assert offre.titre == "Ingénieur IA"
        assert offre.experience_requise == 2
        assert offre.recruteur_id == recruteur.id

    def test_profil_ocean_offre(self, db):
        """Vérifie que le profil OCEAN idéal est bien enregistré."""
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)
        assert offre.ocean_O == 0.8
        assert offre.ocean_C == 0.7
        assert offre.ocean_E == 0.5
        assert offre.ocean_A == 0.6
        assert offre.ocean_N == 0.3

    def test_poids_scoring_somme(self, db):
        """Vérifie que les poids de scoring totalisent bien 1.0."""
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)
        total = (
            offre.poids_competences +
            offre.poids_experience +
            offre.poids_formation +
            offre.poids_personnalite
        )
        assert round(total, 2) == 1.0, f"Les poids doivent totaliser 1.0, got {total}"

    def test_relation_recruteur_offres(self, db):
        """Vérifie la relation entre recruteur et ses offres."""
        recruteur = make_recruteur(db)
        make_offre(db, recruteur)
        make_offre(db, recruteur)
        db.refresh(recruteur)
        assert len(recruteur.job_offers) == 2


# ─── Tests Application ────────────────────────────────────────────────────────
class TestApplication:

    def test_creer_application(self, db):
        """Vérifie qu'on peut créer une candidature."""
        candidat = make_candidat(db)
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)

        application = Application(
            candidat_id=candidat.id,
            offre_id=offre.id,
            cv_filename="cv_jean_kamga.pdf",
            cv_path="/uploads/cv_jean_kamga.pdf"
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        assert application.id is not None
        assert application.statut == ApplicationStatus.en_attente
        assert application.score_global is None  # pas encore scoré

    def test_mise_a_jour_scores(self, db):
        """Vérifie qu'on peut mettre à jour les scores après analyse NLP."""
        candidat = make_candidat(db)
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)

        application = Application(
            candidat_id=candidat.id,
            offre_id=offre.id,
            cv_filename="cv_test.pdf",
            cv_path="/uploads/cv_test.pdf"
        )
        db.add(application)
        db.commit()

        # Simulation de l'analyse NLP (Membre 2) + scoring (Membre 1)
        application.score_competences = 0.85
        application.score_experience = 0.70
        application.score_formation = 0.90
        application.score_personnalite = 0.75
        application.score_global = (
            0.85 * offre.poids_competences +
            0.70 * offre.poids_experience +
            0.90 * offre.poids_formation +
            0.75 * offre.poids_personnalite
        )
        application.statut = ApplicationStatus.analyse
        db.commit()
        db.refresh(application)

        assert application.score_global is not None
        assert 0.0 <= application.score_global <= 1.0
        assert application.statut == ApplicationStatus.analyse


# ─── Tests PersonalityTest ────────────────────────────────────────────────────
class TestPersonalityTest:

    def test_creer_test_personnalite(self, db):
        """Vérifie qu'on peut enregistrer les scores OCEAN d'un candidat."""
        candidat = make_candidat(db)

        reponses = {f"q{i}": 3 for i in range(1, 26)}  # 25 réponses simulées

        test = PersonalityTest(
            candidat_id=candidat.id,
            score_O=0.78,
            score_C=0.65,
            score_E=0.55,
            score_A=0.80,
            score_N=0.30,
            reponses_brutes=json.dumps(reponses)
        )
        db.add(test)
        db.commit()
        db.refresh(test)

        assert test.id is not None
        assert test.score_O == 0.78
        assert test.score_C == 0.65

    def test_scores_ocean_entre_0_et_1(self, db):
        """Vérifie que tous les scores OCEAN sont entre 0 et 1."""
        candidat = make_candidat(db)
        test = PersonalityTest(
            candidat_id=candidat.id,
            score_O=0.78,
            score_C=0.65,
            score_E=0.55,
            score_A=0.80,
            score_N=0.30,
            reponses_brutes=json.dumps({})
        )
        db.add(test)
        db.commit()
        db.refresh(test)

        for score in [test.score_O, test.score_C, test.score_E, test.score_A, test.score_N]:
            assert 0.0 <= score <= 1.0, f"Score OCEAN hors limite : {score}"

    def test_un_seul_test_par_candidat(self, db):
        """Vérifie qu'un candidat ne peut passer le test qu'une seule fois."""
        candidat = make_candidat(db)

        test1 = PersonalityTest(
            candidat_id=candidat.id,
            score_O=0.7, score_C=0.6, score_E=0.5,
            score_A=0.8, score_N=0.3,
            reponses_brutes=json.dumps({})
        )
        db.add(test1)
        db.commit()

        test2 = PersonalityTest(
            candidat_id=candidat.id,  # même candidat
            score_O=0.9, score_C=0.4, score_E=0.6,
            score_A=0.7, score_N=0.5,
            reponses_brutes=json.dumps({})
        )
        db.add(test2)
        with pytest.raises(Exception):
            db.commit()


# ─── Tests Ranking ────────────────────────────────────────────────────────────
class TestRanking:

    def test_creer_classement(self, db):
        """Vérifie qu'on peut créer un classement."""
        candidat = make_candidat(db)
        recruteur = make_recruteur(db)
        offre = make_offre(db, recruteur)

        application = Application(
            candidat_id=candidat.id,
            offre_id=offre.id,
            cv_filename="cv_test.pdf",
            cv_path="/uploads/cv_test.pdf",
            score_global=0.82
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        ranking = Ranking(
            offre_id=offre.id,
            application_id=application.id,
            position=1,
            score_global=0.82,
            score_competences=0.85,
            score_experience=0.70,
            score_formation=0.90,
            score_personnalite=0.75
        )
        db.add(ranking)
        db.commit()
        db.refresh(ranking)

        assert ranking.id is not None
        assert ranking.position == 1
        assert ranking.score_global == 0.82