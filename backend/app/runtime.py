
from __future__ import annotations

import math
import base64
import hashlib
import hmac
import json
import os
import time

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from .cocoa_verifier import CocoaVerifier
from .maturity_classifier import MaturityClassifier
from .config import (
    get_model_dir,
    get_verification_secret,
    get_verification_ttl_seconds,
)


MATURITY_CLASS_MAP = {
    0: "Immature",
    1: "Mature",
    2: "Overmature",
}

MATURITY_LABEL_ID = {
    "Immature": "Belum matang",
    "Mature": "Matang",
    "Overmature": "Lewat matang",
}


@dataclass(frozen=True)
class RuntimeStatus:
    api: str = "ready"
    cocoa_verifier: bool = False
    resnet18: bool = False
    efficientnet_b0: bool = False
    ensemble: bool = False
    localizer: bool = False

    @property
    def verifier(self) -> bool:
        return self.cocoa_verifier

    @property
    def maturity_classifier(self) -> bool:
        return (
            self.resnet18
            or self.efficientnet_b0
            or self.ensemble
        )

    @property
    def localization(self) -> bool:
        return self.localizer

    @property
    def ready_for_calibration(self) -> bool:
        return self.cocoa_verifier

    @property
    def ready_for_detection(self) -> bool:
        return (
            self.cocoa_verifier
            and self.maturity_classifier
        )

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)

        result["verifier"] = self.verifier
        result["maturity_classifier"] = self.maturity_classifier
        result["localization"] = self.localization
        result["ready_for_calibration"] = self.ready_for_calibration
        result["ready_for_detection"] = self.ready_for_detection

        return result


class ModelRuntime:
    """
    Central runtime for KAORA AI models.

    Models:
    - MobileNetV3-Small: Cocoa verifier
    - ResNet18: Cocoa maturity classifier

    EfficientNet-B0 and ensemble inference are not enabled
    in the finalized KAORA inference configuration.
    """

    def __init__(self) -> None:
        self.model_dir: Path = get_model_dir()

        self.verifier: CocoaVerifier | None = None
        self.verifier_error: str | None = None

        self.resnet18_model: Any = None
        self.efficientnet_b0_model: Any = None

        self.resnet18_error: str | None = None
        self.efficientnet_b0_error: str | None = None

        self._load_verifier()
        self._discover_maturity_checkpoints()

    # --------------------------------------------------------
    # COCOA VERIFIER
    # --------------------------------------------------------

    def _verifier_checkpoint_path(self) -> Path:
        override = os.getenv("COCOA_VERIFIER_CHECKPOINT")

        if override:
            return Path(override).expanduser().resolve()

        candidates = [
            self.model_dir / "mobilenetv3_verifier.pth",
            self.model_dir / "cocoa_verifier" / "mobilenetv3_small_best.pth",
            self.model_dir / "cocoa_verifier" / "mobilenetv3_verifier.pth",
            self.model_dir / "cocoa_verifier_mobilenet_v3_small.pth",
        ]

        for candidate in candidates:
            if candidate.is_file():
                return candidate

        return candidates[0]

    def _load_verifier(self) -> None:
        checkpoint_path = self._verifier_checkpoint_path()

        if not checkpoint_path.is_file():
            self.verifier = None
            self.verifier_error = (
                f"Checkpoint verifier belum ditemukan: {checkpoint_path}"
            )
            return

        try:
            threshold_raw = os.getenv("COCOA_VERIFIER_THRESHOLD")

            threshold = (
                float(threshold_raw)
                if threshold_raw
                else None
            )

            self.verifier = CocoaVerifier(
                checkpoint_path,
                threshold=threshold,
            )

            self.verifier_error = None

        except Exception as exc:
            self.verifier = None

            self.verifier_error = (
                f"Checkpoint verifier gagal dimuat: "
                f"{type(exc).__name__}: {exc}"
            )

    # --------------------------------------------------------
    # MATURITY CLASSIFIER
    # --------------------------------------------------------

    def _discover_maturity_checkpoints(self) -> None:
        override = os.getenv("RESNET18_MATURITY_CHECKPOINT")

        if override:
            candidates = [
                Path(override).expanduser().resolve()
            ]
        else:
            candidates = [
                self.model_dir / "resnet18_maturity.pth",
                self.model_dir / "maturity" / "resnet18_maturity.pth",
                self.model_dir / "maturity" / "resnet18_maturity_inference_state_dict.pth",
                self.model_dir / "maturity" / "resnet18_maturity_best.pth",
                self.model_dir / "maturity" / "resnet18" / "resnet18_maturity_inference_state_dict.pth",
            ]

        checkpoint_path = next(
            (
                path
                for path in candidates
                if path.is_file()
            ),
            None,
        )

        if checkpoint_path is None:
            self.resnet18_model = None

            self.resnet18_error = (
                "Checkpoint ResNet18 belum ditemukan. "
                "Periksa backend/models/resnet18_maturity.pth."
            )

        else:
            try:
                self.resnet18_model = MaturityClassifier(
                    checkpoint_path
                )

                self.resnet18_error = None

            except Exception as exc:
                self.resnet18_model = None

                self.resnet18_error = (
                    f"Checkpoint ResNet18 gagal dimuat: "
                    f"{type(exc).__name__}: {exc}"
                )

        # EfficientNet tidak digunakan pada konfigurasi final KAORA.
        self.efficientnet_b0_model = None

        self.efficientnet_b0_error = (
            "Tidak dimuat. Model inference yang dipilih adalah ResNet18."
        )

    # --------------------------------------------------------
    # MODEL STATUS
    # --------------------------------------------------------

    def get_status(self) -> dict[str, Any]:
        resnet_ready = self.resnet18_model is not None
        effnet_ready = self.efficientnet_b0_model is not None

        ensemble_ready = (
            resnet_ready
            and effnet_ready
        )

        status = RuntimeStatus(
            cocoa_verifier=self.verifier is not None,
            resnet18=resnet_ready,
            efficientnet_b0=effnet_ready,
            ensemble=ensemble_ready,
            localizer=False,
        ).to_dict()

        status["model_dir"] = str(self.model_dir)

        status["verifier_model"] = (
            self.verifier.model_version
            if self.verifier
            else None
        )

        status["verifier_error"] = self.verifier_error

        status["maturity_models"] = {
            "resnet18": getattr(
                self.resnet18_model,
                "model_version",
                None,
            ),
            "efficientnet_b0": None,
        }

        status["maturity_errors"] = {
            "resnet18": self.resnet18_error,
            "efficientnet_b0": self.efficientnet_b0_error,
        }

        status["localization_note"] = (
            "Lokalisasi AI belum tersedia; "
            "GuideFrame hanya panduan posisi visual."
        )

        return status

    # --------------------------------------------------------
    # INFERENCE
    # --------------------------------------------------------

    def verify_cocoa(
        self,
        image: Image.Image,
    ) -> dict[str, Any] | None:

        if self.verifier is None:
            return None

        return self.verifier.predict(image)

    def predict_maturity(
        self,
        image: Image.Image,
    ) -> dict[str, Any] | None:

        if self.resnet18_model is None:
            return None

        return self.resnet18_model.predict(image)

    # --------------------------------------------------------
    # VERIFICATION TOKEN
    # --------------------------------------------------------


    # --------------------------------------------------------
    # VERIFICATION TOKEN
    # --------------------------------------------------------

    @staticmethod
    def _image_sha256(image_bytes: bytes) -> str:
        return hashlib.sha256(image_bytes).hexdigest()

    def issue_verification_token(
        self,
        image_bytes: bytes,
        cocoa_probability: float | None = None,
    ) -> str:
        payload = {
            "sha256": self._image_sha256(image_bytes),
            "exp": (
                int(time.time())
                + get_verification_ttl_seconds()
            ),
        }

        # Simpan probabilitas hasil verifier ke dalam token.
        if cocoa_probability is not None:
            probability = float(cocoa_probability)

            if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
                raise ValueError("Cocoa probability harus berada pada rentang 0 hingga 1.")

            payload["cocoa_probability"] = probability

        encoded = base64.urlsafe_b64encode(
            json.dumps(
                payload,
                separators=(",", ":"),
            ).encode("utf-8")
        ).decode("ascii")

        signature = hmac.new(
            get_verification_secret().encode("utf-8"),
            encoded.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        return f"{encoded}.{signature}"

    def get_verification_token_payload(
        self,
        token: str | None,
        image_bytes: bytes,
    ) -> dict[str, Any] | None:
        """
        Validate verification token and return its signed payload.

        Returns None if token is invalid, expired, or belongs
        to a different image.
        """
        if not token or "." not in token:
            return None

        encoded, signature = token.split(".", 1)

        expected_signature = hmac.new(
            get_verification_secret().encode("utf-8"),
            encoded.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        try:
            payload = json.loads(
                base64.urlsafe_b64decode(
                    encoded.encode("ascii")
                ).decode("utf-8")
            )
        except Exception:
            return None

        if not isinstance(payload, dict):
            return None

        try:
            expiration = int(payload.get("exp", 0))
        except (TypeError, ValueError):
            return None

        if expiration < int(time.time()):
            return None

        if payload.get("sha256") != self._image_sha256(image_bytes):
            return None

        # Validasi klaim probabilitas jika tersedia.
        probability = payload.get("cocoa_probability")

        if probability is not None:
            try:
                probability = float(probability)
            except (TypeError, ValueError):
                return None

            if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
                return None

            payload["cocoa_probability"] = probability

        return payload

    def validate_verification_token(
        self,
        token: str | None,
        image_bytes: bytes,
    ) -> bool:
        """
        Keep the existing boolean validation interface
        for backward compatibility.
        """
        return (
            self.get_verification_token_payload(
                token,
                image_bytes,
            ) is not None
        )

# ------------------------------------------------------------
# GLOBAL RUNTIME INSTANCE
# ------------------------------------------------------------

model_runtime = ModelRuntime()
