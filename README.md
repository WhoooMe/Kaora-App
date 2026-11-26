# KAORA App

KAORA is a React + Vite web application prototype for cocoa maturity assessment. Phase 1 adds a real browser-camera calibration screen and FastAPI foundation. Phase 2 adds the binary cocoa-object verifier runtime, a MobileNetV3-Small training pipeline, and frame-quality checks. Calibration remains unavailable until a real verifier checkpoint has been trained and installed.

## Frontend

```bash
npm install
# Windows PowerShell: Copy-Item .env.example .env
# macOS/Linux: cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173` by default. Configure `VITE_API_BASE_URL` in `.env` if the API runs elsewhere.

## Backend API

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API endpoints:

- `GET /health`
- `GET /api/v1/models/status`
- `POST /api/v1/calibration/verify-frame` (`multipart/form-data`, field `file`)
- `POST /api/v1/detect/frame` (`multipart/form-data`, field `file`)

The calibration endpoint now loads a separately trained cocoa-vs-non-cocoa MobileNetV3-Small checkpoint when `models/cocoa_verifier_mobilenet_v3_small.pth` is present. It performs frame-quality checks and returns a real verifier result only after the checkpoint loads and passes warm-up. Since no verifier dataset/checkpoint is included, it will continue to return HTTP 503 `MODEL_NOT_READY` until you train and install one. The maturity and spatial-detection endpoint remains unavailable until those models are integrated. No demo prediction is represented as a real AI result.

## Train the cocoa verifier (Phase 2)

Prepare `data/cocoa_verifier/{train,val,test}/{cocoa,non_cocoa}` with manually labeled images, then follow `backend/scripts/README.md`. Install the optional AI dependencies from `backend` with `python -m pip install -r requirements-ai.txt`. Train from `backend` with:

```powershell
python scripts/train_cocoa_verifier.py --data-dir ../data/cocoa_verifier --epochs 25 --batch-size 32
```

The checkpoint is saved to `models/cocoa_verifier_mobilenet_v3_small.pth`. Restart FastAPI after placing it there. The verifier classifies the crop as cocoa or non-cocoa; it does not generate a bounding box.

## Backend tests

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

## Camera requirements

The browser asks for camera permission. `getUserMedia` requires HTTPS in deployed environments; `localhost` is permitted for local development. Camera access depends on browser permissions and device availability.

## Project documents

- `docs/PROJECT_ROADMAP.md` - phased implementation plan and completion criteria.
- `docs/MODEL_AUDIT.md` - requirements extracted from the research report, notebook results, gaps, and model architecture proposal.
- `docs/PHASE2_COCOA_VERIFIER.md` - Phase 2 implementation details and limits.

## Current maturity labels

The research model has exactly three output classes: `Immature`, `Mature`, and `Overmature`. Other dashboard concepts (for example harvested fruit, damaged fruit, or sensor telemetry) must not be inferred from those three classifier outputs.
