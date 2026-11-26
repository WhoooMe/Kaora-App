# KAORA Phase 2 — Cocoa Object Verification

## Scope

Phase 2 implements a dedicated binary verifier for the calibration feature. It is separate from the ResNet18 and EfficientNet-B0 maturity classifier. Its classes are `cocoa` and `non_cocoa`.

The calibration interface captures/crops its guide region and posts that crop to `POST /api/v1/calibration/verify-frame`. The verifier can determine whether the crop resembles a cocoa pod, but it does not predict fruit coordinates. Therefore the API keeps `bbox=null` and `bbox_available=false` until an actual localizer is implemented.

## Components

- `backend/app/cocoa_verifier.py`: MobileNetV3-Small architecture, checkpoint compatibility checks, preprocessing and prediction.
- `backend/app/frame_quality.py`: basic image sharpness, brightness and resolution checks.
- `backend/app/runtime.py`: checkpoint loading, warm-up, readiness status and inference registry.
- `backend/scripts/train_cocoa_verifier.py`: reproducible binary classifier training and test evaluation.
- `backend/scripts/README.md`: dataset structure, training instructions and caveats.

## Important limitations

1. The current Cocoa Ripeness TCS-01 dataset described in the report and notebook has only the maturity labels `Immature`, `Mature`, and `Overmature`. It is not by itself a complete cocoa-vs-non-cocoa dataset.
2. The binary verifier must be trained with both positive cocoa-pod images and hard-negative images. Do not simply relabel maturity classes as non-cocoa.
3. The frame-quality checks are heuristics and need empirical tuning.
4. The classifier does not localize the pod. A later detection/localization component is required for fruit bounding boxes, multiple fruits, and object-size checks.
5. Do not enable calibration readiness until a real checkpoint loads and its validation/test metrics are reviewed.

## Acceptance criteria

- API remains online when AI dependencies/checkpoint are absent.
- Verifier readiness remains false when no valid checkpoint exists.
- A loaded checkpoint is warmed up before the API reports ready.
- Cocoa/non-cocoa predictions are returned from the trained model only.
- Poor quality frames are rejected with an explicit reason.
- API never fabricates a bounding box from the UI guide box.
- Automated API tests cover missing model, accepted cocoa, rejected non-cocoa, and invalid uploads.
