import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../ui.jsx";
import { Head } from "./shared.jsx";
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "../components/ui/KaoraComponents.jsx";
import { getDetection, listDetections } from "../api/kaoraApi.js";
import { useWorkflow } from "../context/WorkflowContext.jsx";

const PAGE_LIMIT = 20;
const CLASSES = ["Immature", "Mature", "Overmature"];
const MATURITY_VARIANT = { Immature: "warn", Mature: "ok", Overmature: "gold" };
const MATURITY_LABEL_ID = {
  Immature: "Belum matang",
  Mature: "Matang",
  Overmature: "Lewat matang",
};

function formatDateTime(isoString) {
  if (!isoString) return "Waktu tidak tersedia";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function percent(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "Tidak tersedia";
}

function MaturityBadge({ record }) {
  const maturityClass = record?.maturity_class;
  return (
    <StatusBadge variant={MATURITY_VARIANT[maturityClass] || "neutral"}>
      {record?.maturity_label_id || MATURITY_LABEL_ID[maturityClass] || maturityClass || "Kelas tidak tersedia"}
    </StatusBadge>
  );
}

function VerificationBadge({ verified }) {
  return (
    <StatusBadge variant={verified ? "ok" : "neutral"}>
      {verified ? "Kakao terverifikasi" : "Belum terverifikasi"}
    </StatusBadge>
  );
}

function ProbabilityRows({ probabilities }) {
  return (
    <div className="history-probabilities" aria-label="Distribusi probabilitas kelas kematangan">
      {CLASSES.map((maturityClass) => {
        const value = probabilities?.[maturityClass];
        const available = typeof value === "number" && Number.isFinite(value);
        const width = available ? Math.min(100, Math.max(0, value * 100)) : 0;
        return (
          <div className={`history-probability history-probability--${maturityClass.toLowerCase()}`} key={maturityClass}>
            <div className="history-probability-label">
              <span>{MATURITY_LABEL_ID[maturityClass]}</span>
              <strong>{available ? percent(value) : "Tidak tersedia"}</strong>
            </div>
            <div className="history-probability-track" aria-hidden="true">
              <span style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetectionDetail({ detail, onBack, onNewDetection }) {
  return (
    <section className="history-detail" aria-labelledby="history-detail-title">
      <div className="history-detail-top">
        <button className="history-back-link" onClick={onBack} type="button">
          <Icon n="hist" s={16} /> Kembali ke riwayat
        </button>
        <PrimaryButton onClick={onNewDetection}>
          <Icon n="scan" /> Deteksi Baru
        </PrimaryButton>
      </div>

      <div className="history-detail-heading">
        <div>
          <span className="history-eyebrow">RINGKASAN PEMERIKSAAN</span>
          <h2 id="history-detail-title">Hasil Deteksi</h2>
          <p className="history-id" title={detail.id}>ID · {detail.id || "Tidak tersedia"}</p>
        </div>
        <MaturityBadge record={detail} />
      </div>

      <div className="history-detail-grid">
        <section className="history-result-panel" aria-label="Kelas kematangan terprediksi">
          <span className="history-eyebrow">KELAS KEMATANGAN</span>
          <strong className="history-result-class">{detail.maturity_label_id || MATURITY_LABEL_ID[detail.maturity_class] || detail.maturity_class || "Tidak tersedia"}</strong>
          <span className="history-result-code">{detail.maturity_class || "Kelas tidak tersedia"}</span>
          <p>Hasil klasifikasi untuk sampel ini.</p>
        </section>
        <div className="history-metrics">
          <section className="history-metric">
            <span>Keyakinan classifier</span>
            <strong>{percent(detail.confidence)}</strong>
            <small>Tingkat keyakinan prediksi kelas, bukan akurasi keseluruhan model.</small>
          </section>
          <section className="history-metric history-metric--cocoa">
            <span>Probabilitas kakao</span>
            <strong>{percent(detail.cocoa_probability)}</strong>
            <small>Skor verifikator bahwa frame berisi objek kakao.</small>
          </section>
        </div>
      </div>

      <section className="history-detail-section">
        <div className="history-section-heading">
          <div><span className="history-eyebrow">RINCIAN MODEL</span><h3>Distribusi kematangan</h3></div>
          <p>Probabilitas untuk setiap kelas pada sampel ini.</p>
        </div>
        <ProbabilityRows probabilities={detail.probabilities} />
      </section>

      <section className="history-detail-section">
        <div className="history-section-heading">
          <div><span className="history-eyebrow">KONTEKS CATATAN</span><h3>Informasi pemeriksaan</h3></div>
        </div>
        <dl className="history-metadata">
          <div><dt>Status verifikasi</dt><dd><VerificationBadge verified={detail.verified} /></dd></div>
          <div><dt>Blok kebun</dt><dd>{detail.block_name || "Belum ditentukan"}</dd></div>
          <div><dt>Waktu pemeriksaan</dt><dd>{formatDateTime(detail.created_at)}</dd></div>
          <div><dt>Lokalisasi bounding box</dt><dd>{detail.bbox_available ? "Tersedia" : "Tidak tersedia untuk catatan ini"}</dd></div>
          <div><dt>ID gambar tersimpan</dt><dd className="history-id" title={detail.captured_image_id}>{detail.captured_image_id || "Tidak tersedia"}</dd></div>
        </dl>
      </section>

      <section className="history-image-unavailable" aria-label="Pratinjau gambar tidak tersedia">
        <div className="history-image-mark"><Icon n="cam" s={22} /></div>
        <div>
          <strong>Pratinjau gambar tidak tersedia</strong>
          <p>API saat ini hanya mengembalikan ID gambar tersimpan, tanpa endpoint pengambilan gambar yang dapat diakses browser. Pratinjau memerlukan dukungan retrieval backend tersendiri.</p>
        </div>
      </section>
    </section>
  );
}

const RiwayatPage = ({ go }) => {
  const { historyVersion, selectedDetectionId, setSelectedDetectionId } = useWorkflow();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [classFilter, setClassFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detail, setDetail] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDetections({ limit: PAGE_LIMIT, offset });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (err) {
      setError({
        code: err.code || "API_OFFLINE",
        message: err.message || "Gagal memuat riwayat deteksi dari backend.",
      });
    } finally {
      setLoading(false);
    }
  }, [offset, historyVersion]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const openDetail = useCallback(async (id) => {
    if (!id) return;
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await getDetection(id));
    } catch (err) {
      setDetailError({ code: err.code || "REQUEST_FAILED", message: err.message || "Gagal memuat detail deteksi." });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDetectionId) openDetail(selectedDetectionId);
  }, [selectedDetectionId, openDetail]);

  const closeDetail = () => {
    setDetail(null);
    setDetailError(null);
    setSelectedDetectionId(null);
  };
  const openRecord = (id) => setSelectedDetectionId(id);
  const filteredItems = useMemo(
    () => classFilter === "ALL" ? items : items.filter((item) => item.maturity_class === classFilter),
    [items, classFilter],
  );
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_LIMIT < total;
  const pageNumber = Math.floor(offset / PAGE_LIMIT) + 1;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + items.length, total);

  return (
    <div className="riwayat-page">
      <Head t="Riwayat Deteksi" s="Telusuri hasil pemeriksaan kematangan kakao yang tersimpan." >
        <SecondaryButton onClick={fetchHistory} disabled={loading} aria-label="Muat ulang riwayat deteksi">
          <Icon n="ref" /> {loading ? "Memuat…" : "Muat Ulang"}
        </SecondaryButton>
        <PrimaryButton onClick={() => go?.("deteksi")}><Icon n="scan" /> Deteksi Baru</PrimaryButton>
      </Head>

      <div className="history-overview" aria-live="polite">
        <div><span className="history-eyebrow">ARSIP PEMERIKSAAN</span><strong>{loading && total === 0 ? "—" : total.toLocaleString("id-ID")}</strong><span>catatan tersimpan</span></div>
        <p>Data dimuat langsung dari riwayat backend KAORA.</p>
      </div>

      {selectedDetectionId && (
        <div className="history-detail-wrap">
          {detailLoading && <div className="history-state" role="status" aria-busy="true"><span className="history-spinner" /><div><strong>Memuat detail pemeriksaan</strong><p>Mengambil catatan lengkap dari backend…</p></div></div>}
          {!detailLoading && detailError && <ErrorState title="Detail tidak dapat dimuat" code={detailError.code} description={detailError.message} onRetry={() => openDetail(selectedDetectionId)} retryLabel="Coba Lagi" />}
          {!detailLoading && detail && <DetectionDetail detail={detail} onBack={closeDetail} onNewDetection={() => go?.("deteksi")} />}
        </div>
      )}

      {loading && <div className="history-state" role="status" aria-busy="true"><span className="history-spinner" /><div><strong>Memuat riwayat deteksi</strong><p>Mengambil catatan tersimpan dari backend KAORA…</p></div></div>}
      {!loading && error && <ErrorState title={error.code === "API_OFFLINE" ? "Backend tidak terhubung" : "Riwayat tidak dapat dimuat"} code={error.code} description={error.message} onRetry={fetchHistory} retryLabel="Coba Muat Ulang" />}
      {!loading && !error && items.length === 0 && <EmptyState title="Belum ada riwayat deteksi" description="Jalankan deteksi kematangan untuk menyimpan hasil pemeriksaan pertama ke arsip." action={<PrimaryButton onClick={() => go?.("deteksi")}><Icon n="scan" /> Mulai Deteksi</PrimaryButton>} />}

      {!loading && !error && items.length > 0 && (
        <section className="history-records" aria-labelledby="history-list-title">
          <div className="history-list-heading">
            <div><span className="history-eyebrow">CATATAN TERBARU</span><h2 id="history-list-title">Pemeriksaan tersimpan</h2><p>Menampilkan {rangeStart}–{rangeEnd} dari {total.toLocaleString("id-ID")} catatan</p></div>
            <div className="history-filter" aria-label="Filter kelas pada halaman ini">
              <span>Filter halaman ini</span>
              <div role="group" aria-label="Filter kelas kematangan">
                {[{ key: "ALL", label: "Semua" }, ...CLASSES.map((key) => ({ key, label: MATURITY_LABEL_ID[key] }))].map((option) => (
                  <button key={option.key} type="button" className={classFilter === option.key ? "is-active" : ""} aria-pressed={classFilter === option.key} onClick={() => setClassFilter(option.key)}>{option.label}</button>
                ))}
              </div>
            </div>
          </div>
          <p className="history-filter-note">Filter hanya berlaku pada {items.length} catatan di halaman ini, bukan seluruh arsip.</p>

          <div className="history-table-wrap">
            <table className="history-table">
              <thead><tr><th scope="col">Pemeriksaan</th><th scope="col">Blok</th><th scope="col">Verifikasi</th><th scope="col">Kematangan</th><th scope="col">Keyakinan classifier</th><th scope="col"><span className="sr-only">Tindakan</span></th></tr></thead>
              <tbody>
                {filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td><button className="history-record-link" type="button" onClick={() => openRecord(row.id)} title={`Buka detail ${row.id}`}><span className="history-record-time">{formatDateTime(row.created_at)}</span><span className="history-id">{row.id || "ID tidak tersedia"}</span></button></td>
                    <td>{row.block_name || <span className="history-muted">Belum ditentukan</span>}</td>
                    <td><div className="history-table-status"><VerificationBadge verified={row.verified} />{typeof row.cocoa_probability === "number" ? <small>Probabilitas kakao {percent(row.cocoa_probability)}</small> : <small>Probabilitas kakao tidak tersedia</small>}</div></td>
                    <td><div className="history-table-status"><MaturityBadge record={row} /><small>{row.maturity_class || "Kelas tidak tersedia"}</small></div></td>
                    <td><strong className="history-confidence">{percent(row.confidence)}</strong></td>
                    <td><SecondaryButton className="history-detail-button" onClick={() => openRecord(row.id)}>Lihat detail</SecondaryButton></td>
                  </tr>
                ))}
                {filteredItems.length === 0 && <tr><td colSpan={6} className="history-no-match">Tidak ada catatan pada halaman ini untuk kelas tersebut.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="history-mobile-list">
            {filteredItems.map((row) => (
              <article className="history-mobile-record" key={row.id}>
                <div className="history-mobile-record-top"><MaturityBadge record={row} /><span>{formatDateTime(row.created_at)}</span></div>
                <button className="history-record-link" type="button" onClick={() => openRecord(row.id)} title={`Buka detail ${row.id}`}><strong>{row.maturity_class || "Kelas tidak tersedia"}</strong><span className="history-id">{row.id || "ID tidak tersedia"}</span></button>
                <div className="history-mobile-meta"><span>{row.block_name || "Belum ditentukan"}</span><VerificationBadge verified={row.verified} /></div>
                <div className="history-mobile-values"><span>Classifier <strong>{percent(row.confidence)}</strong></span><span>Kakao <strong>{percent(row.cocoa_probability)}</strong></span></div>
                <SecondaryButton onClick={() => openRecord(row.id)}>Lihat detail</SecondaryButton>
              </article>
            ))}
            {filteredItems.length === 0 && <p className="history-no-match">Tidak ada catatan pada halaman ini untuk kelas tersebut.</p>}
          </div>

          <nav className="history-pagination" aria-label="Paginasi riwayat deteksi">
            <p>Halaman {pageNumber} · Catatan {rangeStart}–{rangeEnd} dari {total.toLocaleString("id-ID")}</p>
            <div>
              <SecondaryButton disabled={!hasPrev || loading} onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_LIMIT))} aria-label="Halaman sebelumnya">Sebelumnya</SecondaryButton>
              <SecondaryButton disabled={!hasNext || loading} onClick={() => setOffset((prev) => prev + PAGE_LIMIT)} aria-label="Halaman berikutnya">Berikutnya</SecondaryButton>
            </div>
          </nav>
        </section>
      )}
    </div>
  );
};

export default RiwayatPage;
