"""
Covasant Continuum — File Upload Endpoint
Handles file uploads with storage abstraction and artefact linking.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import require_admin
from app.models.models import Artefact, ArtefactVersion, Product, User
from app.schemas.schemas import ArtefactResponse, MessageResponse
from app.services.storage_service import storage_service
from app.services.notification_service import notify_all_users

router = APIRouter(prefix="/upload", tags=["File Upload"])


@router.post("/", response_model=ArtefactResponse)
async def upload_file(
    file: UploadFile = File(None),
    title: str = Form(...),
    product_id: UUID = Form(...),
    artefact_type: str = Form(...),
    visibility: str = Form("internal"),
    status: str = Form("published"),
    version: str = Form(None),
    description: str = Form(None),
    video_url: str = Form(None),
    sprint: str = Form(None),
    release: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload a file and/or video URL to create an artefact record."""
    try:
        file_info = None
        if file and file.filename:
            try:
                file_info = await storage_service.save_upload(file, title=title, subfolder=artefact_type)
            except ValueError as e:
                raise HTTPException(status_code=413, detail=str(e))
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"SharePoint upload failed: {str(e)}")

        if not file_info and not video_url:
            raise HTTPException(status_code=400, detail="Please provide a file or video URL")
            
        meta_dict = {}
        if sprint: meta_dict["sprint"] = sprint
        if release: meta_dict["release"] = release

        artefact = Artefact(
            product_id=product_id,
            title=title,
            description=description or "Uploaded via Continuum Admin.",
            artefact_type=artefact_type,
            visibility=visibility,
            status=status,
            version=version,
            uploaded_by=current_user.id,
            file_name=file_info["file_name"] if file_info else None,
            file_path=file_info["file_path"] if file_info else None,
            file_size=file_info["file_size"] if file_info else None,
            mime_type=file_info["mime_type"] if file_info else None,
            video_url=video_url,
            metadata_=meta_dict,
        )
        db.add(artefact)
        await db.flush()

        # Create initial version record only if a file was uploaded
        if file_info:
            v1 = ArtefactVersion(
                artefact_id=artefact.id,
                version_number=1,
                file_name=file_info["file_name"],
                file_path=file_info["file_path"],
                file_size=file_info["file_size"],
                mime_type=file_info["mime_type"],
                changelog="Initial upload",
                uploaded_by=current_user.id,
            )
            db.add(v1)
            await db.flush()

        # Broadcast notification to all users
        # Look up product name for a descriptive message
        prod_result = await db.execute(select(Product).where(Product.id == product_id))
        product = prod_result.scalar_one_or_none()
        product_name = product.name if product else "Unknown"
        await notify_all_users(
            db,
            title=f"A new {artefact_type} uploaded in {product_name}",
            body=f'"{title}" has been added to {product_name}.',
            type="upload",
            link=str(product_id),
            metadata={"artefact_id": str(artefact.id), "artefact_type": artefact_type},
            exclude_user_id=current_user.id,
        )
        await db.flush()

        return ArtefactResponse.model_validate(artefact)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database or server error: {str(e)}")


@router.post("/{artefact_id}/version", response_model=MessageResponse)
async def upload_new_version(
    artefact_id: UUID,
    file: UploadFile = File(...),
    changelog: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload a new version of an existing artefact."""
    result = await db.execute(
        select(Artefact).where(Artefact.id == artefact_id, Artefact.is_deleted == False)
    )
    artefact = result.scalar_one_or_none()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")

    try:
        file_info = await storage_service.save_upload(file, subfolder=artefact.artefact_type.value if hasattr(artefact.artefact_type, 'value') else str(artefact.artefact_type))
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))

    # Get next version number
    from sqlalchemy import func
    max_ver = await db.execute(
        select(func.max(ArtefactVersion.version_number)).where(
            ArtefactVersion.artefact_id == artefact_id
        )
    )
    next_ver = (max_ver.scalar() or 0) + 1

    version = ArtefactVersion(
        artefact_id=artefact_id,
        version_number=next_ver,
        file_name=file_info["file_name"],
        file_path=file_info["file_path"],
        file_size=file_info["file_size"],
        mime_type=file_info["mime_type"],
        changelog=changelog,
        uploaded_by=current_user.id,
    )
    db.add(version)

    # Update artefact with latest file
    artefact.file_name = file_info["file_name"]
    artefact.file_path = file_info["file_path"]
    artefact.file_size = file_info["file_size"]
    artefact.mime_type = file_info["mime_type"]
    await db.flush()

    return MessageResponse(message=f"Version {next_ver} uploaded successfully")
