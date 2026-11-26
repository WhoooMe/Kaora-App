from __future__ import annotations

from PIL import Image, ImageOps

IMAGE_SIZE = 224
LETTERBOX_COLOR = (114, 114, 114)
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def letterbox_resize(
    image: Image.Image,
    target_size: int = IMAGE_SIZE,
    pad_color: tuple[int, int, int] = LETTERBOX_COLOR,
) -> Image.Image:
    """Apply EXIF orientation correction, convert to RGB, and letterbox-resize to target_size x target_size.

    Matches the Google Colab training preprocessing contract:
    - Input: RGB
    - EXIF orientation correction
    - Preserve aspect ratio
    - Bilinear resize interpolation
    - Letterbox padding color RGB (114, 114, 114)
    """
    rgb = ImageOps.exif_transpose(image).convert("RGB")
    width, height = rgb.size
    if width <= 0 or height <= 0:
        raise ValueError("Dimensi gambar tidak valid.")

    scale = min(target_size / width, target_size / height)
    new_width = max(1, int(round(width * scale)))
    new_height = max(1, int(round(height * scale)))

    resized = rgb.resize((new_width, new_height), Image.Resampling.BILINEAR)
    canvas = Image.new("RGB", (target_size, target_size), pad_color)
    offset_x = (target_size - new_width) // 2
    offset_y = (target_size - new_height) // 2
    canvas.paste(resized, (offset_x, offset_y))
    return canvas


def build_inference_transform(
    image_size: int = IMAGE_SIZE,
    mean: tuple[float, float, float] = IMAGENET_MEAN,
    std: tuple[float, float, float] = IMAGENET_STD,
):
    """Build the torchvision transform applied after letterbox_resize."""
    from torchvision import transforms

    return transforms.Compose(
        [
            transforms.Lambda(lambda img: letterbox_resize(img, target_size=image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ]
    )
