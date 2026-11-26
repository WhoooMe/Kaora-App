from io import BytesIO

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.preprocessing import LETTERBOX_COLOR, letterbox_resize
from app.runtime import model_runtime
from app.storage import LocalImageStorage

client = TestClient(app)


def make_png(noise: bool = False, size: tuple[int, int] = (256, 256)) -> bytes:
    if noise:
        rng = np.random.default_rng(12)
        pixels = rng.integers(30, 220, size=(size[1], size[0], 3), dtype=np.uint8)
        image = Image.fromarray(pixels, mode="RGB")
    else:
        image = Image.new("RGB", size, color=(120, 150, 90))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class FakeCocoaVerifier:
    model_version = "test-verifier"

    def __init__(self, cocoa_detected: bool = True, cocoa_probability: float | None = None):
        self.cocoa_detected = cocoa_detected
        self.cocoa_probability = (
            cocoa_probability
            if cocoa_probability is not None
            else (0.93 if cocoa_detected else 0.12)
        )

    def predict(self, image):
        non_cocoa_prob = round(1.0 - self.cocoa_probability, 6)
        return {
            "cocoa_detected": self.cocoa_detected,
            "cocoa_probability": self.cocoa_probability,
            "non_cocoa_probability": non_cocoa_prob,
            "confidence": self.cocoa_probability if self.cocoa_detected else non_cocoa_prob,
            "threshold": 0.70,
            "model_version": self.model_version,
        }


class FakeMaturityClassifier:
    model_version = "test-resnet18"

    def __init__(self, maturity_class: str = "Mature"):
        self.maturity_class = maturity_class

    def predict(self, image):
        probs = {"Immature": 0.04, "Mature": 0.91, "Overmature": 0.05}
        if self.maturity_class == "Immature":
            probs = {"Immature": 0.88, "Mature": 0.09, "Overmature": 0.03}
        elif self.maturity_class == "Overmature":
            probs = {"Immature": 0.02, "Mature": 0.08, "Overmature": 0.90}
        return {
            "maturity_class": self.maturity_class,
            "confidence": probs[self.maturity_class],
            "probabilities": probs,
            "model_version": self.model_version,
        }


@pytest.fixture()
def isolated_db_and_storage(tmp_path, monkeypatch):
    db_file = tmp_path / "test_kaora.db"
    engine = create_engine(
        f"sqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    test_storage = LocalImageStorage(tmp_path / "uploads")
    monkeypatch.setattr("app.main.image_storage", test_storage)
    app.dependency_overrides[get_db] = override_get_db
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "kaora-api"


def test_model_status_exposes_separate_readiness_states(monkeypatch):
    monkeypatch.setattr(model_runtime, "verifier", None)
    monkeypatch.setattr(model_runtime, "resnet18_model", None)
    monkeypatch.setattr(model_runtime, "efficientnet_b0_model", None)

    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert data["api"] == "ready"
    assert data["verifier"] is False
    assert data["maturity_classifier"] is False
    assert data["localization"] is False
    assert data["ready_for_calibration"] is False
    assert data["ready_for_detection"] is False


def test_calibration_does_not_claim_success_without_verifier(monkeypatch):
    monkeypatch.setattr(model_runtime, "verifier", None)
    response = client.post(
        "/api/v1/calibration/verify-frame",
        files={"file": ("frame.png", make_png(size=(64, 64)), "image/png")},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_NOT_READY"


def test_calibration_accepts_verified_cocoa_and_issues_token(monkeypatch):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(True))
    response = client.post(
        "/api/v1/calibration/verify-frame",
        files={"file": ("frame.png", make_png(noise=True), "image/png")},
        data={"source": "camera_guide_roi"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["verified"] is True
    assert payload["cocoa_detected"] is True
    assert payload["bbox_available"] is False
    assert payload["guide_roi_checked"] is True
    assert payload["quality"]["passed"] is True
    assert isinstance(payload["verification_token"], str) and "." in payload["verification_token"]


def test_calibration_rejects_non_cocoa_when_verifier_is_loaded(monkeypatch):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(False))
    response = client.post(
        "/api/v1/calibration/verify-frame",
        files={"file": ("frame.png", make_png(noise=True), "image/png")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["verified"] is False
    assert payload["cocoa_detected"] is False
    assert payload["rejection_code"] == "COCOA_NOT_DETECTED"
    assert payload["verification_token"] is None


def test_detect_frame_returns_model_not_ready_when_checkpoints_missing(monkeypatch):
    monkeypatch.setattr(model_runtime, "verifier", None)
    monkeypatch.setattr(model_runtime, "resnet18_model", None)
    monkeypatch.setattr(model_runtime, "efficientnet_b0_model", None)

    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("frame.png", make_png(noise=True), "image/png")},
        data={"verified": "true"},  # must never bypass server checks
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_NOT_READY"


def test_rejects_unsupported_file_type():
    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("frame.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["detail"]["code"] == "INVALID_IMAGE"


def test_rejects_invalid_image_payload():
    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("frame.png", b"not really a png", "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_IMAGE"


def test_detections_list_and_not_found():
    list_res = client.get("/api/v1/detections")
    assert list_res.status_code == 200
    body = list_res.json()
    assert "items" in body and isinstance(body["items"], list)
    assert "total" in body

    detail_res = client.get("/api/v1/detections/non-existent-id")
    assert detail_res.status_code == 404
    assert detail_res.json()["detail"]["code"] == "DETECTION_NOT_FOUND"


def test_letterbox_resize_matches_colab_contract():
    # Rectangular 400x200 image -> 224x224 with (114, 114, 114) letterbox bars top & bottom
    raw = Image.new("RGB", (400, 200), color=(20, 180, 60))
    out = letterbox_resize(raw)
    assert out.size == (224, 224)
    assert out.mode == "RGB"
    assert out.getpixel((112, 0)) == LETTERBOX_COLOR
    assert out.getpixel((112, 223)) == LETTERBOX_COLOR
    assert out.getpixel((112, 112)) == (20, 180, 60)


def test_verification_token_is_bound_to_image_bytes():
    img_a = make_png(noise=True)
    img_b = make_png(noise=False, size=(128, 128))
    token = model_runtime.issue_verification_token(img_a, cocoa_probability=0.95)
    payload_a = model_runtime.get_verification_token_payload(token, img_a)
    assert payload_a is not None
    assert payload_a["cocoa_probability"] == pytest.approx(0.95)
    assert model_runtime.validate_verification_token(token, img_a) is True
    assert model_runtime.validate_verification_token(token, img_b) is False


def test_detect_frame_returns_cocoa_probability_with_valid_token(monkeypatch, isolated_db_and_storage):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(True, cocoa_probability=0.93))
    monkeypatch.setattr(model_runtime, "resnet18_model", FakeMaturityClassifier("Mature"))

    img_bytes = make_png(noise=True)
    token = model_runtime.issue_verification_token(img_bytes, cocoa_probability=0.96)

    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("cocoa.png", img_bytes, "image/png")},
        data={"verification_token": token, "block_name": "Blok A", "source": "uploaded_image"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["cocoa_probability"] == pytest.approx(0.96)
    assert body["maturity_class"] == "Mature"
    assert body["maturity_label_id"] == "Matang"
    assert body["block_name"] == "Blok A"
    assert body["bbox_available"] is False
    assert isinstance(body["image_key"], str) and len(body["image_key"]) > 0

    detail = client.get(f"/api/v1/detections/{body['detection_id']}")
    assert detail.status_code == 200
    assert detail.json()["cocoa_probability"] == pytest.approx(0.96)


def test_detect_frame_returns_cocoa_probability_without_token(monkeypatch, isolated_db_and_storage):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(True, cocoa_probability=0.91))
    monkeypatch.setattr(model_runtime, "resnet18_model", FakeMaturityClassifier("Immature"))

    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("cocoa.png", make_png(noise=True), "image/png")},
        data={"block_name": "Blok B"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["cocoa_probability"] == pytest.approx(0.91)
    assert body["maturity_class"] == "Immature"
    assert body["maturity_label_id"] == "Belum matang"


def test_detect_frame_returns_cocoa_probability_with_invalid_token(monkeypatch, isolated_db_and_storage):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(True, cocoa_probability=0.89))
    monkeypatch.setattr(model_runtime, "resnet18_model", FakeMaturityClassifier("Overmature"))

    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("cocoa.png", make_png(noise=True), "image/png")},
        data={"verification_token": "invalid.token.value"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["cocoa_probability"] == pytest.approx(0.89)
    assert body["maturity_class"] == "Overmature"
    assert body["maturity_label_id"] == "Lewat matang"


def test_detect_frame_rejects_non_cocoa_even_with_verified_flag(monkeypatch, isolated_db_and_storage):
    monkeypatch.setattr(model_runtime, "verifier", FakeCocoaVerifier(False))
    monkeypatch.setattr(model_runtime, "resnet18_model", FakeMaturityClassifier("Mature"))

    response = client.post(
        "/api/v1/detect/frame",
        files={"file": ("non_cocoa.png", make_png(noise=True), "image/png")},
        data={"verified": "true"},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "COCOA_NOT_DETECTED"
