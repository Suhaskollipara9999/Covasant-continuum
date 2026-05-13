"""
Covasant Continuum — Pydantic Schemas
Request/response validation for all API endpoints.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ══════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class RefreshRequest(BaseModel):
    refresh_token: str

class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "internal"
    tenant_id: UUID | None = None

class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


# ══════════════════════════════════════════
# USER
# ══════════════════════════════════════════
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: str
    tenant_id: UUID | None = None
    is_active: bool
    is_verified: bool
    avatar_url: str | None = None
    last_login: datetime | None = None
    created_at: datetime

class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    tenant_id: UUID | None = None


# ══════════════════════════════════════════
# TENANT
# ══════════════════════════════════════════
class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")
    domain: str | None = None
    allowed_products: list[UUID] = []

class TenantUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    slug: str | None = Field(None, min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")
    domain: str | None = None
    allowed_products: list[UUID] | None = None

class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    domain: str | None
    is_active: bool
    created_at: datetime


# ══════════════════════════════════════════
# PRODUCT
# ══════════════════════════════════════════
class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    color: str = "#2563EB"

class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    full_name: str
    description: str | None
    color: str
    is_active: bool
    created_at: datetime


# ══════════════════════════════════════════
# ARTEFACT
# ══════════════════════════════════════════
class ArtefactCreate(BaseModel):
    product_id: UUID
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    artefact_type: str
    visibility: str = "internal"
    status: str = "draft"
    version: str | None = None
    tags: list[str] = []
    project_ids: list[UUID] = []
    video_url: str | None = None
    sprint: str | None = None
    release: str | None = None

class ArtefactUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    visibility: str | None = None
    status: str | None = None
    version: str | None = None
    tags: list[str] | None = None
    video_url: str | None = None
    sprint: str | None = None
    release: str | None = None

class ArtefactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    title: str
    description: str | None
    artefact_type: str
    visibility: str
    status: str
    version: str | None
    tags: list[str]
    file_name: str | None
    file_size: int | None
    mime_type: str | None
    video_url: str | None
    sprint: str | None
    release: str | None
    view_count: int
    download_count: int
    uploaded_by: UUID
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime

class ArtefactListResponse(BaseModel):
    items: list[ArtefactResponse]
    total: int
    page: int
    page_size: int


# ══════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════
class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: UUID | None = None

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    role: str
    content: str
    created_at: datetime

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str | None
    ai_provider: str | None
    ai_model: str | None
    is_active: bool
    created_at: datetime
    messages: list[ChatMessageResponse] = []


# ══════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════
class DashboardStats(BaseModel):
    total_artefacts: int
    total_users: int
    total_chat_sessions: int
    total_downloads: int
    recent_activity: list[dict] = []

class AccessLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    artefact_id: UUID | None
    action: str
    created_at: datetime


# ══════════════════════════════════════════
# NOTIFICATION
# ══════════════════════════════════════════
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    body: str | None
    type: str
    is_read: bool
    link: str | None
    created_at: datetime


# ══════════════════════════════════════════
# AI PROVIDER
# ══════════════════════════════════════════
class AIProviderUpdate(BaseModel):
    provider: str
    api_key: str | None = None
    default_model: str | None = None
    is_active: bool = True

class AIProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: str
    default_model: str | None
    is_active: bool
    created_at: datetime


# ── Generic ──
class MessageResponse(BaseModel):
    message: str
    success: bool = True
