from __future__ import annotations

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def get_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    local_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://172.28.80.1:5173",
        "http://172.28.80.1:5174",
    ]
    return list(dict.fromkeys([*origins, *local_origins]))


def get_max_upload_bytes() -> int:
    try:
        limit_mb = float(os.getenv("MAX_UPLOAD_MB", "10"))
    except ValueError:
        limit_mb = 10.0
    if limit_mb <= 0:
        limit_mb = 10.0
    return int(limit_mb * 1024 * 1024)


def get_model_dir() -> Path:
    raw = os.getenv("KAORA_MODEL_DIR")
    if raw:
        return Path(raw).expanduser().resolve()
    return (BACKEND_ROOT / "models").resolve()


def get_upload_dir() -> Path:
    raw = os.getenv("KAORA_UPLOAD_DIR")
    if raw:
        return Path(raw).expanduser().resolve()
    return (BACKEND_ROOT / "storage" / "uploads").resolve()


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", f"sqlite:///{(BACKEND_ROOT / 'kaora_dev.db').as_posix()}")


def get_verification_secret() -> str:
    return os.getenv("KAORA_VERIFICATION_SECRET", "kaora-dev-verification-secret")


def get_verification_ttl_seconds() -> int:
    try:
        ttl = int(os.getenv("KAORA_VERIFICATION_TTL_SECONDS", "300"))
    except ValueError:
        ttl = 300
    return max(30, ttl)
