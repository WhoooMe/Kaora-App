from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from .config import get_upload_dir

EXT_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class StorageBackend(Protocol):
    backend_name: str

    def save_image(self, content: bytes, content_type: str) -> tuple[str, str]: ...


class LocalImageStorage:
    """Server-side file storage structured with date-prefixed keys for future object-storage migration."""

    backend_name = "local"

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = base_dir or get_upload_dir()

    def save_image(self, content: bytes, content_type: str) -> tuple[str, str]:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        now = datetime.now(timezone.utc)
        ext = EXT_BY_CONTENT_TYPE.get(content_type, ".bin")
        key = f"{now:%Y/%m/%d}/{uuid.uuid4()}{ext}"
        target = self.base_dir / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        sha256 = hashlib.sha256(content).hexdigest()
        return key, sha256


image_storage = LocalImageStorage()
