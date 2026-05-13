"""
Covasant Continuum — Storage Service
Abstraction layer for file storage (local → cloud-ready).
"""

import os
import shutil
import uuid
from pathlib import Path

import aiofiles

from app.core.config import get_settings

settings = get_settings()


class StorageService:
    """File storage abstraction. Currently local filesystem, designed for cloud migration."""

    def __init__(self):
        self.base_path = Path(settings.STORAGE_LOCAL_PATH)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_path(self, *parts: str) -> Path:
        return self.base_path.joinpath(*parts)

    async def save_file(self, file_data: bytes, filename: str, subfolder: str = "") -> dict:
        """Save a file and return metadata."""
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        folder = self._get_path(subfolder) if subfolder else self.base_path
        folder.mkdir(parents=True, exist_ok=True)

        file_path = folder / unique_name
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)

        return {
            "file_name": filename,
            "stored_name": unique_name,
            "file_path": str(file_path.relative_to(self.base_path)),
            "file_size": len(file_data),
            "mime_type": self._guess_mime(ext),
        }

    async def save_upload(self, upload_file, subfolder: str = "") -> dict:
        """Save a FastAPI UploadFile."""
        content = await upload_file.read()

        if len(content) > settings.max_upload_bytes:
            raise ValueError(f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")

        return await self.save_file(content, upload_file.filename or "unnamed", subfolder)

    async def get_file_path(self, stored_path: str) -> Path:
        """Get absolute path for a stored file."""
        full_path = self.base_path / stored_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {stored_path}")
        return full_path

    async def delete_file(self, stored_path: str) -> bool:
        """Delete a file from storage."""
        full_path = self.base_path / stored_path
        if full_path.exists():
            os.remove(full_path)
            return True
        return False

    @staticmethod
    def _guess_mime(ext: str) -> str:
        mime_map = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".zip": "application/zip",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        return mime_map.get(ext.lower(), "application/octet-stream")


# Singleton
storage_service = StorageService()
