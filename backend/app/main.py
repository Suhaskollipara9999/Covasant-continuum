"""
Covasant Continuum — FastAPI Application Entry Point
Enterprise AI-powered knowledge management platform.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.v1.router import api_router
from app.db.session import init_db
from app.services.auth_service import AuthService
from app.services.storage_service import storage_service
from app.db.session import async_session_factory

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup: Initialize database and bootstrap super admin
    await init_db()
    async with async_session_factory() as db:
        await AuthService.bootstrap_superadmin(
            db, settings.SUPER_ADMIN_EMAIL, settings.SUPER_ADMIN_PASSWORD
        )

    # Initialize SharePoint folder structure (Continuum + type sub-folders)
    if settings.STORAGE_BACKEND == "sharepoint":
        try:
            await storage_service.initialize_folder_structure()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                "SharePoint folder init failed (will retry on first upload): %s", e
            )

    yield
    # Shutdown: cleanup resources if needed


app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise AI-powered knowledge management and documentation platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "0.1.0"}
