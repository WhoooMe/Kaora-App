import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Icon } from "../ui.jsx";
import detectionIcon from "../assets/kpi-icons/detection.webp";
import immatureIcon from "../assets/kpi-icons/raw.webp";
import matureIcon from "../assets/kpi-icons/mature.webp";
import overmatureIcon from "../assets/kpi-icons/overmature.webp";
import useDetectionRecords from "../hooks/useDetectionRecords.js";
import { Head, fmt } from "./shared.jsx";

const CLASSES = ["Immature", "Mature", "Overmature"];
const COLORS = { Immature: "#E2B23F", Mature: "#5EAD47", Overmature: "#ED8B43" };
const PERIODS = ["Semua", "24 Jam", "7 Hari", "30 Hari", "6 Bulan"];
const KPI_ICONS = {
  "Record deteksi": detectionIcon,
  Immature: immatureIcon,
  Mature: matureIcon,
  Overmature: overmatureIcon,
};

function PeriodDropdown({ period, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="analysis-period-control">
      <span>Periode</span>
      <div className="dd analysis-period-dropdown" ref={dropdownRef}>
        <button
          className="analysis-period-trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Periode tren: ${period}`}
          onClick={() => setOpen((value) => !value)}
        >
          {period}
          <Icon n="chev" s={15} />
        </button>
        {open && (
          <div className="menu analysis-period-menu is-open" role="listbox" aria-label="Pilih periode">
            {PERIODS.map((option) => (
              <button
                key={option}
                className={`analysis-period-option${period === option ? " is-selected" : ""}`}
                type="button"
                role="option"
                aria-selected={period === option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalisisPage() {
  const { records, total, loading, error, refresh } = useDetectionRecords();
  const [period, setPeriod] = useState("Semua");
  const stats = useMemo(() => {
    const counts = Object.fromEntries(CLASSES.map((name) => [name, 0]));
    let sumConfidence = 0;
    let confidenceCount = 0;
    const dates = new Map();
    const days = { "24 Jam": 1, "7 Hari": 7, "30 Hari": 30, "6 Bulan": 180 };
    const cutoff = days[period] ? new Date(Date.now() - days[period] * 86400000) : null;

    records.forEach((record) => {
      if (Object.hasOwn(counts, record.maturity_class)) counts[record.maturity_class] += 1;
      if (typeof record.confidence === "number" && Number.isFinite(record.confidence)) {
        sumConfidence += record.confidence;
        confidenceCount += 1;
      }
      if (record.created_at) {
        const parsed = new Date(record.created_at);
        if (!Number.isNaN(parsed.getTime()) && (!cutoff || parsed >= cutoff)) {
          const key = parsed.toISOString().slice(0, 10);
          dates.set(key, (dates.get(key) || 0) + 1);
        }
      }
    });

    return {
      counts,
      confidence: confidenceCount ? sumConfidence / confidenceCount : null,
      confidenceCount,
      dates: [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [records, period]);

  const maxCount = Math.max(1, ...Object.values(stats.counts));
  const maxDaily = Math.max(1, ...stats.dates.map(([, count]) => count));
  const tickStep = Math.max(1, Math.ceil(maxDaily / 4));
  const chartMax = Math.ceil(maxDaily / tickStep) * tickStep;
  const trendTicks = Array.from(
    { length: chartMax / tickStep + 1 },
    (_, index) => chartMax - index * tickStep,
  );

  return (
    <div className="phase3e-analysis-page">
      <Head
        t="Analisis Hasil Deteksi"
        s="Agregasi dari record deteksi tersimpan pada backend KAORA."
      />
      {loading ? (
        <Card role="status">
          <p>Memuat hasil deteksi…</p>
        </Card>
      ) : error ? (
        <Card role="alert">
          <h3>Data analisis tidak tersedia</h3>
          <p className="sub">{error}</p>
          <button className="btn" onClick={refresh}>Coba lagi</button>
        </Card>
      ) : (
        <>
          <Card className="phase3e-note analysis-coverage">
            <b>Cakupan data</b>
            <p className="sub">
              {fmt(records.length)} record dimuat dari total {fmt(total)} record backend.{" "}
              {records.length === total
                ? "Agregasi mencakup seluruh record yang tersedia."
                : "Agregasi parsial karena sebagian record belum berhasil dimuat."}{" "}
              Cocoa probability MobileNetV3-Small tidak digunakan sebagai confidence classifier.
            </p>
          </Card>

          <div className="kpis k4 phase3e-analysis-kpis">
            {[
              ["Record deteksi", records.length],
              ...CLASSES.map((name) => [name, stats.counts[name]]),
            ].map(([label, value]) => (
              <Card className="kpi" key={label}>
                <div className="t">
                  <span className="ic">
                    <img src={KPI_ICONS[label]} alt="" />
                  </span>
                  {label}
                </div>
                <b>{fmt(value)}</b>
              </Card>
            ))}
          </div>

          <div className="row r2 phase3e-analysis-grid">
            <Card>
              <h3>Distribusi kelas kematangan</h3>
              <p className="sub">Jumlah record per kelas; satu record dihitung satu kali.</p>
              {CLASSES.map((name) => (
                <div className="phase3e-bar-row" key={name}>
                  <span>{name}</span>
                  <div className="phase3e-bar-track">
                    <i
                      style={{
                        width: `${(stats.counts[name] / maxCount) * 100}%`,
                        background: COLORS[name],
                      }}
                    />
                  </div>
                  <b className="phase3e-bar-value">
                    <span>{fmt(stats.counts[name])}</span>
                    {records.length > 0 && (
                      <small>{((stats.counts[name] / records.length) * 100).toFixed(1)}%</small>
                    )}
                  </b>
                </div>
              ))}
            </Card>

            <Card>
              <h3>Confidence classifier</h3>
              <p className="sub">Rata-rata confidence ResNet18.</p>
              <strong className="phase3e-confidence">
                {stats.confidence === null ? "—" : `${(stats.confidence * 100).toFixed(1)}%`}
              </strong>
              <p className="sub">
                Dihitung dari {fmt(stats.confidenceCount)} record dengan confidence valid;
                tidak dicampur dengan cocoa_probability.
              </p>
            </Card>
          </div>

          <Card className="phase3e-analysis-trend-card">
            <div className="hd">
              <div>
                <h3>Tren deteksi berdasarkan tanggal</h3>
                <p className="sub">Jumlah record dengan timestamp valid.</p>
              </div>
              <PeriodDropdown period={period} onChange={setPeriod} />
            </div>
            {stats.dates.length ? (
              <div className="phase3e-chart-scroll">
                <div
                  className="phase3e-chart"
                  style={{ minWidth: `${Math.max(480, stats.dates.length * 44 + 48)}px` }}
                >
                  <div className="phase3e-y-axis" aria-hidden="true">
                    {trendTicks.map((tick) => <span key={tick}>{tick}</span>)}
                  </div>
                  <div className="phase3e-trend-plot">
                    <div className="phase3e-chart-grid" aria-hidden="true">
                      {trendTicks.map((tick) => <span key={tick} />)}
                    </div>
                    {stats.dates.map(([date, count]) => (
                      <div
                        className="phase3e-trend-column"
                        key={date}
                        title={`${date}: ${count} deteksi`}
                      >
                        <div className="phase3e-trend-bar-wrap">
                          <i style={{ height: `${Math.max(2, (count / chartMax) * 100)}%` }} />
                        </div>
                        <small>
                          {new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="phase3e-empty">Belum ada timestamp valid pada periode ini.</p>
            )}
          </Card>

          {!records.length && (
            <Card className="phase3e-empty">
              Belum ada catatan deteksi aktual untuk dianalisis.
            </Card>
          )}
        </>
      )}
    </div>
  );
}
