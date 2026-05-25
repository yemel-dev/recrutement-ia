from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class JobOffer(Base):
    __tablename__ = "job_offers"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    competences_requises = Column(Text, nullable=False)  # JSON stocké en texte
    experience_requise = Column(Integer, default=0)       # Années d'expérience

    # Profil OCEAN idéal (entre 0 et 1)
    ocean_O = Column(Float, default=0.5)  # Ouverture
    ocean_C = Column(Float, default=0.5)  # Conscience
    ocean_E = Column(Float, default=0.5)  # Extraversion
    ocean_A = Column(Float, default=0.5)  # Agréabilité
    ocean_N = Column(Float, default=0.5)  # Névrosisme

    # Poids de l'algorithme de scoring (doivent totaliser 1.0)
    poids_competences = Column(Float, default=0.40)
    poids_experience = Column(Float, default=0.25)
    poids_formation = Column(Float, default=0.20)
    poids_personnalite = Column(Float, default=0.15)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Clé étrangère vers le recruteur
    recruteur_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relations
    recruteur = relationship("User", back_populates="job_offers")
    applications = relationship("Application", back_populates="offre")
    rankings = relationship("Ranking", back_populates="offre")

    def __repr__(self):
        return f"<JobOffer {self.titre}>"