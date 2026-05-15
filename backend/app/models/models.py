"""
Covasant Continuum — SQLAlchemy ORM Models
Multi-tenant, audit-ready, soft-delete enabled schema.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text,
    UniqueConstraint, Index, event,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base


# ── Enums ──
import enum

class UserRole(str, enum.Enum):
    INTERNAL = "internal"
    CUSTOMER = "customer"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class ArtefactType(str, enum.Enum):
    RELEASE_NOTES = "release-notes"
    VIDEO = "video"
    GUIDE = "guide"
    DOCUMENTATION = "documentation"
    NEWSLETTER = "newsletter"
    API_SPEC = "api-spec"

class Visibility(str, enum.Enum):
    INTERNAL = "internal"
    CUSTOMER = "customer"

class PublishStatus(str, enum.Enum):
    PUBLISHED = "published"
    REVIEW = "review"
    DRAFT = "draft"


# ── Mixins ──
class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


# ══════════════════════════════════════════
# TENANT
# ══════════════════════════════════════════
class Tenant(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    domain = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    settings = Column(JSONB, default=dict)

    # Relationships
    users = relationship("User", back_populates="tenant", lazy="selectin")
    projects = relationship("Project", back_populates="tenant", lazy="selectin")


# ══════════════════════════════════════════
# PROJECT (tenant-scoped content grouping)
# ══════════════════════════════════════════
class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)  # e.g. "CAMS-AcmeCorp"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="projects")
    artefact_projects = relationship("ArtefactProject", back_populates="project")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_project_tenant_code"),
    )


# ══════════════════════════════════════════
# USER
# ══════════════════════════════════════════
class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=True)  # null for OAuth-only users
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.INTERNAL)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # OAuth
    oauth_provider = Column(String(50), nullable=True)  # google, microsoft
    oauth_id = Column(String(255), nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    uploaded_artefacts = relationship("Artefact", back_populates="uploaded_by_user", foreign_keys="Artefact.uploaded_by")
    chat_sessions = relationship("ChatSession", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_tenant_role", "tenant_id", "role"),
    )


# ══════════════════════════════════════════
# INVITE
# ══════════════════════════════════════════
class Invite(Base, TimestampMixin):
    __tablename__ = "invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), nullable=False, index=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.INTERNAL)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)


# ══════════════════════════════════════════
# PRODUCT
# ══════════════════════════════════════════
class Product(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default="#2563EB")
    icon_code = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    settings = Column(JSONB, default=dict)

    # Relationships
    artefacts = relationship("Artefact", back_populates="product")


# ══════════════════════════════════════════
# ARTEFACT (document, video, guide, etc.)
# ══════════════════════════════════════════
class Artefact(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "artefacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    artefact_type = Column(String(100), nullable=False, index=True)
    visibility = Column(Enum(Visibility), nullable=False, default=Visibility.INTERNAL)
    status = Column(Enum(PublishStatus), nullable=False, default=PublishStatus.DRAFT)
    version = Column(String(50), nullable=True)
    tags = Column(ARRAY(String), default=list)
    metadata_ = Column("metadata", JSONB, default=dict)

    @property
    def sprint(self) -> str | None:
        return self.metadata_.get("sprint") if self.metadata_ else None

    @property
    def release(self) -> str | None:
        return self.metadata_.get("release") if self.metadata_ else None

    # File info
    file_name = Column(String(500), nullable=True)
    file_path = Column(String(1000), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    video_url = Column(String(1000), nullable=True)

    # Audit
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)

    # Relationships
    product = relationship("Product", back_populates="artefacts")
    uploaded_by_user = relationship("User", back_populates="uploaded_artefacts", foreign_keys=[uploaded_by])
    versions = relationship("ArtefactVersion", back_populates="artefact", order_by="ArtefactVersion.version_number.desc()")
    artefact_projects = relationship("ArtefactProject", back_populates="artefact")

    __table_args__ = (
        Index("ix_artefacts_product_type", "product_id", "artefact_type"),
        Index("ix_artefacts_visibility", "visibility"),
        Index("ix_artefacts_status", "status"),
    )


# ══════════════════════════════════════════
# ARTEFACT ↔ PROJECT (many-to-many)
# ══════════════════════════════════════════
class ArtefactProject(Base):
    __tablename__ = "artefact_projects"

    artefact_id = Column(UUID(as_uuid=True), ForeignKey("artefacts.id"), primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), primary_key=True)

    artefact = relationship("Artefact", back_populates="artefact_projects")
    project = relationship("Project", back_populates="artefact_projects")


# ══════════════════════════════════════════
# ARTEFACT VERSION (file versioning)
# ══════════════════════════════════════════
class ArtefactVersion(Base, TimestampMixin):
    __tablename__ = "artefact_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artefact_id = Column(UUID(as_uuid=True), ForeignKey("artefacts.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=True)
    changelog = Column(Text, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    artefact = relationship("Artefact", back_populates="versions")

    __table_args__ = (
        UniqueConstraint("artefact_id", "version_number", name="uq_artefact_version"),
    )


# ══════════════════════════════════════════
# CHAT SESSION + MESSAGES
# ══════════════════════════════════════════
class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    ai_provider = Column(String(50), nullable=True)
    ai_model = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)

    session = relationship("ChatSession", back_populates="messages")


# ══════════════════════════════════════════
# AI PROVIDER CONFIG (Super Admin managed)
# ══════════════════════════════════════════
class AIProviderConfig(Base, TimestampMixin):
    __tablename__ = "ai_provider_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(50), nullable=False, unique=True)  # openai, anthropic, gemini
    api_key_encrypted = Column(Text, nullable=True)
    default_model = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    settings = Column(JSONB, default=dict)


# ══════════════════════════════════════════
# ACCESS LOG (analytics)
# ══════════════════════════════════════════
class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    artefact_id = Column(UUID(as_uuid=True), ForeignKey("artefacts.id"), nullable=True)
    action = Column(String(50), nullable=False)  # view, download, upload, publish
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    __table_args__ = (
        Index("ix_access_logs_user_action", "user_id", "action"),
        Index("ix_access_logs_created", "created_at"),
    )


# ══════════════════════════════════════════
# NOTIFICATION
# ══════════════════════════════════════════
class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)  # upload, approval, permission, system
    is_read = Column(Boolean, default=False, nullable=False)
    link = Column(String(500), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)

    user = relationship("User", back_populates="notifications")


# ══════════════════════════════════════════
# PLATFORM SETTING
# ══════════════════════════════════════════
class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(String(500), nullable=False, default="false")
    label = Column(String(255), nullable=True)
