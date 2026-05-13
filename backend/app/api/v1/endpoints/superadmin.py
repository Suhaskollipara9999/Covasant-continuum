"""
Covasant Continuum — Super Admin API
AI Provider management, tenant management, platform configuration.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import require_superadmin, require_admin
from app.models.models import AIProviderConfig, Tenant, User, UserRole
from app.schemas.schemas import (
    AIProviderUpdate, AIProviderResponse, TenantCreate, TenantUpdate, TenantResponse,
    UserResponse, MessageResponse,
)

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])


# ── AI Provider Management ──

@router.get("/ai-providers", response_model=list[AIProviderResponse])
async def list_ai_providers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """List all AI provider configurations."""
    result = await db.execute(select(AIProviderConfig).order_by(AIProviderConfig.provider))
    return [AIProviderResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/ai-providers", response_model=AIProviderResponse)
async def upsert_ai_provider(
    data: AIProviderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Create or update an AI provider configuration."""
    result = await db.execute(
        select(AIProviderConfig).where(AIProviderConfig.provider == data.provider)
    )
    provider = result.scalar_one_or_none()

    if provider:
        if data.api_key:
            provider.api_key_encrypted = data.api_key  # In production, encrypt this
        if data.default_model:
            provider.default_model = data.default_model
        provider.is_active = data.is_active
    else:
        provider = AIProviderConfig(
            provider=data.provider,
            api_key_encrypted=data.api_key,
            default_model=data.default_model,
            is_active=data.is_active,
        )
        db.add(provider)

    await db.flush()
    return AIProviderResponse.model_validate(provider)


@router.delete("/ai-providers/{provider_id}", response_model=MessageResponse)
async def delete_ai_provider(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Remove an AI provider configuration."""
    result = await db.execute(select(AIProviderConfig).where(AIProviderConfig.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    await db.delete(provider)
    await db.flush()
    return MessageResponse(message=f"Provider {provider.provider} removed")


# ── Tenant Management ──

@router.get("/tenants", response_model=list[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all tenants."""
    result = await db.execute(select(Tenant).where(Tenant.is_deleted == False).order_by(Tenant.name))
    return [TenantResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new tenant."""
    existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tenant slug already exists")

    tenant = Tenant(name=data.name, slug=data.slug, domain=data.domain, settings={"allowed_products": [str(pid) for pid in data.allowed_products]})
    db.add(tenant)
    await db.flush()
    return TenantResponse.model_validate(tenant)


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an existing tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.is_deleted == False))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    if data.name is not None:
        tenant.name = data.name
    if data.slug is not None:
        existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug, Tenant.id != tenant_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Tenant slug already exists")
        tenant.slug = data.slug
    if data.domain is not None:
        tenant.domain = data.domain
    if data.allowed_products is not None:
        new_settings = dict(tenant.settings) if tenant.settings else {}
        new_settings["allowed_products"] = [str(pid) for pid in data.allowed_products]
        tenant.settings = new_settings

    await db.flush()
    return TenantResponse.model_validate(tenant)


@router.delete("/tenants/{tenant_id}", response_model=MessageResponse)
async def delete_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a tenant."""
    from datetime import datetime, timezone
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.is_deleted == False))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_deleted = True
    tenant.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message=f"Tenant {tenant.name} deleted")


# ── Admin User Management ──

@router.get("/admins", response_model=list[UserResponse])
async def list_admins(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """List all admin and super admin users."""
    result = await db.execute(
        select(User).where(
            User.role.in_([UserRole.ADMIN, UserRole.SUPERADMIN]),
            User.is_deleted == False,
        ).order_by(User.created_at)
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/admins/{user_id}/promote", response_model=UserResponse)
async def promote_to_admin(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Promote a user to Admin role."""
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = UserRole.ADMIN
    await db.flush()
    return UserResponse.model_validate(user)


@router.patch("/admins/{user_id}/demote", response_model=UserResponse)
async def demote_admin(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Demote an admin back to internal user."""
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot demote a Super Admin")
    user.role = UserRole.INTERNAL
    await db.flush()
    return UserResponse.model_validate(user)


# ── Platform Settings ──

DEFAULTS = [
    ("ai_chat_enabled", "true", "Enable AI chat for all users"),
    ("customer_self_registration", "true", "Allow customer self-registration"),
    ("file_versioning", "true", "Enable file versioning"),
    ("auto_index_documents", "false", "Auto-index uploaded documents"),
    ("push_notifications", "false", "Enable push notifications"),
    ("active_ai_provider", "openai", "Active AI Provider"),
    ("active_ai_model", "gpt-4o", "Active AI Model"),
]


@router.get("/platform-settings")
async def list_platform_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """List all platform settings, seeding defaults if empty."""
    from app.models.models import PlatformSetting

    result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
    settings = result.scalars().all()
    existing_keys = {s.key for s in settings}

    added = False
    for key, value, label in DEFAULTS:
        if key not in existing_keys:
            s = PlatformSetting(key=key, value=value, label=label)
            db.add(s)
            added = True
            
    if added:
        await db.flush()
        result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
        settings = result.scalars().all()

    return [{"id": str(s.id), "key": s.key, "value": s.value, "label": s.label} for s in settings]


@router.patch("/platform-settings/{key}")
async def update_platform_setting(
    key: str,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Toggle a platform setting."""
    from app.models.models import PlatformSetting

    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting.value = str(request.get("value", setting.value)).lower()
    await db.flush()
    return {"key": setting.key, "value": setting.value, "label": setting.label}
