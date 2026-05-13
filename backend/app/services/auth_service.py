"""
Covasant Continuum — Auth Service
Business logic for authentication, registration, and token management.
"""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.models import User, Invite, UserRole
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse, InviteRequest, AcceptInviteRequest


class AuthService:

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
        result = await db.execute(select(User).where(User.email == data.email, User.is_deleted == False))
        user = result.scalar_one_or_none()

        if not user or not user.hashed_password:
            raise ValueError("Invalid email or password")
        if not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is deactivated")

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await db.flush()

        token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def refresh_token(db: AsyncSession, token: str) -> TokenResponse:
        from app.core.security import decode_token
        payload = decode_token(token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ValueError("User not found or deactivated")

        token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def create_invite(db: AsyncSession, data: InviteRequest, invited_by: UUID) -> Invite:
        # Check if user already exists
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise ValueError("User with this email already exists")

        invite = Invite(
            email=data.email,
            role=UserRole(data.role),
            tenant_id=data.tenant_id,
            invited_by=invited_by,
            token=secrets.token_urlsafe(48),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add(invite)
        await db.flush()
        return invite

    @staticmethod
    async def accept_invite(db: AsyncSession, data: AcceptInviteRequest) -> TokenResponse:
        result = await db.execute(
            select(Invite).where(Invite.token == data.token, Invite.is_used == False)
        )
        invite = result.scalar_one_or_none()

        if not invite:
            raise ValueError("Invalid or expired invite")
        if invite.expires_at < datetime.now(timezone.utc):
            raise ValueError("Invite has expired")

        # Create user
        user = User(
            email=invite.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=invite.role,
            tenant_id=invite.tenant_id,
            is_active=True,
            is_verified=True,
        )
        db.add(user)

        # Mark invite as used
        invite.is_used = True
        invite.accepted_at = datetime.now(timezone.utc)
        await db.flush()

        token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def bootstrap_superadmin(db: AsyncSession, email: str, password: str):
        """Create the initial super admin if none exists."""
        result = await db.execute(select(User).where(User.role == UserRole.SUPERADMIN))
        if result.scalar_one_or_none():
            return  # Super admin already exists

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name="Super Admin",
            role=UserRole.SUPERADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
