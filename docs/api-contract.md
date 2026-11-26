# KAORA API Contract

Dokumen ini mendefinisikan kontrak API resmi antara frontend React (`src/api/kaoraApi.js`) dan backend FastAPI (`backend/app/main.py`).

## Base URL & Konfigurasi

- Development default: `http://localhost:8000` (dikonfigurasi via `VITE_API_BASE_URL` di frontend).
- Direktori model backend: `KAORA_MODEL_DIR` (default: `backend/models`).
- Penyimpanan gambar: `KAORA_UPLOAD_DIR` (default: `backend/storage/uploads`, kompatibel untuk migrasi ke object storage via abstraksi `StorageBackend`).

---

## Arsitektur Model & Kontrak Preprocessing

Arsitektur inferensi aktif KAORA terdiri dari:
1. **MobileNetV3-Small** (`backend/models/mobilenetv3_verifier.pth`): Cocoa Verifier biner (`0 = non_cocoa`, `1 = cocoa`).
2. **ResNet18** (`backend/models/resnet18_maturity.pth`): Maturity Classifier 3 kelas (`0 = Immature`, `1 = Mature`, `2 = Overmature`).

`EfficientNet-B0`, `Weighted Soft Voting`, dan `AI Object Localization` tidak diaktifkan pada konfigurasi inferensi final.

Seluruh model inferensi (`CocoaVerifier`, `ResNet18`) menggunakan preprocessing yang identik dengan pipeline training:

- Koreksi orientasi EXIF (`ImageOps.exif_transpose`)
- Konversi ruang warna: `RGB`
- Dimensi input: `224 × 224`
- Mempertahankan aspect ratio dengan letterbox padding
- Warna letterbox padding: `RGB (114, 114, 114)`
- Interpolasi resize: `bilinear`
- Normalisasi ImageNet:
  - `mean = [0.485, 0.456, 0.406]`
  - `std  = [0.229, 0.224, 0.225]`

### Pemetaan Kelas

- **Cocoa Verifier (MobileNetV3-Small):**
  - `0 = non_cocoa`
  - `1 = cocoa`
- **Maturity Classifier (ResNet18):**
  - `0 = Immature` (Label UI: `Belum matang`)
  - `1 = Mature` (Label UI: `Matang`)
  - `2 = Overmature` (Label UI: `Lewat matang`)

---

## Kode Error Eksplisit

Semua respons error menggunakan format JSON:

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Pesan penjelasan dalam Bahasa Indonesia."
  }
}
```

| Code | HTTP Status | Keterangan |
|---|---|---|
| `MODEL_NOT_READY` | `503` | Checkpoint model belum tersedia atau gagal warm-up. Tidak ada prediksi simulasi yang dikembalikan. |
| `COCOA_NOT_DETECTED` | `200` (field `rejection_code`) / `422` | Verifikator menyimpulkan frame bukan objek buah kakao (`verified=false`). |
| `FRAME_QUALITY_FAILED` | `200` (field `rejection_code`) / `422` | Kualitas frame tidak memenuhi ambang ketajaman, pencahayaan, atau resolusi. |
| `INVALID_IMAGE` | `400` / `413` / `415` | File kosong, korup, format bukan JPG/PNG/WEBP, dimensi < 32×32, atau ukuran melebihi batas. |
| `INFERENCE_ERROR` | `500` | Kegagalan internal saat menjalankan inferensi atau penyimpanan hasil. |
| `DETECTION_NOT_FOUND` | `404` | ID riwayat deteksi tidak ditemukan di database. |

---

## Endpoints

### 1. `GET /health`

Memeriksa ketersediaan layanan HTTP API secara independen dari kesiapan model AI.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "service": "kaora-api",
  "version": "0.3.0"
}
```

---

### 2. `GET /api/v1/models/status`

Mengembalikan status kesiapan masing-masing komponen model. `api="ready"` tidak berarti model AI siap digunakan.

**Response `200 OK`:**

```json
{
  "api": "ready",
  "verifier": false,
  "maturity_classifier": false,
  "localization": false,
  "ready_for_calibration": false,
  "ready_for_detection": false,
  "cocoa_verifier": false,
  "resnet18": false,
  "efficientnet_b0": false,
  "ensemble": false,
  "localizer": false,
  "model_dir": "/path/to/backend/models",
  "verifier_model": null,
  "verifier_error": "Checkpoint verifier belum ditemukan.",
  "maturity_models": {
    "resnet18": "resnet18-cocoa-maturity",
    "efficientnet_b0": null
  },
  "maturity_errors": {
    "resnet18": null,
    "efficientnet_b0": "Tidak dimuat. Model inference yang dipilih adalah ResNet18."
  },
  "localization_note": "Lokalisasi AI belum tersedia; GuideFrame hanya panduan posisi visual."
}
```

---

### 3. `POST /api/v1/calibration/verify-frame`

Memverifikasi apakah crop dari panduan kamera (`camera_guide_roi`) atau gambar unggahan (`uploaded_image`) merupakan buah kakao dengan kualitas frame memadai.

**Request (`multipart/form-data`):**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | File (JPG/PNG/WEBP) | Ya | Gambar atau crop ROI panduan kamera, maks. 10 MB |
| `source` | String | Tidak | `camera_guide_roi` atau `uploaded_image` (default: `uploaded_image`) |

**Response `200 OK` (Terverifikasi):**

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
  "verification_token": "eyJ...",
  "rejection_code": null,
  "message": "Objek kakao dikenali dan kualitas frame memenuhi pemeriksaan awal."
}
```

**Catatan keamanan verifikasi:** Server menerbitkan `verification_token` bertanda tangan HMAC-SHA256 dengan masa berlaku singkat (`KAORA_VERIFICATION_TTL_SECONDS`, default 300 detik) yang terikat pada hash SHA-256 byte gambar serta menyimpan klaim `cocoa_probability`. Frontend tidak boleh mengirim `verified=true` secara sepihak untuk melewati verifikasi.

---

### 4. `POST /api/v1/detect/frame`

Menjalankan alur deteksi kematangan kakao dari gambar menggunakan ResNet18 dan menyimpan metadata ke database.

**Request (`multipart/form-data`):**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | File (JPG/PNG/WEBP) | Ya | Gambar buah kakao (byte gambar yang sama dengan kalibrasi bila memakai token) |
| `verification_token` | String | Tidak | Token singkat dari `/api/v1/calibration/verify-frame`; jika tidak ada, invalid, kedaluwarsa, milik gambar lain, atau tidak memiliki `cocoa_probability`, server menjalankan fallback verifikasi kualitas + MobileNetV3-Small sebelum klasifikasi kematangan |
| `block_name` | String | Tidak | Nama blok kebun opsional (mis. `Blok A`) |
| `source` | String | Tidak | `camera_guide_roi` atau `uploaded_image` (default: `uploaded_image`) |

**Response `503 Service Unavailable` (saat checkpoint belum tersedia):**

```json
{
  "detail": {
    "code": "MODEL_NOT_READY",
    "feature": "detection",
    "message": "Layanan AI belum siap. Pasang checkpoint model yang valid dan restart backend. Tidak ada prediksi simulasi yang dikembalikan."
  }
}
```

**Response `200 OK` (saat model siap):**

```json
{
  "detection_id": "uuid",
  "verified": true,
  "cocoa_probability": 0.9999,
  "maturity_class": "Mature",
  "maturity_label_id": "Matang",
  "confidence": 0.9908,
  "probabilities": {
    "Immature": 0.0001,
    "Mature": 0.9908,
    "Overmature": 0.0091
  },
  "bbox": null,
  "bbox_available": false,
  "image_key": "2026/11/26/uuid.jpg",
  "block_name": "Blok A",
  "created_at": "2026-11-26T04:30:00+00:00"
}
```

---

### 5. `GET /api/v1/detections`

Mengembalikan daftar riwayat deteksi yang tersimpan di database.

**Query Parameters:**
- `limit` (integer, default `20`, max `100`)
- `offset` (integer, default `0`)

**Response `200 OK`:**

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

---

### 6. `GET /api/v1/detections/{id}`

Mengembalikan detail satu catatan deteksi berdasarkan `id`. Mengembalikan `404` dengan `code: "DETECTION_NOT_FOUND"` jika tidak ditemukan.
