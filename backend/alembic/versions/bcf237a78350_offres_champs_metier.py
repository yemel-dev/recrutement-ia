"""offres : champs metier (entreprise, localisation, contrat, salaire...)

Revision ID: bcf237a78350
Revises: 24e5db411f94
Create Date: 2026-07-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bcf237a78350'
down_revision: Union[str, None] = '24e5db411f94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('job_offers', sa.Column('entreprise', sa.String(length=255), nullable=True))
    op.add_column('job_offers', sa.Column('localisation', sa.String(length=150), nullable=True))
    op.add_column('job_offers', sa.Column('type_contrat', sa.String(length=50), server_default='Temps plein', nullable=True))
    op.add_column('job_offers', sa.Column('niveau_experience', sa.String(length=50), server_default='Intermediaire', nullable=True))
    op.add_column('job_offers', sa.Column('mode_travail', sa.String(length=50), server_default='Hybride', nullable=True))
    op.add_column('job_offers', sa.Column('salaire_min', sa.Integer(), nullable=True))
    op.add_column('job_offers', sa.Column('salaire_max', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('job_offers', 'salaire_max')
    op.drop_column('job_offers', 'salaire_min')
    op.drop_column('job_offers', 'mode_travail')
    op.drop_column('job_offers', 'niveau_experience')
    op.drop_column('job_offers', 'type_contrat')
    op.drop_column('job_offers', 'localisation')
    op.drop_column('job_offers', 'entreprise')