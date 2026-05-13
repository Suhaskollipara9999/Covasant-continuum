"""
Covasant Continuum — Chat API
AI chat with tenant isolation and persistent history.
"""

import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.models import ChatSession, ChatMessage, User
from app.schemas.schemas import (
    ChatMessageRequest, ChatMessageResponse, ChatSessionResponse, MessageResponse,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("/")
async def quick_chat(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Quick chat endpoint — used by frontend ChatPanel. Uses backend .env AI keys."""
    body = await request.json()
    message = body.get("message", "")
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message required")

    try:
        response = await ai_service.chat(
            messages=[{"role": "user", "content": message}],
            tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        )
        return {"content": response, "role": "assistant"}
    except Exception as e:
        return {"content": f"AI is not configured. Set an API key in backend/.env. ({str(e)[:100]})", "role": "assistant"}

@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to the AI assistant. Creates a session if needed."""
    # Get or create session
    if data.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == data.session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = ChatSession(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            title=data.message[:50],
        )
        db.add(session)
        await db.flush()

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.flush()

    # Get conversation history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .limit(20)
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    # Get AI response
    try:
        ai_response = await ai_service.chat(
            messages=history,
            tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        )
    except Exception as e:
        ai_response = f"I encountered an error processing your request. Please try again. ({str(e)[:100]})"

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=ai_response,
    )
    db.add(assistant_msg)
    await db.flush()

    return ChatMessageResponse.model_validate(assistant_msg)


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's chat sessions."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id, ChatSession.is_active == True)
        .order_by(ChatSession.created_at.desc())
        .limit(20)
    )
    return [ChatSessionResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a chat session with its messages."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionResponse.model_validate(session)
