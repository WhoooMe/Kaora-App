// ---------- DESIGN TOKENS (used across app) ----------
export const C = {
  bad: "#D9534F",
  ok: "#5EAD47",
  raw: "#E2B23F",
  over: "#ED8B43",
};
export const NM = {
  bad: "Busuk / Rusak",
  ok: "Matang Sempurna",
  raw: "Mentah",
  over: "Terlalu Matang",
};
export const ORDER = ["bad", "ok", "raw", "over"];

// Utility
export const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// ---------- MOCK DATASETS (development only - to be replaced with real APIs) ----------
// TODO: Replace with GET /api/v1/garden/blocks/stats
export const BLOK = {
  A: { ok: 118, raw: 120, over: 44, bad: 28 },
  B: { ok: 96, raw: 118, over: 42, bad: 30 },
  C: { ok: 112, raw: 146, over: 52, bad: 32 },
  D: { ok: 86, raw: 122, over: 49, bad: 53 },
};
// TODO: Replace with GET /api/v1/detections/trend?period={period}
const D7 = {
  ok: [48, 52, 55, 60, 64, 63, 70],
  raw: [90, 84, 78, 72, 68, 60, 54],
  over: [20, 22, 24, 27, 30, 31, 33],
  bad: [18, 19, 20, 21, 21, 22, 22],
};

// Period definitions for UI - these can stay as frontend configuration
export const PERIODS = {
  "24 Jam": {
    n: 8,
    days: 1,
    lab: (i) => String(i * 3).padStart(2, "0") + ":00",
  },
  "7 Hari": {
    n: 7,
    days: 7,
    lab: (i) => ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i],
  },
  "30 Hari": { n: 10, days: 30, lab: (i) => `${i * 3 + 1} Okt` },
  "6 Bulan": {
    n: 6,
    days: 180,
    lab: (i) => ["Mei", "Jun", "Jul", "Agu", "Sep", "Okt"][i],
  },
};
export function series(p, share = 1) {
  const { n, days } = PERIODS[p];
  const o = {};
  ORDER.forEach((c) => {
    o[c] = Array.from({ length: n }, (_, i) => {
      const f = (i / (n - 1)) * 6,
        a = Math.floor(f),
        b = Math.min(a + 1, 6),
        v = D7[c][a] + (D7[c][b] - D7[c][a]) * (f - a);
      return Math.max(
        1,
        Math.round(
          ((v * days) / n) *
            share *
            (p === "7 Hari" ? 1 : 1 + 0.06 * Math.sin(i * 2.3)),
        ),
      );
    });
  });
  return o;
}
// TODO: Replace with real GET /api/v1/detections/history (mocked for dev)
export const HIST = [
  ["08:02", "A", "Kamera A-01", 9, "ok"],
  ["07:40", "C", "Foto unggahan", 6, "over"],
  ["07:15", "B", "Kamera B-01", 11, "raw"],
  ["Kemarin 16:20", "D", "Kamera D-01", 8, "bad"],
  ["Kemarin 09:05", "A", "Kamera A-02", 12, "ok"],
];

// TODO: Replace with GET /api/v1/devices/cameras (mocked for dev)
export const CAMS = [
  { id: "A-01", b: "A", st: "online", n: 9, t: "08:02" },
  { id: "A-02", b: "A", st: "online", n: 12, t: "08:01" },
  { id: "B-01", b: "B", st: "online", n: 11, t: "08:02" },
  { id: "C-01", b: "C", st: "warning", n: 6, t: "07:48" },
  { id: "D-01", b: "D", st: "offline", n: 0, t: "Kemarin 16:20" },
];

// TODO: Replace with GET /api/v1/devices/sensors?block={block} (mocked for dev)
export const sensors = (b) => [
  [
    "Kelembapan Tanah",
    { A: 68, B: 64, C: 59, D: 71 }[b],
    "%",
    "Normal",
    [0.3, 0.4, 0.45, 0.6, 0.55, 0.7, 0.68],
  ],
  [
    "Suhu",
    { A: 29, B: 30, C: 31, D: 28 }[b],
    "°C",
    "Normal",
    [0.5, 0.55, 0.6, 0.7, 0.8, 0.75, 0.7],
  ],
  [
    "Intensitas Cahaya",
    { A: "41.200", B: "38.900", C: "44.300", D: "30.100" }[b],
    "lx",
    "Normal",
    [0.2, 0.4, 0.6, 0.8, 0.9, 0.7, 0.6],
  ],
  [
    "Curah Hujan",
    { A: 12, B: 9, C: 18, D: 11 }[b],
    "mm / 24 jam",
    b === "C" ? "Peringatan" : "Normal",
    [0.1, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9],
  ],
  [
    "Kadar Air",
    b === "D" ? null : { A: 41, B: 39, C: 44 }[b],
    "%",
    "Normal",
    [0.4, 0.4, 0.5, 0.45, 0.5, 0.55, 0.5],
  ],
];
