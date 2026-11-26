
from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image

from .preprocessing import (
    IMAGE_SIZE,
    build_inference_transform,
)

MATURITY_CLASSES = [
    "Immature",
    "Mature",
    "Overmature",
]


class MaturityClassifier:
    """ResNet18 classifier for three cocoa maturity classes."""

    def __init__(self, checkpoint_path: str | Path) -> None:
        import torch
        import torch.nn as nn
        from torchvision.models import resnet18

        self.torch = torch
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        checkpoint_path = Path(checkpoint_path)

        if not checkpoint_path.is_file():
            raise FileNotFoundError(
                f"Checkpoint ResNet18 tidak ditemukan: {checkpoint_path}"
            )

        checkpoint = torch.load(
            str(checkpoint_path),
            map_location=self.device,
            weights_only=True,
        )

        if not isinstance(checkpoint, dict):
            raise ValueError("Format checkpoint ResNet18 tidak valid.")

        # File ekspor Colab berisi state_dict secara langsung.
        # Format wrapper model_state_dict tetap didukung.
        state_dict = checkpoint.get(
            "model_state_dict",
            checkpoint,
        )

        if not isinstance(state_dict, dict):
            raise ValueError("State dictionary ResNet18 tidak valid.")

        self.model = resnet18(weights=None)
        self.model.fc = nn.Linear(
            self.model.fc.in_features,
            len(MATURITY_CLASSES),
        )

        # strict=True memastikan arsitektur dan seluruh parameter cocok.
        self.model.load_state_dict(
            state_dict,
            strict=True,
        )

        self.model.to(self.device)
        self.model.eval()

        self.image_size = IMAGE_SIZE

        self.transform = build_inference_transform(
            image_size=self.image_size,
        )

        self.model_version = "resnet18-cocoa-maturity"

        # Warm-up sebelum model dianggap siap.
        warmup = Image.new(
            "RGB",
            (self.image_size, self.image_size),
            color=(114, 114, 114),
        )

        self.predict(warmup)

    def predict(self, image: Image.Image) -> dict[str, Any]:
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with self.torch.inference_mode():
            logits = self.model(tensor)

            probabilities = self.torch.softmax(
                logits,
                dim=1,
            )[0].detach().cpu().tolist()

        predicted_index = max(
            range(len(probabilities)),
            key=lambda index: probabilities[index],
        )

        maturity_class = MATURITY_CLASSES[predicted_index]

        probability_map = {
            class_name: float(probability)
            for class_name, probability in zip(
                MATURITY_CLASSES,
                probabilities,
            )
        }

        return {
            "maturity_class": maturity_class,
            "confidence": float(probabilities[predicted_index]),
            "probabilities": probability_map,
            "model_version": self.model_version,
        }
