"""
Covasant Continuum — Products API Endpoints
CRUD for products (Admin/Super Admin can create/update/delete, all can read).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.models import Product, Artefact, User
from app.schemas.schemas import ProductCreate, ProductResponse, MessageResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/")
async def list_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active products with artefact counts."""
    result = await db.execute(
        select(Product).where(Product.is_deleted == False, Product.is_active == True)
        .order_by(Product.name)
    )
    products = result.scalars().all()

    items = []
    for p in products:
        # Count artefacts for this product
        count_q = select(func.count()).select_from(Artefact).where(
            Artefact.product_id == p.id, Artefact.is_deleted == False
        )
        count = (await db.execute(count_q)).scalar() or 0

        items.append({
            "id": str(p.id),
            "name": p.name,
            "full_name": p.full_name,
            "description": p.description,
            "color": p.color,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "artefact_count": count,
        })

    return {"items": items, "total": len(items)}


@router.get("/{product_id}")
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single product by ID."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Count artefacts
    count_q = select(func.count()).select_from(Artefact).where(
        Artefact.product_id == product.id, Artefact.is_deleted == False
    )
    count = (await db.execute(count_q)).scalar() or 0

    return {
        "id": str(product.id),
        "name": product.name,
        "full_name": product.full_name,
        "description": product.description,
        "color": product.color,
        "is_active": product.is_active,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "artefact_count": count,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new product (Admin/Super Admin only)."""
    # Check if a product with this name already exists (including soft-deleted)
    result = await db.execute(select(Product).where(Product.name == data.name))
    existing_product = result.scalar_one_or_none()

    if existing_product:
        if not existing_product.is_deleted:
            raise HTTPException(status_code=400, detail="A product with this name already exists")
        
        # If it was soft-deleted, "undelete" it and update its details
        existing_product.is_deleted = False
        existing_product.full_name = data.full_name
        existing_product.description = data.description
        existing_product.color = data.color
        product = existing_product
    else:
        # Create a brand new product
        product = Product(
            name=data.name,
            full_name=data.full_name,
            description=data.description,
            color=data.color,
        )
        db.add(product)
        
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a product (Admin/Super Admin only)."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = data.name
    product.full_name = data.full_name
    product.description = data.description
    product.color = data.color
    await db.commit()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete a product (Admin/Super Admin only)."""
    from datetime import datetime, timezone
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_deleted = True
    product.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return MessageResponse(message="Product deleted successfully")
