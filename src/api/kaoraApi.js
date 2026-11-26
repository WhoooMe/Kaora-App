const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class KaoraApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", feature = null } = {}) {
    super(message);
    this.name = "KaoraApiError";
    this.status = status;
    this.code = code;
    this.feature = feature;
  }
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}

function buildError(response, payload, fallbackMessage) {
  const detail = payload?.detail || {};
  return new KaoraApiError(detail.message || fallbackMessage, {
    status: response.status,
    code: detail.code || "INFERENCE_ERROR",
    feature: detail.feature || null,
  });
}

export async function getModelsStatus() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/models/status`);
  } catch {
    throw new KaoraApiError("Backend FastAPI tidak dapat dihubungi.", {
      status: 0,
      code: "API_OFFLINE",
    });
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal membaca status layanan model.");
  }
  return payload;
}

export async function verifyCalibrationFrame(file, source = "uploaded_image") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", source);

  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/calibration/verify-frame`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend. Pastikan FastAPI berjalan dan VITE_API_BASE_URL sesuai.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Frame belum dapat diverifikasi.");
  }
  return payload;
}

export async function detectFrame(file, { verificationToken = null, blockName = null, source = "uploaded_image" } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", source);
  if (verificationToken) formData.append("verification_token", verificationToken);
  if (blockName) formData.append("block_name", blockName);

  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/detect/frame`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk menjalankan deteksi.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Deteksi kematangan gagal diproses.");
  }
  return payload;
}

export async function listDetections({ limit = 20, offset = 0 } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/detections?limit=${limit}&offset=${offset}`);
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk memuat riwayat deteksi.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal memuat riwayat deteksi.");
  }
  return payload;
}

export async function getDetection(id) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/detections/${encodeURIComponent(id)}`);
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk memuat detail deteksi.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal memuat detail deteksi.");
  }
  return payload;
}

export const getModelStatus = getModelsStatus;

export { API_BASE };
