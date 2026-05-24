from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PersonalityTest(Base):
    __tablename__ = "personality_tests"

    id = Column(Integer, primary_key=True, index=True)

    # Clé étrangère vers le candidat
    candidat_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Les 5 dimensions OCEAN (scores entre 0.0 et 1.0)
    score_O = Column(Float, nullable=False)  # Ouverture à l'expérience
    score_C = Column(Float, nullable=False)  # Conscience / Rigueur
    score_E = Column(Float, nullable=False)  # Extraversion
    score_A = Column(Float, nullable=False)  # Agréabilité
    score_N = Column(Float, nullable=False)  # Névrosisme / Stabilité émotionnelle

    # Réponses brutes aux 25 questions (JSON)
    reponses_brutes = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relation
    candidat = relationship("User", back_populates="personality_test")

    def __repr__(self):
        return (
            f"<PersonalityTest candidat={self.candidat_id} "
            f"O={self.score_O:.2f} C={self.score_C:.2f} "
            f"E={self.score_E:.2f} A={self.score_A:.2f} N={self.score_N:.2f}>"
        )