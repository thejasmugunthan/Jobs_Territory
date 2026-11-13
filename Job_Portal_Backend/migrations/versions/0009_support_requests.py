"""Persist authenticated candidate support requests."""

from alembic import op
import sqlalchemy as sa

revision = "0009_support_requests"
down_revision = "0008_candidate_salary_currency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "support_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_id", sa.Uuid(), nullable=False),
        sa.Column("subject", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="received", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_support_requests_candidate_created",
        "support_requests",
        ["candidate_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_support_requests_candidate_created", table_name="support_requests"
    )
    op.drop_table("support_requests")
