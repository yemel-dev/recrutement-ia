from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    candidat  = "candidat"
    recruteur = "recruteur"
    admin     = "admin"


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(100), nullable=False)
    prenom          = Column(String(100), nullable=False)
    email           = Column(String(255), unique=True, index=True, nullable=False)

    # Nullable : un compte créé via Google n'a jamais de mot de passe local.
    # Voir auth_service.py pour la logique qui gère ce cas à la connexion.
    hashed_password = Column(String(255), nullable=True)

    # Identifiant unique Google (le "sub" du jeton) — rempli uniquement pour
    # les comptes créés/liés via "Continuer avec Google". Permet de retrouver
    # rapidement un utilisateur sans dépendre uniquement de l'email.
    google_id       = Column(String(255), unique=True, nullable=True, index=True)

    role            = Column(Enum(UserRole), default=UserRole.candidat, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Profil enrichi (édition libre par l'utilisateur) ─────────────────────
    photo_url       = Column(String(500), nullable=True)
    telephone       = Column(String(30),  nullable=True)
    localisation    = Column(String(150), nullable=True)
    bio             = Column(String(1000), nullable=True)
    linkedin_url    = Column(String(255), nullable=True)
    github_url      = Column(String(255), nullable=True)
    portfolio_url   = Column(String(255), nullable=True)

    # Relations
    applications     = relationship("Application", back_populates="candidat")
    job_offers       = relationship("JobOffer", back_populates="recruteur")
    personality_test = relationship("PersonalityTest", back_populates="candidat", uselist=False)

    def __repr__(self):
        return f"<User {self.prenom} {self.nom} ({self.role})>"