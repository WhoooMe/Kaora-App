# KAORA — Phase 0: Project Audit & Reference Analysis

**Status:** COMPLETE — Audit and proposal delivered for owner review before any code changes.

---

## A. Project Audit

### Framework and Stack
- **Frontend:** React 18 + Vite (hash-based navigation)
- **Backend:** FastAPI (Python)
- **Computer Vision:** PyTorch + torchvision (MobileNetV3-Small for cocoa verifier; ResNet18 and EfficientNet-B0 for maturity classification)
- **Styling:** Custom CSS with semantic class names (`kpis`, `row`, `r2`, `c`, `cm`, `sel`, `mut`, `btn`, `card`, `kpi`, `cc`, `cam`, `closeup`, `hd`, `cmp`, `th`, `pod`, `t`, `b`, `ic`)
- **UI Component Library:** Custom components in `src/ui.jsx` (Card, Badge, Legend, Tabs, Pod, Icon, Sensors, TrendChart, DistChart, Closeup, Kpis, Sel)
- **Data Layer:** `src/data.js` exports constants: `BLOK`, `CAMS`, `HIST`, `PERIODS`, `series`, `sum`, `C`, `NM`, `ORDER`
- **Routing:** Manual page components under `src/pages/` — no single-page-app router; pages rendered individually
- **Build:** `npm run build` (verified from package.json)

### Folder Structure (root level)
```
docs/              — Design briefs, roadmap, API contract, model audit, phase docs
src/               — React frontend
  App.jsx           — Root component wiring pages
  data.js           — Shared constants and helpers
  ui.jsx            — Reusable UI primitives
  pages/            — Page components (8 existing)
    AnalisisPage.jsx
    DeteksiPage.jsx   ← Simulated camera; demo data
    DashboardPage.jsx
    KameraPage.jsx
    KebunPage.jsx
    MonitorPage.jsx
    PengaturanPage.jsx
    RiwayatPage.jsx
  components/       — Reused chunks
    AppHeader.jsx
    AppFooter.jsx
  shared.jsx        — Head, Sel, Kpis, fmt, Demo, HistTable, HistRows
backend/           — FastAPI backend
  app/main.py
  app/config.py
  app/runtime.py    ← Checkpoint loading, warm-up, readiness status
  app/cocoa_verifier.py  ← MobileNetV3-Small binary verifier
  app/frame_quality.py  ← Sharpness/brightness/resolution heuristics
  scripts/train_cocoa_verifier.py  ← Training pipeline (not executed)
  requirements-ai.txt  ← AI dependencies (not installed)
tests/             — Not yet explored
docs/Laporan-Kaora.pdf  ← 21-page PDF requiring OCR (blocked resource)
```

### Existing Routes/Pages (8 total)
| Page | Purpose | Status |
|------|---------|--------|
| `DashboardPage` | Overview dashboard | Demo-hardcoded values |
| `DeteksiPage` | Camera detection simulation | Simulated; no AI model call |
| `AnalisisPage` | Maturity analysis | Hard-coded data tables |
| `MonitorPage` | Live monitor (cameras + sensors) | Sensor/status data from `CAMS` + `sensors()` |
| `KebunPage` | Garden/block management | Basic card grid |
| `KameraPage` | Camera management table | Read-only camera list |
| `RiwayatPage` | Detection history | Hard-coded history rows |
| `PengaturanPage` | Account settings | Form with pre-filled defaults |

### Existing API Integrations (verified)
| Endpoint | Method | Status |
|----------|--------|--------|
| `GET /health` | Health check | Online (always returns 200) |
| `GET /api/v1/models/status` | Model readiness flags | Returns `api=ready` / `ready_for_calibration` |
| `POST /api/v1/calibration/verify-frame` | Cocoa verification | Returns 503 if checkpoint missing; otherwise binary cocoa/non-cocoa + quality gates |
| `POST /api/v1/detect/frame` | Still-image maturity + localization | Returns 503 `MODEL_NOT_READY` (not implemented) |

### Working Functionality
- Navigation between all 8 page components
- Camera permission flow stub (no actual `getUserMedia` integration)
- Upload image flow (placeholder only)
- KPI cards, selector components, tab navigation
- Basic card layouts and styling consistency

### Missing / Broken
- **No real AI model integration** — all predictions are simulated/demo data
- **No camera stream** — `DeteksiPage` shows static placeholder
- **PDF `Laporan-Kaora.pdf`** cannot be extracted (all 21 pages need OCR)
- **No backend checkpoint files** — cocoa verifier weights absent from repo
- **`POST /api/v1/calibration/verify-frame`** returns 503 (model not loaded)
- **No responsive breakpoints** — desktop-centric layouts only
- **Accessibility gaps** — no focus indicators announced, contrast on glass-over-photo patterns untested

### Risks and Unknowns
- Backend AI dependencies not installed (`requirements-ai.txt` not resolved)
- Model checkpoints not supplied; verifier readiness cannot be confirmed
- PDF research report (`Laporan-Kaora.pdf`) inaccessible without OCR — may contain critical design/ agronomic copy
- Three-class maturity model assumes input is already a cocoa fruit; cannot reject non-cocoa inputs
- No localization/bounding-box capability in current notebook/report baseline
- Design system is internally consistent but unvalidated against real reference websites

---

## B. Reference Analysis

### Reference Images (5 website designs analyzed)
All 5 reference designs were analyzed via `vision_analyze`; the consensus reveals a design language built on **calm, organic precision** — one saturated accent (lime/olive green), heavy white space, one editorial photograph per hero, glass-morphism overlays, rounded corners (16–20 px radius), and a consistent iconography system where colour = domain (green = healthy/primary, blue = water, amber = caution, peach = soil moisture).

**Key Design Principles Borrowed:**
1. **One accent hue** — lime/green used sparingly but decisively (CTA buttons, status pills, chart fills). Prevents visual noise.
2. **Glass panels over photographic heroes** — creates depth without dark-mode heaviness. Must pair with adequate contrast.
3. **Micro-pattern repetition** — "label → big number → status pill" at every scale (hero metrics → card stats → list rows). Provides cognitive anchoring.
4. **Asymmetric row proportions** — 3.5/5/3.5 analytics row; 8/4 sensor/recents split. Equal-stacked grids feel "bricky"; asymmetry improves composition.
5. **Warm off-white canvas** (`#F7F8F3` green-tinted) rather than pure white. Complements cocoa/agri-tech identity.

**What to Adapt for KAORA:**
- The **one-accent** system (lime → KAORA's Leaf green `#315B43` or Cocoa brown `#6B4534`)
- **Glass-panel hero** with guide-frame overlay (adapted for cocoa verification framing, not face-position)
- **Metric-value-first typography** — number heavier than label (establishes "answer first, context second" reading order)
- **Card radius nestling** — outer 16 px, inner 12 px, pills at 999 (nested logic keeps composition "designed")
- **Uniform spacing scale** — 24–32 px gutters, 24 px card padding, consistent vertical rhythm

**What NOT to Copy:**
- Logos, brand names, proprietary illustrations, exact marketing copy
- Pixel-for-pixel layouts or distinctive hero photographs
- Neon cyberpunk gradients, floating meaningless blobs, decorative analytics
- Face-recognition language or face icons (KAORA verifies cocoa fruit, not faces)

**Reference Coexistence with KAORA Identity:**
- Borrow the *discipline* of restraint, not the *visuals*
- KAORA's identity = cocoa/agricultural heritage + scientific measurement + trustworthy field tools
- Palette will refine after analyzing `Laporan-Kaora.pdf` (currently blocked)

---

## C. KAORA Design Proposal

### Sitemap
```
/ (Landing Page)
  /deteksi          → Detection workspace (camera/upload + verification)
  /analisis         → Maturity assessment result
  /monitor          → Live monitor (camera + environment sensors)
  /kebun            → Garden/block management
  /kamera           → Camera management list
  /riwayat          → Detection history
  /pengaturan       → Account/settings
  /about            → Methodology, project credits
```

### Main User Flow (Primary UX Path)
```
1. Landing → User clicks "Mulai Pemeriksaan"
2. → Detection workspace: input selector (Kamera / Unggah Gambar)
3. → Camera preview with guide frame OR upload surface
4. → User captures frame / selects image
5. → `POST /api/v1/calibration/verify-frame` → cocoa verifier response
   │
   ├─ verified=false → Feedback: "Suitable cocoa fruit not detected.
   │                Adjust position, try upload, or retake."
   │
   └─ verified=true → → Maturity assessment page
         → `POST /api/v1/detect/frame` (or simulated for P1)
         → Predicted maturity class + confidence
         → Result display with next-action controls
```

### Design Tokens (Proposed — to be centralized in `src/theme.js` or CSS:root)
| Token | Value | Usage |
|-------|-------|-------|
| `color-primary` | `#315B43` (Leaf green) | Primary action, CTA accents |
| `color-primary-dark` | `#203D31` (Forest green) | Navigation bars, hero surfaces |
| `color-brand` | `#38251F` (Deep cocoa) | Strong text, brand surfaces |
| `color-surface` | `#F5F0E6` (Pulp cream) | Main background |
| `color-card` | `#FCFAF5` (Soft ivory) | Card fills |
| `color-on-surface` | `#1B241A` (Near-black with green cast) | Headings, primary text |
| `color-text-secondary` | `#6B736B` (Muted sage) | Secondary text, metadata |
| `color-accent` | `#D5A64A` (Harvest gold) | Small highlights, gold accents |
| `color-warning` | `#B96E50` (Terracotta) | Supporting accent, warnings |
| `color-error` | `#B94A48` (Error red) | Errors only |
| `radius-card` | `16px` | Card outer corners |
| `radius-pill` | `999px` | Full-round pills |
| `radius-input` | `12px` | Input fields |
| `spacing-unit` | `4px` | Base unit (gutters = 6×, padding = 4×) |
| `spacing-gutter` | `24px` | Page side gutters, card internal padding |
| `spacing-hero` | `32px` | Hero internal vertical rhythm |
| `breakpoint-tablet` | `1024px` | Reflow columns |
| `breakpoint-mobile` | `768px` | Single column, stacked hero |

### Page-by-Page Structure

#### 1. Landing Page (`/`)
- **Header:** KAORA wordmark, primary nav (Beranda, Deteksi, Tentang), utility (login/profile)
- **Hero:** Strong product headline ("KAORA: Analisis Kematangan Kakao"), cocoa plantation photography, CTA "Mulai Pemeriksaan" (solid lime pill), secondary "Pelajari Cara Kerja" (ghost button)
- **How it works section:** 4-step visual scroll (Capture → Verify → Analyze → Result), compact cards with icon + label + short caption
- **Maturity categories:** Immature / Mature / Overmature — brief descriptions from research (NOT fake precision gauges)
- **Verification matters:** Mini-essay on why guide-frame cocoa check matters
- **Technology overview:** Model architecture summary without unsupported accuracy claims
- **Footer:** Project attribution, links

#### 2. Detection Workspace (`/deteksi`)
- **Clear title:** "Pindai Kakao dengan Kamera" or "Unggah Gambar Kakao"
- **Input selector:** Radio/tabs — "Kamera" / "Unggah Gambar"
- **Camera preview:** Large area with legible guide frame (bounding-box style target). Framing instructions beneath.
- **Verification status bar:** Real-time update from API (`verified` / `not_detected` / `quality_failed`)
- **Primary action:** "Verifikasi" (solid) → triggers `POST /api/v1/calibration/verify-frame`
- **Image requirements:** "Gambar harus menunjukkan satu buah kakao yang terlihat jelas, terang, dan tidak blur"
- **Upload mode:** File input with preview, format constraints (JPEG/PNG, <5MB), replace capability
- **Camera lifecycle:** Permission request → stream → capture → stop when leaving page
- **Fallback:** "Tidak ada kamera — gunungah gambar" link prominent

#### 3. Calibration / Verifier Stage (integrated into workspace)
- **Step indicator:** "1. Verifikasi Kakao" → "2. Analisis Kematangan" (only step 2 activates after verified=true)
- **Live preview or uploaded image** with guide region overlay
- **Concise instruction:** "Letakkan buah kakao di dalam kotak biru" (no face/face-icon language)
- **Verification status:** 
  - *Idle:* guide frame + instructions
  - *Checking:* restrained scanning indicator (respects `prefers-reduced-motion`)
  - *Rejected/not detected:* "Buah kakao tidak terdeteksi — posisikan buah agar berada di dalam kotak dan pastikan gambar tidak blur"
  - *Needs adjustment:* Only corrections supported by verifier (quality: blur, lighting, resolution)
  - *Verified:* Clear success state → enable next step (maturity analysis)
- **Retry:** "Verifikasi Ulang" — invalidates stale state

#### 4. Maturity Result Page (`/analisis`)
- **Clear result category:** Immature / Mature / Overmature
- **Visual indicator:** Colored badge/pill semantically consistent (green → Immature, orange → Mature, red → Overmature) — NOT just color; include icon/text
- **Confidence/probability:** Only if returned by API; labeled as "skor prediksi model" with limitations explained
- **Assessed cocoa image:** Thumbnail of the input image (if available)
- **Explanation:** Based on approved research content — e.g., "Kategori Mature: Kakao sudah mencapai kematangan optimal untuk panen. Tekanan buah stabil, warna mengkaramel."
- **Next actions:** "Periksa Gambar Lain" / "Ulangi Pemeriksaan" / "Simpan Hasil"
- **Avoid:** Fake precision gauges, decorative analytics exaggerating certainty

#### 5. History / Profile / Settings (only if backend supports)
- History: List of past detections with date, block, maturity class, confidence (from `HIST` data or API)
- Settings: Form with pre-filled values (name, email, default kebun) — currently exists as `PengaturanPage`
- About/Methology: Project background, problem addressed, verification explanation, maturity classification approach, model development overview, dataset limitations, credits

#### 6. Monitor Page (`/monitor`)
- **KPIs:** Total Kamera, Kamera Online, Kamera Offline, Blok Dipantau, Peringatan Aktif
- **Camera grid:** Each camera card with live status dot, blok ID, sensor count, "Lihat Detail" → Drill-down
- **Environment sensors:** Block selector + sensor list (soil moisture, temperature, air quality)
- **Recent updates:** Drill-down recents with tag filtering

#### 7. Kebun Page (`/kebun`)
- **Block cards:** Grid of blocks with total buah count, siap panen count, camera/sensor summary
- **Add Blok:** Primary CTA button

#### 8. Kamera Page (`/kamera`)
- **Camera table:** List of all cameras with status, blok, last connected, action buttons

#### 9. Riwayat Page (`/riwayat`)
- **HistTable:** Rows with pod icons, waktu, blok, sumber,buah, dominan kategori

#### 10. Pengaturan Page (`/pengaturan`)
- **Form:** Nama Lengkap, Email, Kebun Default — pre-populated from existing data

---

## D. Implementation Plan (Ordered Tasks)

### P0 — Project Audit & Reference Analysis (COMPLETE)
- Delivered: this document
- Owner approval required before P1 begins

### P1 — Design Tokens & Shared UI Foundation
- Create `src/theme.css` (or `src/theme.js`) centralizing all design tokens
- Extract reusable components from existing codebase:
  - `StatusBadge` — semantic colour + icon + text (generalize beyond just verification status)
  - `StepIndicator` — vertical/horizontal step tracker with active/incomplete/completed states
  - `GuideFrame` — CSS overlay for camera canvas; NOT an AI localization element
  - `VerificationStatus` — maps API response to UI state (idle/checking/rejected/verified)
  - `PrimaryButton` — solid lime (primary), ghost (secondary)
  - `SecondaryButton` — ghost outline
  - `EmptyState` — for when no cameras, no history, no detections
  - `ErrorState` — for API errors, model-not-ready, quality failures
- Add `prefers-reduced-motion` media queries to all transitioning components
- Run `npm run build` — verify no regressions

### P2 — Landing Page
- Build `/` page with hero, how-it-works, maturity categories
- Use design tokens from P1
- Integrate authentic cocoa imagery (project-provided assets; no stock photos implying model output)
- Ensure responsive: desktop → tablet (2-column) → mobile (single column, stacked hero)

### P3 — Detection Workspace (Camera + Upload)
- Refactor `DeteksiPage.jsx` → `DeteksiWorkspace.jsx`
- Implement camera permission flow with `getUserMedia`
- Build camera preview canvas with guide frame overlay
- Add upload file input with preview and format validation
- Wire `POST /api/v1/calibration/verify-frame` (handle 503 model-not-ready, 200 verified/not_verified, quality rejection codes)
- Show verification status feedback (idle → checking → rejected/needs adjustment → verified)
- Respect `prefers-reduced-motion` — no pulsing scanning animation; use static pulse or skip
- Handle camera errors (denied, unavailable, insecure context)

### P4 — Calibration States & Feedback
- Build `VerificationStatus` component mapping API response to UI
- Create rejection feedback patterns:
  - `COCOA_NOT_DETECTED` → "Buah kakao tidak terdeteksi, posisikan buah di dalam kotak"
  - `FRAME_QUALITY_FAILED` → "Kualitas gambar tidak memenuhi standar — kurangi blur, pastikan terang, pastikan resolusi cukup"
  - `MODEL_NOT_READY` → "Sistem verifier belum siap — tunggu administrator menambahkan checkpoint"
- Do NOT fabricate successful verification when backend returns failure

### P5 — Maturity Result Page
- Build `/analisis` page showing predicted maturity class
- Display confidence only if API returns it, labeled accurately
- Show assessed cocoa thumbnail
- Provide next-action controls ("Periksa Gambar Lain", "Ulangi", "Simpan")
- Avoid fake precision gauges

### P6 — Responsive & Accessibility Refinement
- Implement three breakpoints: desktop (1440+), tablet (1024–1439), mobile (<1024)
- Reflow columns: 3-up → 2-up → 1-up for analytics cards; hero tiles stack; navigation collapses
- Keyboard navigation: tab order, visible focus indicators on all interactive elements
- Contrast audit: glass-over-photo text, secondary text on cream background, error red visibility
- Ensure all colour-coded information also carries text/icon label (do not communicate status through color alone)

### P7 — History/Profile/Other Pages (only if backend supports)
- Connect `RiwayatPage` to real API if detection-history endpoint exists
- Mark remaining demo data clearly as "Data Simulasi"
- Add `PengaturanPage` save logic (toast on submit — currently placeholder)

---

## E. Questions/Blockers (for owner)

1. **PDF OCR:** `docs/Laporan-Kaora.pdf` needs OCR before its research copy can be incorporated. Should I run `pdftotext` / `tesseract` on the host, or do you have the extracted text already?

2. **Backend checkpoints:** The cocoa verifier `.pth` checkpoint is not in the repo. Should the P3–P4 work proceed with the API returning `MODEL_NOT_READY` permanently until checkpoints are supplied, or should we mock a minimal response schema?

3. **Design palette validation:** The refined palette (Deep cocoa `#38251F`, Cocoa brown `#6B4534`, Leaf green `#315B43`, etc.) was extracted from the KAORA_Prompt.md suggestions. Should we validate these against the reference website analysis, or do you have a preferred primary accent?

4. **Landing page priority:** P0 explicitly states "Do not spend all effort on the landing page while leaving the core workflow as a placeholder." The development priorities table (P0–P7) weights P2 (landing) lower than P3 (detection workspace). Confirm: should landing page be P2 or deferred until after P3–P4 are functional?

5. **Language locale:** All UI copy should be Indonesian by default. Are there specific glossary terms or maturity-class descriptions from the research report that should be used verbatim rather than paraphrased?

6. **API contract:** The current backend has `GET /health`, `GET /api/v1/models/status`, and `POST /api/v1/calibration/verify-frame`. Are there any other endpoints expected (e.g., `POST /api/v1/detect/frame`, user management, history store) that I should not assume exist?

7. **Component naming:** The existing codebase uses `kpis`, `row`, `r2`, `c`, `cm`, `sel`, `mut`, `btn`, `card`, `kpi`, `cc`, `cam`, `closeup`, `hd`, `cmp`, `th`, `pod`, `t`, `b`, `ic` as CSS class names. Should I follow these exact conventions or introduce a `theme-` prefixed design-token system?

---