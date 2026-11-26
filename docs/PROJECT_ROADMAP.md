# KAORA - Project Roadmap

## Product objective

KAORA is a web application that helps users assess cocoa-fruit maturity from a still image or a live device camera. The research scope defines three maturity classes: `Immature`, `Mature`, and `Overmature`. The web application is intended to visualize detections, fruit positions, maturity counts, analysis history, and camera monitoring.

## Current baseline

- Frontend: React 18 + Vite, with hash-based navigation and an existing green/tropical design system.
- Existing screens: Dashboard, Deteksi Kakao, Analisis Panen, Live Monitor, Kebun dan Blok, Kamera, Riwayat, and Pengaturan.
- Most dashboard values and camera previews are currently hard-coded demo data.
- The existing Deteksi Kakao page simulates camera preview/progress/result; it does not call an AI model.
- FastAPI backend is now included. No trained `.pth` checkpoints are supplied in the archive.
- The Colab notebook trains ResNet18 and EfficientNet-B0 maturity classifiers on 224 x 224 image inputs.

## Implementation phases

### Phase 0 - Audit and scope lock (completed in this iteration)

- Inspect the report, Colab notebook, and existing React project.
- Separate features supported by the report from features that still need data/model work.
- Record the mismatch between the report's ensemble numbers and the notebook's augmented-model evaluation.

**Exit criteria:** agreed class labels, upload/live-camera behavior, model responsibilities, and API contract.

### Phase 1 - Application foundation and camera-calibration UI (starter implementation added)

- Add the dedicated `Kalibrasi Kamera` page.
- Use the real browser camera with `getUserMedia`, display a framing box, capture a crop, and submit it to the API contract.
- Add a FastAPI service skeleton with health/model-status endpoints and image-validation rules.
- Keep all inference endpoints explicitly unavailable until real verifier and detector weights are installed. No simulated result is presented as an AI prediction.

**Exit criteria:** the web app can obtain camera permission, show a live stream, capture/upload a frame, and report API/model readiness accurately.

### Phase 2 - Cocoa-object verification for calibration (runtime/training pipeline implemented; dataset and weights pending)

This is separate from maturity classification.

- [x] Add a MobileNetV3-Small binary verifier runtime (`cocoa` vs `non_cocoa`).
- [x] Add checkpoint validation and warm-up before exposing calibration readiness.
- [x] Add initial sharpness, lighting, and resolution quality gates.
- [x] Connect `POST /api/v1/calibration/verify-frame` to the loaded verifier.
- [x] Add a reproducible training script and dataset layout instructions.
- [ ] Collect and label positive cocoa images and hard-negative images.
- [ ] Train the verifier, review validation/test metrics, and install its checkpoint.
- [ ] Calibrate quality thresholds using field images.
- [ ] Require stable verification across several consecutive live frames before setting live-camera calibration to verified.

**Important:** the current three-class maturity model always chooses among the three cocoa maturity classes. It cannot safely prove that an arbitrary input is cocoa. The new binary model verifies the submitted guide-region crop but does not produce bounding boxes. A browser-drawn bounding box remains only a framing guide, not AI localization.

### Phase 3 - Reproducible maturity ensemble

- Re-run the notebook from a clean runtime and preserve the split manifest and checkpoint files.
- Evaluate ResNet18 and EfficientNet-B0 using the same pre-processing and the same validation/test partitions.
- Add soft-voting probability fusion. Select any fusion weight only on the validation set; use the test set once for final reporting.
- Compare each model and the ensemble with accuracy, macro-F1, weighted-F1, per-class precision/recall/F1, confusion matrix, and (when useful) probability-calibration metrics.
- Export a model bundle with class order, image size, normalization values, architecture names, checkpoint hashes, and ensemble weight.

**Exit criteria:** the ensemble demonstrably improves or at least maintains the metric that matters most (especially `Mature` recall/macro-F1). Do not assume ensemble learning will improve results before comparing error overlap.

### Phase 4 - Spatial multi-fruit localization

The maturity classifiers do not predict bounding boxes. The application needs a separate localization/candidate-generation stage.

- First reproduce the report's baseline: 280 x 280 fixed sliding windows, 140-pixel stride, background texture filter, batched crops, maturity ensemble, confidence threshold 0.70, and NMS IoU 0.35.
- Explicitly resize each window to the classifier's trained input size (224 x 224 in the current notebook) before inference.
- Measure localization precision/recall, duplicate rate, missed-fruit rate, latency per frame, and maturity classification per localized fruit.
- Compare the sliding-window baseline with a dedicated object detector trained on annotated bounding boxes. The fixed-window method should remain only if its measured field performance and latency are acceptable.

### Phase 5 - Production inference API

- Implement `POST /api/v1/calibration/verify-frame` with the trained cocoa verifier.
- Implement `POST /api/v1/detect/image` for uploaded still images.
- Implement a streaming frame endpoint (WebSocket or MJPEG as appropriate) only after still-image inference is stable.
- Return normalized bounding boxes, class labels, confidence values, per-class counts, timing, and model version.
- Keep image validation, upload limits, structured errors, CORS, and model readiness checks.

### Phase 6 - Frontend integration

- Replace the simulated camera in Deteksi Kakao with the actual camera stream.
- Connect image upload to `POST /api/v1/detect/image`.
- Draw returned bounding boxes over the exact source frame and show per-fruit maturity labels and confidence.
- Add a camera flow: start stream -> calibrate/verify cocoa -> run detection -> show live results.
- Remove all demo data from screens that are presented as live AI or operational measurements; mark any remaining sample values as demo.

### Phase 7 - Data, history, and analytics

- Define entities for users, gardens, blocks, cameras, detection sessions, fruit detections, and harvest records.
- Store detection metadata and model version; store images only with an explicit retention policy.
- Distinguish detected fruit counts from harvested fruit counts and sensor readings.
- Derive dashboard charts and trends from stored events rather than hard-coded constants.

### Phase 8 - Hardening and deployment

- Add authentication/authorization, camera-device ownership, audit logging, rate limits, and secure secret management.
- Test low light, sunlight, shadows, occlusion, distance, camera motion, and different cocoa varieties.
- Profile CPU/GPU inference and optionally export to ONNX after the PyTorch implementation is stable.
- Deploy frontend and API behind HTTPS; `getUserMedia` requires a secure context except on localhost.

## Suggested engineering sequence

1. Prepare and label the binary cocoa-verifier dataset, then train/evaluate its checkpoint using the Phase 2 pipeline.
2. Obtain/export the two maturity `.pth` checkpoints and complete the ensemble validation extension in the notebook.
3. Reproduce spatial detection on a small manually annotated field test set.
4. Integrate still-image inference first, then live camera streaming.
5. Replace demo dashboard metrics with persisted API data.

## Definition of done for the complete application

- A non-cocoa object never receives a valid cocoa calibration state.
- A single image upload and a live camera frame use the same inference contract and preprocessing.
- Every displayed fruit has a spatial box, one of the three defined maturity classes, and a confidence value.
- Counts equal the detections shown on the same frame/session.
- Ensemble results are traceable to the exact two checkpoints and fusion weight.
- UI labels distinguish AI detection, harvest records, sensor telemetry, and demo/sample data.
- Automated tests cover API validation, model-not-ready errors, inference response schemas, and frontend camera failure states.
