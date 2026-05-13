"""
Covasant Continuum — OAuth Endpoints
Google OAuth and Microsoft SSO authentication flows.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token
from app.db.session import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import TokenResponse, UserResponse

settings = get_settings()
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])


@router.post("/google")
async def google_oauth(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Google OAuth callback. Frontend sends the Google ID token after Google Sign-In.
    Validates the token, finds or creates the user, and returns JWT tokens.
    """
    body = await request.json()
    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")
            google_data = resp.json()

        email = google_data.get("email")
        name = google_data.get("name", email.split("@")[0])
        google_id = google_data.get("sub")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        # Find or create user
        result = await db.execute(select(User).where(User.email == email, User.is_deleted == False))
        user = result.scalar_one_or_none()

        if not user:
            # Check if invite exists (invite-only system)
            from app.models.models import Invite
            invite_result = await db.execute(select(Invite).where(Invite.email == email))
            invite = invite_result.scalar_one_or_none()
            if not invite:
                raise HTTPException(status_code=403, detail="No invite found for this email. Contact your administrator.")

            user = User(
                email=email,
                full_name=name,
                role=invite.role if invite else UserRole.INTERNAL,
                tenant_id=invite.tenant_id if invite else None,
                oauth_provider="google",
                oauth_id=google_id,
                is_active=True,
                is_verified=True,
                avatar_url=google_data.get("picture"),
            )
            db.add(user)
            if invite:
                invite.is_used = True
            await db.flush()
        else:
            # Update OAuth info
            user.oauth_provider = "google"
            user.oauth_id = google_id
            user.avatar_url = google_data.get("picture") or user.avatar_url
            from datetime import datetime, timezone
            user.last_login = datetime.now(timezone.utc)
            await db.flush()

        token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth error: {str(e)[:200]}")


@router.post("/microsoft")
async def microsoft_oauth(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Microsoft SSO callback. Frontend sends the Microsoft access token after MSAL auth.
    Validates the token via Microsoft Graph API, finds or creates user, and returns JWT tokens.
    """
    body = await request.json()
    access_token = body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access_token")

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Microsoft token")
            ms_data = resp.json()

        email = ms_data.get("mail") or ms_data.get("userPrincipalName")
        name = ms_data.get("displayName", email.split("@")[0] if email else "User")
        ms_id = ms_data.get("id")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Microsoft")

        # Find or create user
        result = await db.execute(select(User).where(User.email == email, User.is_deleted == False))
        user = result.scalar_one_or_none()

        if not user:
            from app.models.models import Invite
            invite_result = await db.execute(select(Invite).where(Invite.email == email))
            invite = invite_result.scalar_one_or_none()
            if not invite:
                raise HTTPException(status_code=403, detail="No invite found for this email. Contact your administrator.")

            user = User(
                email=email,
                full_name=name,
                role=invite.role if invite else UserRole.INTERNAL,
                tenant_id=invite.tenant_id if invite else None,
                oauth_provider="microsoft",
                oauth_id=ms_id,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            if invite:
                invite.is_used = True
            await db.flush()
        else:
            user.oauth_provider = "microsoft"
            user.oauth_id = ms_id
            from datetime import datetime, timezone
            user.last_login = datetime.now(timezone.utc)
            await db.flush()

        token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth error: {str(e)[:200]}")


@router.post("/validate-entra-user")
async def validate_entra_user(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Validate a user from Entra ID (Azure AD) by email.
    Used by the IDA Auth redirect flow — after the auth service returns tokens,
    the frontend sends the user's email here to get Continuum JWT tokens.
    """
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == email, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Auto-provision user from Entra ID
        name = body.get("name") or email.split("@")[0]
        user = User(
            email=email,
            full_name=name,
            role=UserRole.INTERNAL,
            oauth_provider="microsoft",
            is_active=True
        )
        db.add(user)
        await db.flush()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account is deactivated.")

    # Update OAuth info
    user.oauth_provider = "microsoft"
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user": UserResponse.model_validate(user).model_dump(),
    }
