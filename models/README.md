# Model artifacts

## Cocoa object verifier (Phase 2)

Place the trained binary checkpoint here:

- `cocoa_verifier_mobilenet_v3_small.pth`

It must be produced by `backend/scripts/train_cocoa_verifier.py` and contain classes `cocoa=0`, `non_cocoa=1`. The API checks checkpoint architecture, class mapping, loads the weights, and performs a warm-up inference before marking the verifier ready.

The verifier only classifies the image crop; it does not produce object coordinates or multi-fruit detections.

## Maturity classification (later phase)

The separate maturity ensemble requires these artifacts from the Colab notebook:

- `best_resnet18_cocoa_augmented.pth`
- `best_efficientnet_b0_cocoa_augmented.pth`
- `ensemble_config.json`

The notebook maturity classifier contract is three classes: `Immature`, `Mature`, `Overmature`; input 224 x 224 RGB and ImageNet normalization. A binary cocoa verifier cannot replace these models and vice versa.
