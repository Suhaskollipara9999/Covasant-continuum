"""
Covasant Continuum — Storage Service
SharePoint-based file storage via Microsoft Graph API.
All files are stored in the SharePoint document library — nothing is saved locally.
"""

import uuid
import logging
from pathlib import Path

import httpx
import msal

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class SharePointStorageService:
    """File storage backed by SharePoint Online via Microsoft Graph API."""

    # ArtefactType enum values → SharePoint sub-folder names
    ARTEFACT_TYPE_FOLDERS = [
        "Release Notes",
        "Roadmap",
        "Product Docs",
        "Architecture",
        "Design System",
        "Presentations",
        "Market Analysis",
        "Competition Analysis",
        "Installation Guides",
        "Newsletter",
        "Videos",
        "Usecases",
        "Flyers",
        "Security Report",
        "AI Act",
        "Training",
        "Troubleshooting Guide",
        "Error Code Manual"
    ]

    def __init__(self):
        self._token_cache: dict | None = None
        self._site_id: str | None = None
        self._drive_id: str | None = None

        # MSAL confidential client for client-credentials (app-only) flow
        self._msal_app = msal.ConfidentialClientApplication(
            client_id=settings.AZURE_CLIENT_ID,
            client_credential=settings.AZURE_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}",
        )

    @property
    def _root_folder(self):
        return get_settings().SHAREPOINT_ROOT_FOLDER

    # ── Token management ──────────────────────────────────────
    def _get_access_token(self) -> str:
        """Acquire an app-only access token via MSAL client credentials."""
        scopes = ["https://graph.microsoft.com/.default"]
        result = self._msal_app.acquire_token_for_client(scopes=scopes)
        if "access_token" not in result:
            error = result.get("error_description", result.get("error", "Unknown MSAL error"))
            raise RuntimeError(f"Failed to acquire SharePoint token: {error}")
        return result["access_token"]

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Accept": "application/json",
        }

    # ── Site & Drive resolution ───────────────────────────────
    async def _resolve_site_id(self) -> str:
        """Resolve the SharePoint site ID from hostname + site path."""
        if self._site_id:
            return self._site_id
        hostname = settings.SHAREPOINT_HOSTNAME
        site_path = settings.SHAREPOINT_SITE_PATH.strip("/")
        
        if not site_path:
            url = f"https://graph.microsoft.com/v1.0/sites/{hostname}"
        else:
            url = f"https://graph.microsoft.com/v1.0/sites/{hostname}:/{site_path}"
            
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            self._site_id = resp.json()["id"]
        logger.info("Resolved SharePoint site ID: %s", self._site_id)
        return self._site_id

    async def _resolve_drive_id(self) -> str:
        """Get the default document library drive ID for the site."""
        if self._drive_id:
            return self._drive_id
        site_id = await self._resolve_site_id()
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            self._drive_id = resp.json()["id"]
        logger.info("Resolved SharePoint drive ID: %s", self._drive_id)
        return self._drive_id

    # ── Folder operations ─────────────────────────────────────
    async def _ensure_folder(self, folder_path: str) -> dict:
        """Create a folder (and any parents) in the document library if it doesn't exist.
        `folder_path` is relative to the drive root, e.g. 'Continuum/release-notes'.
        """
        drive_id = await self._resolve_drive_id()

        # Try to get the folder first
        encoded_path = folder_path.replace(" ", "%20")
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            if resp.status_code == 200:
                return resp.json()

        # Folder doesn't exist — create it recursively
        parts = folder_path.split("/")
        current_path = ""
        result = None
        async with httpx.AsyncClient() as client:
            for part in parts:
                parent_url = (
                    f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
                    if not current_path
                    else f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{current_path}:/children"
                )
                # Check if this segment already exists
                current_path = f"{current_path}/{part}" if current_path else part
                check_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{current_path}"
                check = await client.get(check_url, headers=self._headers())
                if check.status_code == 200:
                    result = check.json()
                    continue

                # Create the folder
                body = {
                    "name": part,
                    "folder": {},
                    "@microsoft.graph.conflictBehavior": "fail",
                }
                resp = await client.post(parent_url, headers=self._headers(), json=body)
                if resp.status_code in (201, 200):
                    result = resp.json()
                elif resp.status_code == 409:
                    # Race condition — folder was created between check and create
                    check = await client.get(check_url, headers=self._headers())
                    result = check.json()
                else:
                    resp.raise_for_status()

        logger.info("Ensured folder: %s", folder_path)
        return result

    async def initialize_folder_structure(self):
        """Create the Continuum root folder and all artefact-type sub-folders in SharePoint."""
        logger.info("Initializing SharePoint folder structure under '%s' ...", self._root_folder)
        await self._ensure_folder(self._root_folder)
        for type_folder in self.ARTEFACT_TYPE_FOLDERS:
            await self._ensure_folder(f"{self._root_folder}/{type_folder}")
        logger.info("SharePoint folder structure initialized successfully.")

    # ── File operations ───────────────────────────────────────
    async def save_file(self, file_data: bytes, filename: str, title: str, subfolder: str = "") -> dict:
        """Upload a file to SharePoint and return metadata.
        
        Args:
            file_data: Raw file bytes.
            filename: Original filename (e.g. 'spec.pdf') — preserved as-is in SharePoint.
            title: Title from the frontend (used for display, not for file naming).
            subfolder: Relative path under Continuum root (e.g. 'documentation' or 'release-notes/product-id').
        """
        ext = Path(filename).suffix
        # Preserve the original filename — strip unsafe chars but keep the original name
        safe_stem = "".join(c for c in Path(filename).stem if c.isalnum() or c in " _-")
        if not safe_stem:
            safe_stem = "unnamed"
        unique_name = f"{safe_stem}{ext}"
        folder_path = f"{self._root_folder}/{subfolder}" if subfolder else self._root_folder

        await self._ensure_folder(folder_path)

        drive_id = await self._resolve_drive_id()

        file_size = len(file_data)
        # For files ≤ 4 MB use simple upload; for larger files use upload session
        if file_size <= 4 * 1024 * 1024:
            upload_url = (
                f"https://graph.microsoft.com/v1.0/drives/{drive_id}"
                f"/root:/{folder_path}/{unique_name}:/content"
            )
            headers = self._headers()
            headers["Content-Type"] = "application/octet-stream"
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                resp = await client.put(upload_url, headers=headers, content=file_data)
                resp.raise_for_status()
                item = resp.json()
        else:
            item = await self._upload_large_file(drive_id, folder_path, unique_name, file_data)

        # The file_path stored in DB is the SharePoint relative path
        stored_path = f"{folder_path}/{unique_name}"
        return {
            "file_name": unique_name,
            "stored_name": unique_name,
            "file_path": stored_path,
            "file_size": file_size,
            "mime_type": self._guess_mime(ext),
            "sharepoint_item_id": item.get("id"),
            "sharepoint_web_url": item.get("webUrl"),
        }

    async def _upload_large_file(self, drive_id: str, folder_path: str, filename: str, file_data: bytes) -> dict:
        """Upload files > 4 MB using an upload session (chunked upload)."""
        session_url = (
            f"https://graph.microsoft.com/v1.0/drives/{drive_id}"
            f"/root:/{folder_path}/{filename}:/createUploadSession"
        )
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
            resp = await client.post(session_url, headers=self._headers(), json={
                "item": {"@microsoft.graph.conflictBehavior": "replace"},
            })
            resp.raise_for_status()
            upload_url = resp.json()["uploadUrl"]

            # Upload in 10 MB chunks
            chunk_size = 10 * 1024 * 1024
            total = len(file_data)
            item = None
            for offset in range(0, total, chunk_size):
                end = min(offset + chunk_size, total)
                chunk = file_data[offset:end]
                content_range = f"bytes {offset}-{end - 1}/{total}"
                resp = await client.put(
                    upload_url,
                    content=chunk,
                    headers={
                        "Content-Length": str(len(chunk)),
                        "Content-Range": content_range,
                    },
                )
                resp.raise_for_status()
                if resp.status_code in (200, 201):
                    item = resp.json()
            return item or {}

    async def save_upload(self, upload_file, title: str, subfolder: str = "") -> dict:
        """Save a FastAPI UploadFile to SharePoint."""
        content = await upload_file.read()
        if len(content) > settings.max_upload_bytes:
            raise ValueError(f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")
        return await self.save_file(content, upload_file.filename or "unnamed", title, subfolder)

    async def get_file_content(self, stored_path: str) -> bytes:
        """Download file content from SharePoint by its stored path."""
        drive_id = await self._resolve_drive_id()
        encoded_path = stored_path.replace(" ", "%20")
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}:/content"
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            resp = await client.get(url, headers=self._headers(), follow_redirects=True)
            resp.raise_for_status()
            return resp.content

    async def get_download_url(self, stored_path: str) -> str:
        """Get a short-lived pre-authenticated download URL from SharePoint."""
        drive_id = await self._resolve_drive_id()
        encoded_path = stored_path.replace(" ", "%20")
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            # @microsoft.graph.downloadUrl is a pre-authed download link
            download_url = data.get("@microsoft.graph.downloadUrl")
            if download_url:
                return download_url
            return data.get("webUrl", "")

    async def delete_file(self, stored_path: str) -> bool:
        """Delete a file from SharePoint."""
        drive_id = await self._resolve_drive_id()
        encoded_path = stored_path.replace(" ", "%20")
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}"
        async with httpx.AsyncClient() as client:
            resp = await client.delete(url, headers=self._headers())
            if resp.status_code == 204:
                return True
            if resp.status_code == 404:
                return False
            resp.raise_for_status()
            return True

    async def list_folder(self, folder_path: str) -> list[dict]:
        """List items inside a SharePoint folder."""
        drive_id = await self._resolve_drive_id()
        encoded_path = folder_path.replace(" ", "%20")
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{encoded_path}:/children"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            return resp.json().get("value", [])

    @staticmethod
    def _guess_mime(ext: str) -> str:
        mime_map = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".ppt": "application/vnd.ms-powerpoint",
            ".csv": "text/csv",
            ".html": "text/html",
            ".htm": "text/html",
            ".txt": "text/plain",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".zip": "application/zip",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        return mime_map.get(ext.lower(), "application/octet-stream")


# Singleton
storage_service = SharePointStorageService()
