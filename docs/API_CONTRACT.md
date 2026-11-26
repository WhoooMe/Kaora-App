# KAORA API Contract

## Health and readiness

### `GET /health`

Returns API availability independently of AI model readiness.

### `GET /api/v1/models/status`

Returns readiness flags. `api=ready` does not imply that AI models are available. `ready_for_calibration` becomes true only after a valid cocoa verifier checkpoint loads and passes a warm-up inference.

## Cocoa calibration verifier — Phase 2

### `POST /api/v1/calibration/verify-frame`

Content type: `multipart/form-data`, required field `file`, optional field `source` (`camera_guide_roi` or `uploaded_image`, default `uploaded_image`).

The current calibration page sends the crop corresponding to the guide region when captured from the camera; user-selected images are passed as whole images. The API runs a binary classifier (`cocoa` versus `non_cocoa`) and basic frame-quality heuristics. Successful response shape:

```json
{
  "verified": true,
  "cocoa_detected": true,
  "guide_roi_checked": true,
  "input_source": "camera_guide_roi",
  "bbox": null,
  "bbox_available": false,
  "image_width": 640,
  "image_height": 640,
  "confidence": 0.93,
  "cocoa_probability": 0.93,
  "threshold": 0.7,
  "quality": {
    "sharpness_score": 122.4,
    "brightness_mean": 127.1,
    "sharpness_ok": true,
    "lighting_ok": true,
    "resolution_ok": true,
    "passed": true
  },
  "model_version": "cocoa-verifier-mobilenetv3-small-v1",
  "rejection_code": null,
  "message": "Objek kakao dikenali dan kualitas frame memenuhi pemeriksaan awal."
}
```

The verifier is a crop classifier and **does not** provide object coordinates. `bbox` is intentionally `null`; `bbox_available=false` prevents the frontend/backend from representing the guide box as a detected object. For camera captures the guide ROI is the crop submitted to the API. For uploaded images, the entire selected image is classified and `guide_roi_checked` is false. Actual fruit localization and multi-fruit detection belong to a later phase.

The quality checks are preliminary heuristics: edge-variance sharpness, grayscale mean brightness, and minimum image dimension. They must be tuned using representative plantation/device frames before operational deployment.

If cocoa probability is below threshold, the API returns HTTP 200 with `verified=false` and `rejection_code=COCOA_NOT_DETECTED`. If quality checks fail, it returns `FRAME_QUALITY_FAILED`. If the checkpoint/dependencies are absent or invalid, it returns HTTP 503 with `MODEL_NOT_READY`.

## Still-image maturity and localization — later phase

### `POST /api/v1/detect/frame`

Still validates the image and returns `MODEL_NOT_READY` until the localization and maturity ensemble are integrated. Planned detection result will include normalized bounding boxes, three-class maturity labels (`Immature`, `Mature`, `Overmature`), per-fruit confidence, and summary counts. No simulated results are returned.

## Live camera integration — later phase

The report describes planned paths:

- `GET /api/v1/cctv/stream/{camera_id}`
- `WS /api/v1/cctv/ws/{camera_id}`

These endpoints are not implemented yet.

## Error structure

Relevant error codes include `UNSUPPORTED_IMAGE_FORMAT`, `FILE_TOO_LARGE`, `INVALID_IMAGE`, `MODEL_NOT_READY`, and `VERIFICATION_FAILED`. A model rejection or quality rejection is a regular 200 response with `verified=false`, not a server failure.
