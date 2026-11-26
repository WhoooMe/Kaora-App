# KAORA - Research and Model Audit

## 1. Requirements read from the report

The report describes three maturity classes: `Immature`, `Mature`, and `Overmature`. It identifies three main questions: maturity classification from digital images, spatial position/count/status of multiple cocoa fruits, and integration into a real-time monitoring interface.

The report's stated dataset is Kaggle Cocoa Ripeness Dataset TCS-01 with 478 images. The reported stratified partition is 60% train (285 images), 20% validation (95), and 20% test (96). The report's spatial baseline is a 280 x 280 fixed sliding window with 140-pixel stride, minimum confidence 70%, and NMS IoU threshold 0.35. It describes FastAPI endpoints for uploaded images, camera streams, and WebSocket telemetry.

Source locations: report pages 4-6 (research scope and limitations), pages 12-17 (method and implementation description), and pages 18-19 (conclusion and future work).

## 2. Existing notebook evidence

The uploaded notebook uses `ImageFolder`, ResNet18, and EfficientNet-B0. The final revised training section creates an offline-augmented training set only from the 285 original training images:

| Class | Original train | Generated augmentations | Final train |
|---|---:|---:|---:|
| Immature | 157 | 0 | 157 |
| Mature | 46 | 111 | 157 |
| Overmature | 82 | 75 | 157 |
| **Total** | **285** | **186** | **471** |

Validation (95 images) and test (96 images) are read from the original, non-augmented folders. This is the correct direction for avoiding augmentation copies in validation/test.

The notebook's recorded final augmented-model results are:

| Metric | ResNet18 | EfficientNet-B0 |
|---|---:|---:|
| Best validation accuracy | 93.68% (epoch 9) | 97.89% (epoch 5) |
| Test accuracy | 93.75% | 96.88% |
| Test macro-F1 | 90.25% | 95.34% |
| Mature precision | 80.00% | 92.86% |
| Mature recall | 80.00% | 86.67% |
| Mature F1 | 80.00% | 89.66% |

The test set has 96 images: 53 Immature, 15 Mature, and 28 Overmature. With only 15 `Mature` test images, each individual sample changes that class recall by 6.67 percentage points. Treat small differences cautiously and add a separate field test set before making production claims.

## 3. Evidence gaps and inconsistencies

1. **Report vs notebook results:** the report says both ResNet18 and EfficientNet-B0 achieve 96.88% test accuracy and weighted average F1-score 96.92%, and describes equal-average ensemble probabilities. The final augmented evaluation outputs in the notebook instead show ResNet18 at 93.75% accuracy / 90.25% macro-F1 and EfficientNet-B0 at 96.88% / 95.34% macro-F1.
2. **No ensemble evaluation in the submitted notebook:** it evaluates each network separately and contains a before/after comparison, but does not calculate the joint ResNet18 + EfficientNet-B0 probabilities or an ensemble classification report.
3. **No trained localization model:** the notebook performs whole-image maturity classification. It does not train a bounding-box detector. Spatial localization is described in the report as a sliding-window algorithm, but that inference code is not part of the notebook supplied here.
4. **No cocoa-vs-non-cocoa verifier:** the three maturity classes assume the input is already a cocoa fruit. The classifier cannot reliably reject leaves, branches, other fruit, or empty background.
5. **Input-size contract needs to be explicit:** the report section on augmentation describes a 505 x 505 resize, the report spatial pipeline describes 280 x 280 sliding windows, while the final notebook checkpoints resize classifier inputs to 224 x 224. For the submitted checkpoints, each 280 x 280 candidate window must be resized to 224 x 224 before inference. If 505 x 505 is the intended final classifier input, the models must be retrained and evaluated with that input contract.
6. **Split verification can be stronger:** the notebook checks file-name disjointness and augmentation origin, but does not compare image hashes/perceptual hashes or group photographs by source tree/session. Near-duplicate or same-scene images may still cross partitions.
7. **Checkpoint files are missing from the uploaded project:** the notebook refers to Google Drive checkpoint paths, but the submitted web archive does not contain either `.pth` checkpoint. The actual weights must be exported and supplied before the API can run inference.

## 4. Model architecture recommendation

Use distinct modules for distinct responsibilities:

1. `CocoaVerifier`: confirms whether the framed object is actually a cocoa pod and returns a localization/quality signal for calibration.
2. `FruitLocalizer`: proposes candidate fruit boxes in a full scene. The report's sliding-window method can be the baseline; a dedicated object detector should be benchmarked if annotations are available.
3. `MaturityEnsemble`: evaluates each localized cocoa crop with ResNet18 and EfficientNet-B0 and combines class probabilities.
4. `ResultAggregator`: removes duplicate boxes with NMS, maps class indexes to stable labels, and calculates counts.

The ensemble should be described as soft voting:

`P_ensemble = alpha * P_resnet + (1 - alpha) * P_efficientnet`

Start with alpha = 0.5 as the report's baseline. If tuning alpha, use validation data only. Do not choose alpha based on test-set metrics. Use the test set only for the final comparison.

## 5. Calibration feature definition

For the user-facing flow, "calibration" means **object/framing verification**, not intrinsic camera-lens calibration:

- Browser permission is granted and a camera stream is available.
- A visual guide box helps the user position one pod.
- A frame/crop is sent to the backend.
- The cocoa verifier confirms the presence of cocoa and checks framing/quality.
- Live mode should require a stable result over multiple consecutive frames before declaring success.
- Only after successful verification should the app enable maturity analysis.

A visual rectangle alone is not verification. The current UI implementation is intentionally labelled as a guide, and the API returns `MODEL_NOT_READY` until real weights and verifier logic are added.
