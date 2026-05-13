"""
Covasant Continuum — Search API Endpoint
Full-text search with fallback to PostgreSQL if Elasticsearch unavailable.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Artefact, Product

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def search_artefacts(
    q: str = Query("", description="Search query"),
    product: str | None = None,
    artefact_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search artefacts using PostgreSQL ILIKE (Elasticsearch fallback)."""
    query = select(Artefact).where(Artefact.is_deleted == False)

    # Apply role-based visibility
    if current_user.role.value == "customer":
        query = query.where(Artefact.visibility == "customer")

    # Text search
    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(
                Artefact.title.ilike(pattern),
                Artefact.description.ilike(pattern),
                Artefact.file_name.ilike(pattern),
            )
        )

    # Product filter
    if product:
        query = query.where(Artefact.product_id == product)

    # Type filter
    if artefact_type:
        query = query.where(Artefact.artefact_type == artefact_type)

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.order_by(Artefact.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    artefacts = result.scalars().all()

    # Also get product names
    items = []
    for a in artefacts:
        item = {
            "id": str(a.id),
            "title": a.title,
            "description": a.description,
            "artefact_type": a.artefact_type.value if a.artefact_type else None,
            "visibility": a.visibility.value if a.visibility else None,
            "file_name": a.file_name,
            "version": a.version,
            "view_count": a.view_count or 0,
            "download_count": a.download_count or 0,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "product_id": str(a.product_id) if a.product_id else None,
        }
        items.append(item)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/health")
async def search_health():
    """Health check."""
    return {"search": "postgresql-fallback", "status": "healthy"}
