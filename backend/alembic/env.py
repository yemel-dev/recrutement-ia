"""
alembic/env.py — Configuration d'exécution des migrations.

Personnalisé pour ce projet :
- L'URL de la base vient de app.config.settings (donc de ton .env), pas d'une
  valeur en dur dans alembic.ini.
- target_metadata pointe vers app.database.Base, et on importe explicitement
  tous les modèles pour qu'ils soient bien enregistrés dans les metadata
  avant qu'`--autogenerate` ne compare l'état de la base à celui du code.
"""
import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Permet d'importer le package "app" depuis ce fichier
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import Base

# Import explicite de TOUS les modèles — indispensable pour que
# `--autogenerate` les détecte. Un modèle jamais importé nulle part n'est
# jamais enregistré dans Base.metadata, et Alembic ne verrait aucune de ses
# colonnes/tables, même si le fichier du modèle existe bien dans le projet.
from app.models.user import User
from app.models.job_offer import JobOffer
from app.models.application import Application
from app.models.personality_test import PersonalityTest
from app.models.ranking import Ranking

# Objet de config Alembic, donne accès aux valeurs de alembic.ini
config = context.config

# Interprète le fichier de config pour le logging Python
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Injecte l'URL réelle de la base (depuis ton .env) à la place de la valeur
# vide laissée dans alembic.ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Metadata cible utilisée par --autogenerate pour comparer base ↔ modèles
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Génère le SQL des migrations sans se connecter réellement à la base."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Applique les migrations avec une vraie connexion à la base (cas normal)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()