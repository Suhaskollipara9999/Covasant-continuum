"""
Covasant Continuum — Notification Service
Creates broadcast notifications for all active users when events occur.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Notification, User

logger = logging.getLogger(__name__)


async def notify_all_users(
    db: AsyncSession,
    title: str,
    body: str | None = None,
    type: str = "system",
    link: str | None = None,
    metadata: dict | None = None,
    exclude_user_id=None,
):
    """Create a notification for every active user in the system.
    
    Args:
        db: Database session.
        title: Notification title (e.g. "A new video uploaded in CAMS").
        body: Optional longer description.
        type: Notification category — 'upload', 'product', 'system'.
        link: JSON-encoded navigation info (e.g. product_id to navigate to).
        metadata: Extra JSON metadata stored with the notification.
        exclude_user_id: Optional user ID to skip (e.g. the person who triggered it).
    """
    try:
        result = await db.execute(
            select(User.id).where(User.is_active == True, User.is_deleted == False)
        )
        user_ids = [row[0] for row in result.all()]

        for uid in user_ids:
            if exclude_user_id and str(uid) == str(exclude_user_id):
                continue
            notif = Notification(
                user_id=uid,
                title=title,
                body=body,
                type=type,
                link=link,
                metadata_=metadata or {},
            )
            db.add(notif)

        logger.info("Created %d notifications: %s", len(user_ids), title)
    except Exception as e:
        logger.error("Failed to create notifications: %s", e)
        # Don't raise — notifications should never break the main flow
