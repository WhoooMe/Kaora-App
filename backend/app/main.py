from __future__ import annotations

import io
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_cors_origins, get_max_upload_bytes
from .db import CapturedImage, Detection, get_db, init_db
from .frame_quality import inspect_frame_quality
from .runtime import MATURITY_LABEL_ID, model_runtime
from .storage import image_storage


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="KAORA API",
    version="0.3.0",
    description=(
        "API KAORA untuk verifikasi objek kakao, klasifikasi kematangan, dan riwayat deteksi. "
        "Cocoa verifier menggunakan model biner terpisah dari classifier kematangan."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def read_and_validate_image(file: UploadFile) -> tuple[bytes, tuple[int, int], str]:
    """Read a bounded image upload and validate its actual image encoding."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail={"code": "INVALID_IMAGE", "message": "Format tidak didukung. Gunakan file JPG, PNG, atau WEBP."},
        )

    max_bytes = get_max_upload_bytes()
    content = await file.read(max_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail={"code": "INVALID_IMAGE", "message": "File gambar kosong."})
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "INVALID_IMAGE",
                "message": f"Ukuran gambar melebihi batas {max_bytes // (1024 * 1024)} MB.",
            },
        )

    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            width, height = image.size
            image_format = (image.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400, detail={"code": "INVALID_IMAGE", "message": "File tidak dapat dibaca sebagai gambar."}
        )

    if image_format not in {"JPEG", "PNG", "WEBP"} or width < 32 or height < 32:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_IMAGE",
                "message": "Gambar harus berformat JPG/PNG/WEBP dan minimal 32 x 32 piksel.",
            },
        )
    return content, (width, height), file.content_type


def model_not_ready(feature: str) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "code": "MODEL_NOT_READY",
            "feature": feature,
            "message": (
                "Layanan AI belum siap. Pasang checkpoint model yang valid dan restart backend. "
                "Tidak ada prediksi simulasi yang dikembalikan."
            ),
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kaora-api", "version": app.version}


@app.get("/api/v1/models/status")
def model_status() -> dict[str, Any]:
    return model_runtime.get_status()


@app.post("/api/v1/calibration/verify-frame")
async def verify_calibration_frame(
    file: UploadFile = File(...),
    source: str = Form("uploaded_image"),
) -> dict[str, Any]:
    """Verify a camera guide-region crop or a user-selected image."""
    if source not in {"camera_guide_roi", "uploaded_image"}:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_IMAGE", "message": "Sumber frame tidak dikenali."},
        )
    content, dimensions, _content_type = await read_and_validate_image(file)
    if not model_runtime.get_status()["ready_for_calibration"]:
        raise model_not_ready("calibration")

    try:
        with Image.open(io.BytesIO(content)) as image_file:
            image = image_file.copy()
        quality = inspect_frame_quality(image)
        prediction = model_runtime.verify_cocoa(image)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "INFERENCE_ERROR", "message": f"Verifikasi gagal diproses ({type(exc).__name__})."},
        ) from exc

    if prediction is None:
        raise model_not_ready("calibration")

    cocoa_detected = bool(prediction["cocoa_detected"])
    quality_passed = bool(quality["passed"])
    verified = cocoa_detected and quality_passed
    if not quality_passed:
        message = "Objek belum dapat diverifikasi. Perbaiki fokus, pencahayaan, atau resolusi frame."
        rejection_code = "FRAME_QUALITY_FAILED"
        verification_token = None
    elif not cocoa_detected:
        message = "Objek pada area panduan belum dikenali sebagai buah kakao."
        rejection_code = "COCOA_NOT_DETECTED"
        verification_token = None
    else:
        message = "Objek kakao dikenali dan kualitas frame memenuhi pemeriksaan awal."
        rejection_code = None

        cocoa_probability = float(prediction["cocoa_probability"])

        verification_token = model_runtime.issue_verification_token(
              content,
             cocoa_probability=cocoa_probability,
        )

    return {
        "verified": verified,
        "cocoa_detected": cocoa_detected,
        "guide_roi_checked": source == "camera_guide_roi",
        "input_source": source,
        "bbox": None,
        "bbox_available": False,
        "image_width": dimensions[0],
        "image_height": dimensions[1],
        "confidence": round(float(prediction["confidence"]), 4),
        "cocoa_probability": round(float(prediction["cocoa_probability"]), 4),
        "threshold": float(prediction["threshold"]),
        "quality": quality,
        "model_version": prediction["model_version"],
        "verification_token": verification_token,
        "rejection_code": rejection_code,
        "message": message,
    }


@app.post("/api/v1/detect/frame")
async def detect_image(
    file: UploadFile = File(...),
    verification_token: str | None = Form(None),
    block_name: str | None = Form(None),
    source: str = Form("uploaded_image"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Run server-verified maturity inference on a still image and persist metadata."""
    content, dimensions, content_type = await read_and_validate_image(file)
    status = model_runtime.get_status()
    if not status["ready_for_detection"]:
        raise model_not_ready("detection")

    try:
        with Image.open(io.BytesIO(content)) as image_file:
            image = image_file.copy()


        # Never trust a client-supplied verified=true flag.
        # Read only claims from a valid, signed token.
        verification_claims = model_runtime.get_verification_token_payload(
            verification_token,
            content,
        )

        cocoa_probability = None

        if verification_claims is not None:
            token_probability = verification_claims.get(
                "cocoa_probability"
            )

            if token_probability is not None:
                cocoa_probability = float(token_probability)

        # Re-run verification if the token is invalid,
        # expired, belongs to another image, or is an old
        # token without a probability claim.
        if cocoa_probability is None:
            quality = inspect_frame_quality(image)

            if not quality["passed"]:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "FRAME_QUALITY_FAILED",
                        "message": "Kualitas gambar belum memenuhi pemeriksaan awal.",
                    },
                )

            verify_res = model_runtime.verify_cocoa(image)

            if verify_res is None:
                raise model_not_ready("calibration")

            cocoa_probability = float(
                verify_res["cocoa_probability"]
            )

            if not verify_res["cocoa_detected"]:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "COCOA_NOT_DETECTED",
                        "message": "Objek pada gambar tidak dikenali sebagai buah kakao.",
                    },
                )

        maturity = model_runtime.predict_maturity(image)
        if maturity is None:
            raise model_not_ready("detection")

        storage_key, sha256 = image_storage.save_image(content, content_type)
        captured = CapturedImage(
            storage_backend=image_storage.backend_name,
            storage_key=storage_key,
            original_filename=file.filename,
            content_type=content_type,
            file_size_bytes=len(content),
            sha256=sha256,
            width=dimensions[0],
            height=dimensions[1],
            input_source=source if source in {"camera_guide_roi", "uploaded_image"} else "uploaded_image",
        )
        db.add(captured)
        db.flush()

        maturity_class = str(maturity["maturity_class"])
        maturity_label_id = MATURITY_LABEL_ID.get(maturity_class, maturity_class)
        record = Detection(
            captured_image_id=captured.id,
            block_name=block_name,
            verified=True,
            cocoa_probability=cocoa_probability,
            maturity_class=maturity_class,
            maturity_label_id=maturity_label_id,
            confidence=float(maturity["confidence"]),
            probabilities=maturity.get("probabilities"),
            bbox=None,
            bbox_available=False,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={"code": "INFERENCE_ERROR", "message": f"Deteksi gagal diproses ({type(exc).__name__})."},
        ) from exc

    return {
        "detection_id": record.id,
        "verified": record.verified,
        "cocoa_probability": record.cocoa_probability,
        "maturity_class": record.maturity_class,
        "maturity_label_id": record.maturity_label_id,
        "confidence": record.confidence,
        "probabilities": record.probabilities,
        "bbox": None,
        "bbox_available": False,
        "image_key": captured.storage_key,
        "block_name": record.block_name,
        "created_at": record.created_at.isoformat(),
    }


def _serialize_detection(row: Detection) -> dict[str, Any]:
    return {
        "id": row.id,
        "captured_image_id": row.captured_image_id,
        "block_name": row.block_name,
        "verified": row.verified,
        "cocoa_probability": row.cocoa_probability,
        "maturity_class": row.maturity_class,
        "maturity_label_id": row.maturity_label_id,
        "confidence": row.confidence,
        "probabilities": row.probabilities,
        "bbox": row.bbox,
        "bbox_available": row.bbox_available,
        "created_at": row.created_at.isoformat(),
    }


@app.get("/api/v1/detections")
def list_detections(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    total = db.scalar(select(func.count()).select_from(Detection)) or 0
    rows = db.scalars(
        select(Detection).order_by(Detection.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "items": [_serialize_detection(row) for row in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/v1/detections/{detection_id}")
def get_detection(detection_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Detection, detection_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "DETECTION_NOT_FOUND", "message": "Data deteksi tidak ditemukan."},
        )
    return _serialize_detection(row)
