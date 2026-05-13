"""
Covasant Continuum — Analytics API
Dashboard stats, access logs, and usage metrics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import require_admin
from app.models.models import Artefact, User, ChatSession, AccessLog, UserRole
from app.schemas.schemas import DashboardStats, AccessLogResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get admin dashboard statistics."""
    total_artefacts = (await db.execute(
        select(func.count()).select_from(Artefact).where(Artefact.is_deleted == False)
    )).scalar() or 0

    total_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_deleted == False)
    )).scalar() or 0

    total_sessions = (await db.execute(
        select(func.count()).select_from(ChatSession)
    )).scalar() or 0

    total_downloads = (await db.execute(
        select(func.sum(Artefact.download_count)).select_from(Artefact)
    )).scalar() or 0

    # Recent access logs
    logs_result = await db.execute(
        select(AccessLog).order_by(AccessLog.created_at.desc()).limit(10)
    )
    recent = [
        {"user_id": str(l.user_id), "action": l.action, "created_at": str(l.created_at)}
        for l in logs_result.scalars().all()
    ]

    return DashboardStats(
        total_artefacts=total_artefacts,
        total_users=total_users,
        total_chat_sessions=total_sessions,
        total_downloads=total_downloads,
        recent_activity=recent,
    )


@router.get("/logs", response_model=list[AccessLogResponse])
async def get_access_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get paginated access logs."""
    result = await db.execute(
        select(AccessLog)
        .order_by(AccessLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [AccessLogResponse.model_validate(l) for l in result.scalars().all()]
