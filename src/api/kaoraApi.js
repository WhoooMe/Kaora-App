const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredBase || "").replace(/\/$/, "");

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

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
  const detail = payload?.detail;
  const normalizedDetail = Array.isArray(detail)
    ? detail.map((item) => item?.msg || item?.detail).filter(Boolean).join("; ")
    : detail?.message || (typeof detail === "string" ? detail : "");
  const code = Array.isArray(detail) ? "VALIDATION_ERROR" : detail?.code || "INFERENCE_ERROR";
  return new KaoraApiError(normalizedDetail || fallbackMessage, {
    status: response.status,
    code,
    feature: Array.isArray(detail) ? null : detail?.feature || null,
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function invalidDashboardResponse(message, status) {
  return new KaoraApiError(message, { status, code: "INVALID_RESPONSE" });
}

export async function getModelsStatus() {
  let response;
  try {
    response = await fetch(apiUrl("/api/v1/models/status"));
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
    response = await fetch(apiUrl("/api/v1/calibration/verify-frame"), {
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
    response = await fetch(apiUrl("/api/v1/detect/frame"), {
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
    response = await fetch(apiUrl(`/api/v1/detections?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`));
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
    response = await fetch(apiUrl(`/api/v1/detections/${encodeURIComponent(id)}`));
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

export async function getDetectionStats() {
  let response;
  try {
    response = await fetch(apiUrl("/api/v1/detections/stats"));
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk memuat statistik deteksi.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal memuat statistik deteksi.");
  }
  if (
    !isRecord(payload) ||
    !isCount(payload.total_detections) ||
    !isCount(payload.mature_count) ||
    !isCount(payload.immature_count) ||
    !isCount(payload.overmature_count) ||
    !isRecord(payload.maturity_distribution) ||
    (payload.unknown_maturity_count !== undefined && !isCount(payload.unknown_maturity_count)) ||
    Object.values(payload.maturity_distribution).some((count) => !isCount(count))
  ) {
    throw invalidDashboardResponse("Respons statistik deteksi dari backend tidak valid.", response.status);
  }
  return payload;
}

export async function getDetectionTrend(
  period = "7 Hari",
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
) {
  let response;
  try {
    response = await fetch(
      apiUrl(
        `/api/v1/detections/trend?period=${encodeURIComponent(period)}&time_zone=${encodeURIComponent(timeZone)}`,
      ),
    );
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk memuat tren deteksi.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal memuat tren deteksi.");
  }
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.trend) ||
    !isCount(payload.total_buckets) ||
    !isCount(payload.total_in_range) ||
    payload.trend.length !== payload.total_buckets ||
    payload.trend.some(
      (bucket) =>
        !isRecord(bucket) ||
        typeof bucket.bucket !== "string" ||
        typeof bucket.label !== "string" ||
        !isRecord(bucket.counts) ||
        Object.values(bucket.counts).some((count) => !isCount(count)),
    )
  ) {
    throw invalidDashboardResponse("Respons tren deteksi dari backend tidak valid.", response.status);
  }
  return payload;
}

export async function getDetectionDistributionByBlock() {
  let response;
  try {
    response = await fetch(apiUrl("/api/v1/detections/distribution-by-block"));
  } catch {
    throw new KaoraApiError(
      "Tidak dapat terhubung ke backend FastAPI untuk memuat distribusi per blok.",
      { status: 0, code: "API_OFFLINE" },
    );
  }
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildError(response, payload, "Gagal memuat distribusi per blok.");
  }
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.blocks) ||
    !isCount(payload.total_blocks) ||
    !isCount(payload.no_block_count) ||
    !isCount(payload.total_with_blocks) ||
    !isCount(payload.total_detections) ||
    payload.blocks.length !== payload.total_blocks ||
    payload.blocks.some(
      (block) =>
        !isRecord(block) ||
        typeof block.block_name !== "string" ||
        !isRecord(block.counts) ||
        !isCount(block.total) ||
        Object.values(block.counts).some((count) => !isCount(count)),
    )
  ) {
    throw invalidDashboardResponse("Respons distribusi deteksi dari backend tidak valid.", response.status);
  }
  return payload;
}

export { API_BASE };
