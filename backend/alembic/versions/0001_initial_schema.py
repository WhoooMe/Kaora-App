"""Initial KAORA relational schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-26 04:30:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("default_estate", sa.String(length=120), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "model_versions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("architecture", sa.String(length=64), nullable=False),
        sa.Column("version_tag", sa.String(length=64), nullable=False),
        sa.Column("checkpoint_path", sa.String(length=512), nullable=True),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "captured_images",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("storage_backend", sa.String(length=32), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("content_type", sa.String(length=64), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("input_source", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(op.f("ix_captured_images_sha256"), "captured_images", ["sha256"], unique=False)

    op.create_table(
        "detections",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("captured_image_id", sa.String(length=36), nullable=False),
        sa.Column("model_version_id", sa.String(length=36), nullable=True),
        sa.Column("block_name", sa.String(length=64), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("cocoa_probability", sa.Float(), nullable=True),
        sa.Column("maturity_class", sa.String(length=32), nullable=True),
        sa.Column("maturity_label_id", sa.String(length=32), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("probabilities", sa.JSON(), nullable=True),
        sa.Column("bbox", sa.JSON(), nullable=True),
        sa.Column("bbox_available", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["captured_image_id"], ["captured_images.id"]),
        sa.ForeignKeyConstraint(["model_version_id"], ["model_versions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_detections_captured_image_id"), "detections", ["captured_image_id"], unique=False)
    op.create_index(op.f("ix_detections_created_at"), "detections", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_detections_created_at"), table_name="detections")
    op.drop_index(op.f("ix_detections_captured_image_id"), table_name="detections")
    op.drop_table("detections")
    op.drop_index(op.f("ix_captured_images_sha256"), table_name="captured_images")
    op.drop_table("captured_images")
    op.drop_table("model_versions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
