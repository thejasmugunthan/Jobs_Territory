"""Add experience and currency fields to alerts."""

import sqlalchemy as sa
from alembic import op

revision = "0007_job_alert_preferences"
down_revision = "0006_recommendations_alerts_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "job_alerts", sa.Column("experience_level", sa.String(40), nullable=True)
    )
    op.add_column(
        "job_alerts", sa.Column("salary_currency", sa.String(3), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("job_alerts", "salary_currency")
    op.drop_column("job_alerts", "experience_level")
