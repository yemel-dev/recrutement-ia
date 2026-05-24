from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ApplicationStatus(str, enum.Enum):
    en_attente = "en_attente"
    analyse = "analyse"
    accepte = "accepte"
    rejete = "rejete"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    # Clés étrangères
    candidat_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    offre_id = Column(Integer, ForeignKey("job_offers.id"), nullable=False)

    # Fichier CV
    cv_filename = Column(String(255), nullable=False)
    cv_path = Column(String(500), nullable=False)

    # Résultats de l'analyse NLP (remplis par le Membre 2)
    competences_extraites = Column(Text, default=None)   # JSON : liste des compétences détectées
    experience_annees = Column(Float, default=0.0)        # Années d'expérience calculées
    formation_niveau = Column(String(100), default=None)  # ex: "Master", "Licence", "Doctorat"
    entites_nommees = Column(Text, default=None)          # JSON : organisations, lieux détectés

    # Scores calculés par l'algorithme de scoring (Membre 1)
    score_competences = Column(Float, default=None)   # 0.0 à 1.0
    score_experience = Column(Float, default=None)    # 0.0 à 1.0
    score_formation = Column(Float, default=None)     # 0.0 à 1.0
    score_personnalite = Column(Float, default=None)  # 0.0 à 1.0
    score_global = Column(Float, default=None)        # Score final pondéré

    statut = Column(Enum(ApplicationStatus), default=ApplicationStatus.en_attente)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    candidat = relationship("User", back_populates="applications")
    offre = relationship("JobOffer", back_populates="applications")
    ranking = relationship("Ranking", back_populates="application", uselist=False)

    def __repr__(self):
        return f"<Application candidat={self.candidat_id} offre={self.offre_id} score={self.score_global}>"