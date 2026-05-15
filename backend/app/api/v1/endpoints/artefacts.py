"""
Covasant Continuum — Artefact API Endpoints
CRUD, upload, search, and tenant-isolated access.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.models import Artefact, ArtefactProject, User, UserRole, Visibility, PublishStatus
from app.schemas.schemas import (
    ArtefactCreate, ArtefactUpdate, ArtefactResponse, ArtefactListResponse, MessageResponse,
)

router = APIRouter(prefix="/artefacts", tags=["Artefacts"])


def _apply_tenant_filter(query, user: User):
    """Apply tenant isolation — customers only see their own project-scoped content."""
    if user.role in (UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.INTERNAL):
        return query  # Full access
    # Customer: only published + (internal visibility OR linked to their tenant projects)
    query = query.where(Artefact.status == PublishStatus.PUBLISHED)
    query = query.where(
        (Artefact.visibility == Visibility.CUSTOMER) | (Artefact.visibility == Visibility.INTERNAL)
    )
    if user.tenant_id:
        query = query.outerjoin(ArtefactProject).where(
            (ArtefactProject.project_id.is_(None)) |  # Public artefacts
            (ArtefactProject.project_id.in_(
                select(ArtefactProject.project_id).where(ArtefactProject.artefact_id == Artefact.id)
            ))
        )
    return query


@router.get("/", response_model=ArtefactListResponse)
async def list_artefacts(
    product_id: UUID | None = None,
    artefact_type: str | None = None,
    visibility: str | None = None,
    version: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List artefacts with filters and tenant isolation."""
    query = select(Artefact).where(Artefact.is_deleted == False)
    query = _apply_tenant_filter(query, current_user)

    if product_id:
        query = query.where(Artefact.product_id == product_id)
    if artefact_type:
        query = query.where(Artefact.artefact_type == artefact_type)
    if visibility:
        query = query.where(Artefact.visibility == visibility)
    if version:
        query = query.where(Artefact.version == version)
    if search:
        query = query.where(
            Artefact.title.ilike(f"%{search}%") | Artefact.description.ilike(f"%{search}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.order_by(Artefact.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = [ArtefactResponse.model_validate(a) for a in result.scalars().all()]

    return ArtefactListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{artefact_id}", response_model=ArtefactResponse)
async def get_artefact(
    artefact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single artefact by ID."""
    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")

    # Increment view count
    artefact.view_count += 1
    await db.flush()

    return ArtefactResponse.model_validate(artefact)


@router.post("/", response_model=ArtefactResponse, status_code=status.HTTP_201_CREATED)
async def create_artefact(
    data: ArtefactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new artefact (Admin/Super Admin only)."""
    metadata = {}
    if data.sprint:
        metadata["sprint"] = data.sprint
    if data.release:
        metadata["release"] = data.release

    artefact = Artefact(
        product_id=data.product_id,
        title=data.title,
        description=data.description,
        artefact_type=data.artefact_type,
        visibility=data.visibility,
        status=data.status,
        version=data.version,
        tags=data.tags,
        uploaded_by=current_user.id,
        video_url=data.video_url,
        metadata_=metadata,
    )
    db.add(artefact)
    await db.flush()

    # Link to projects
    for pid in data.project_ids:
        db.add(ArtefactProject(artefact_id=artefact.id, project_id=pid))

    await db.flush()
    return ArtefactResponse.model_validate(artefact)


@router.patch("/{artefact_id}", response_model=ArtefactResponse)
async def update_artefact(
    artefact_id: UUID,
    data: ArtefactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an artefact (Admin/Super Admin only)."""
    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")

    update_data = data.model_dump(exclude_unset=True)
    
    if "sprint" in update_data or "release" in update_data:
        metadata = dict(artefact.metadata_ or {})
        if "sprint" in update_data:
            metadata["sprint"] = update_data.pop("sprint")
        if "release" in update_data:
            metadata["release"] = update_data.pop("release")
        artefact.metadata_ = metadata

    for field, value in update_data.items():
        setattr(artefact, field, value)

    await db.flush()
    return ArtefactResponse.model_validate(artefact)


@router.delete("/{artefact_id}", response_model=MessageResponse)
async def delete_artefact(
    artefact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete an artefact and remove its file from SharePoint (Admin/Super Admin only)."""
    from datetime import datetime, timezone
    from app.services.storage_service import storage_service

    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")

    # Delete the actual file from SharePoint
    if artefact.file_path:
        try:
            await storage_service.delete_file(artefact.file_path)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to delete file from SharePoint: {e}")

    artefact.is_deleted = True
    artefact.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Artefact deleted successfully")


@router.get("/{artefact_id}/download-url")
async def get_artefact_download_url(
    artefact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a direct pre-authenticated URL to the file in SharePoint."""
    from app.services.storage_service import storage_service

    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    if not artefact.file_path:
        raise HTTPException(status_code=404, detail="No file attached to this artefact")

    download_url = await storage_service.get_download_url(artefact.file_path)
    return {"url": download_url}


@router.get("/{artefact_id}/download")
async def download_artefact(
    artefact_id: UUID,
    inline: bool = False,
    redirect: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an artefact file from SharePoint (all authenticated users).

    Query params:
        inline:   If true, sets Content-Disposition to 'inline'.
        redirect: If true, returns a 302 redirect to a pre-authed SharePoint URL
                  instead of proxying the bytes through this server.
    """
    from fastapi.responses import Response, RedirectResponse
    from app.services.storage_service import storage_service

    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    if not artefact.file_path:
        raise HTTPException(status_code=404, detail="No file attached to this artefact")

    # Increment download count
    artefact.download_count += 1
    await db.flush()

    if redirect:
        # Return a short-lived pre-authenticated URL directly
        download_url = await storage_service.get_download_url(artefact.file_path)
        return RedirectResponse(url=download_url, status_code=302)

    # Stream the file content through our API
    try:
        content = await storage_service.get_file_content(artefact.file_path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in SharePoint")

    disposition = "inline" if inline else "attachment"
    filename = artefact.file_name or "download"

    return Response(
        content=content,
        media_type=artefact.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"',
            "Content-Length": str(len(content)),
        },
    )
