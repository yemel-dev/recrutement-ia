from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Ranking(Base):
    __tablename__ = "rankings"

    id = Column(Integer, primary_key=True, index=True)

    # Clés étrangères
    offre_id = Column(Integer, ForeignKey("job_offers.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True)

    # Position dans le classement
    position = Column(Integer, nullable=False)

    # Scores détaillés pour affichage dans le dashboard
    score_global = Column(Float, nullable=False)
    score_competences = Column(Float, nullable=False)
    score_experience = Column(Float, nullable=False)
    score_formation = Column(Float, nullable=False)
    score_personnalite = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    offre = relationship("JobOffer", back_populates="rankings")
    application = relationship("Application", back_populates="ranking")

    def __repr__(self):
        return f"<Ranking position={self.position} score={self.score_global:.2f} offre={self.offre_id}>"