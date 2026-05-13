"""
Covasant Continuum — API v1 Router
Aggregates all endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, oauth, artefacts, users, upload, analytics, chat, notifications, superadmin, search, products

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(oauth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(artefacts.router)
api_router.include_router(upload.router)
api_router.include_router(analytics.router)
api_router.include_router(chat.router)
api_router.include_router(search.router)
api_router.include_router(notifications.router)
api_router.include_router(superadmin.router)
