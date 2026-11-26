from __future__ import annotations

from PIL import Image, ImageFilter, ImageOps, ImageStat


def inspect_frame_quality(image: Image.Image) -> dict:
    """Return conservative, explainable frame-quality checks.

    The sharpness score is a simple edge-variance heuristic, not a calibrated
    camera-quality metric. Thresholds should be tuned using representative
    field images before production use.
    """
    rgb = ImageOps.exif_transpose(image).convert("RGB")
    gray = rgb.convert("L")
    brightness = float(ImageStat.Stat(gray).mean[0])
    edge_variance = float(ImageStat.Stat(gray.filter(ImageFilter.FIND_EDGES)).var[0])
    min_side = min(rgb.size)

    quality = {
        "sharpness_score": round(edge_variance, 2),
        "brightness_mean": round(brightness, 2),
        "sharpness_ok": edge_variance >= 8.0,
        "lighting_ok": 25.0 <= brightness <= 235.0,
        "resolution_ok": min_side >= 96,
    }
    quality["passed"] = all(quality[key] for key in ("sharpness_ok", "lighting_ok", "resolution_ok"))
    return quality
