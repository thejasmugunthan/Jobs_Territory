"""Record salary preference currency for safe recommendation comparisons."""

import sqlalchemy as sa
from alembic import op

revision = "0008_candidate_salary_currency"
down_revision = "0007_job_alert_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "candidate_preferences",
        sa.Column("salary_currency", sa.String(3), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidate_preferences", "salary_currency")
