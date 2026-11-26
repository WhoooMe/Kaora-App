from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image

from .preprocessing import (
    IMAGE_SIZE,
    IMAGENET_MEAN,
    IMAGENET_STD,
    build_inference_transform,
)

# 0 = non_cocoa, 1 = cocoa
CLASS_TO_IDX = {
    "non_cocoa": 0,
    "cocoa": 1,
}


def build_model():
    """Build the MobileNetV3-Small binary classifier architecture."""
    try:
        import torch.nn as nn
        from torchvision.models import mobilenet_v3_small
    except Exception as exc:
        raise RuntimeError(
            "Dependensi AI belum tersedia. "
            "Install backend/requirements-ai.txt terlebih dahulu."
        ) from exc

    model = mobilenet_v3_small(weights=None)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, 2)

    return model


class CocoaVerifier:
    """Binary classifier: non_cocoa (0) vs cocoa (1)."""

    def __init__(
        self,
        checkpoint_path: str | Path,
        threshold: float | None = None,
    ) -> None:
        import torch

        self.torch = torch
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        checkpoint_path = Path(checkpoint_path)

        if not checkpoint_path.is_file():
            raise FileNotFoundError(
                f"Checkpoint verifier tidak ditemukan: {checkpoint_path}"
            )

        checkpoint = torch.load(
            str(checkpoint_path),
            map_location=self.device,
            weights_only=True,
        )

        if not isinstance(checkpoint, dict):
            raise ValueError("Format checkpoint verifier tidak valid.")

        # Checkpoint Colab menggunakan key model_state_dict.
        state_dict = checkpoint.get("model_state_dict")

        if not isinstance(state_dict, dict):
            raise ValueError(
                "Checkpoint tidak memiliki model_state_dict yang valid."
            )

        # Mendukung metadata aktual dari Colab dan format legacy.
        saved_classes = checkpoint.get(
            "label_mapping",
            checkpoint.get("class_to_idx"),
        )

        if not isinstance(saved_classes, dict):
            raise ValueError(
                "Checkpoint tidak memiliki label_mapping yang valid."
            )

        normalized_classes = {
            str(label): int(index)
            for label, index in saved_classes.items()
        }

        if normalized_classes != CLASS_TO_IDX:
            raise ValueError(
                "Urutan kelas checkpoint tidak cocok. "
                f"Diharapkan {CLASS_TO_IDX}, "
                f"diterima {normalized_classes}."
            )

        self.model = build_model()
        self.model.load_state_dict(state_dict, strict=True)
        self.model.to(self.device)
        self.model.eval()

        # Metadata preprocessing dari checkpoint Colab.
        image_size = int(
            checkpoint.get("image_size", IMAGE_SIZE)
        )

        mean = tuple(
            checkpoint.get(
                "normalization_mean",
                checkpoint.get("mean", IMAGENET_MEAN),
            )
        )

        std = tuple(
            checkpoint.get(
                "normalization_std",
                checkpoint.get("std", IMAGENET_STD),
            )
        )

        input_color = str(
            checkpoint.get("input_color", "RGB")
        ).upper()

        if input_color != "RGB":
            raise ValueError(
                f"Input color checkpoint tidak didukung: {input_color}"
            )

        if len(mean) != 3 or len(std) != 3:
            raise ValueError(
                "Metadata normalisasi checkpoint harus berisi 3 channel."
            )

        self.image_size = image_size

        # Transform sudah mencakup Letterbox, ToTensor, Normalize.
        self.transform = build_inference_transform(
            image_size=image_size,
            mean=mean,
            std=std,
        )

        # Threshold default mengikuti konfigurasi verifier KAORA.
        checkpoint_threshold = float(
            checkpoint.get("threshold", 0.70)
        )

        self.threshold = float(
            checkpoint_threshold if threshold is None else threshold
        )

        if not 0.5 <= self.threshold < 1.0:
            raise ValueError(
                "Threshold verifier harus berada pada rentang [0.5, 1.0)."
            )

        self.model_version = str(
            checkpoint.get(
                "model_version",
                checkpoint.get(
                    "model_name",
                    "mobilenetv3-small-cocoa-verifier",
                ),
            )
        )

        # Warm-up: pastikan model dapat melakukan inference.
        warmup = Image.new(
            "RGB",
            (image_size, image_size),
            color=(114, 114, 114),
        )

        self.predict(warmup)

    def predict(self, image: Image.Image) -> dict[str, Any]:
        # Letterbox hanya diterapkan sekali melalui self.transform.
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with self.torch.inference_mode():
            logits = self.model(tensor)
            probabilities = self.torch.softmax(
                logits,
                dim=1,
            )[0].detach().cpu().tolist()

        cocoa_probability = float(
            probabilities[CLASS_TO_IDX["cocoa"]]
        )

        non_cocoa_probability = float(
            probabilities[CLASS_TO_IDX["non_cocoa"]]
        )

        detected = cocoa_probability >= self.threshold

        return {
            "cocoa_detected": detected,
            "cocoa_probability": cocoa_probability,
            "non_cocoa_probability": non_cocoa_probability,
            "confidence": (
                cocoa_probability if detected
                else non_cocoa_probability
            ),
            "threshold": self.threshold,
            "model_version": self.model_version,
        }
