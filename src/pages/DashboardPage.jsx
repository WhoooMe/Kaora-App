import React, { useMemo, useState } from "react";
import { Icon, Legend, TrendChart } from "../ui.jsx";
import { StatusBadge, DashboardHeroMedia, CameraPreviewUnavailable, MaturityMark, MATURITY_LABELS } from "../components/ui/KaoraComponents.jsx";
import KaoraCard from "../components/KaoraCard";
import { Demo, Kpis, HistTable } from "./shared.jsx";
import useDetectionRecords from "../hooks/useDetectionRecords.js";

const HERO_MEDIA = { src: null, type: "image", poster: null, alt: "Kebun kakao KAORA" };
const CLASSES = ["Immature", "Mature", "Overmature"];
const COLORS = { Immature: "#E2B23F", Mature: "#5EAD47", Overmature: "#ED8B43" };
const classKey = { Immature: "raw", Mature: "ok", Overmature: "over" };
const formatCount = (value) => new Intl.NumberFormat("id-ID").format(value);
const periods = { "24 Jam": 1, "7 Hari": 7, "30 Hari": 30, "6 Bulan": 180 };

const DashboardPage = ({ go }) => {
  const { records, total, loading, error, refresh } = useDetectionRecords();
  const [period, setPeriod] = useState("7 Hari");
  const stats = useMemo(() => {
    const counts = Object.fromEntries(CLASSES.map((name) => [name, 0]));
    const byDate = new Map();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (periods[period] - 1));
    records.forEach((record) => {
      const name = record.maturity_class;
      if (Object.hasOwn(counts, name)) counts[name] += 1;
      if (!record.created_at) return;
      const date = new Date(record.created_at);
      if (Number.isNaN(date.getTime()) || date < start) return;
      const key = date.toLocaleDateString("sv-SE");
      if (!byDate.has(key)) byDate.set(key, Object.fromEntries(CLASSES.map((klass) => [klass, 0])));
      if (Object.hasOwn(counts, name)) byDate.get(key)[name] += 1;
    });
    const days = periods[period];
    const dates = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
    const trend = Object.fromEntries([
      ["bad", dates.map(() => 0)],
      ...CLASSES.map((name) => [classKey[name], dates.map((date) => byDate.get(date.toLocaleDateString("sv-SE"))?.[name] || 0)]),
    ]);
    return { counts, trend, labels: dates.map((date) => date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })) };
  }, [records, period]);
  const histRows = records.slice(0, 5).map((r) => [r.created_at ? new Date(r.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "Waktu tidak tersedia", r.block_name || "—", "Deteksi tersimpan", 1, classKey[r.maturity_class] || "raw"]);
  const kpis = { total: records.length, ok: stats.counts.Mature, harv: null, raw: stats.counts.Immature, over: stats.counts.Overmature, bad: null };

  return <>
    <section className="hero dashboard-hero">
      <DashboardHeroMedia {...HERO_MEDIA} /><div className="shade" />
      <div className="top"><div>
        <span className="chip">Ringkasan hasil deteksi tersimpan</span>
        <h2>Identifikasi Kematangan Buah Kakao</h2>
        <p>Unggah gambar buah kakao untuk diverifikasi dengan MobileNetV3-Small, diklasifikasikan kematangannya dengan ResNet18, lalu simpan hasil deteksi.</p>
      </div><div className="dashboard-model-flow" aria-label="Alur klasifikasi gambar">
        <div><small>01 · Verifikasi objek</small><b>MobileNetV3-Small</b></div><span aria-hidden="true">→</span><div><small>02 · Klasifikasi kematangan</small><b>ResNet18</b></div><span aria-hidden="true">→</span><div><small>03 · Hasil deteksi</small><b>Simpan & tinjau</b></div>
      </div></div>
      <div className="strip dashboard-strip"><div className="nm"><small>Data tersimpan</small><b>{loading ? "Memuat…" : error ? "Tidak tersedia" : `${formatCount(total)} deteksi`}</b></div><div><small>Model verifikator</small><b>MobileNetV3-Small</b></div><div><small>Classifier</small><b>ResNet18</b></div><button className="btn lime" onClick={() => go("deteksi")}><Icon n="scan" />Deteksi Kakao</button></div>
    </section>
    {loading ? <section className="dashboard-simulation-kpis" role="status">Memuat statistik deteksi dari backend…</section> : error ? <section className="dashboard-simulation-kpis" role="alert"><p>Statistik aktual tidak dapat dimuat: {error}</p><button className="btn" onClick={refresh}>Coba lagi</button></section> : <section className="dashboard-simulation-kpis">
      <p>{formatCount(records.length)} dari {formatCount(total)} catatan backend dimuat. Statistik klasifikasi tidak mencakup jumlah panen.</p><Kpis v={kpis} />
      {total > records.length && <p className="sub">Cakupan parsial: belum seluruh catatan berhasil dimuat.</p>}{!records.length && <p>Belum ada deteksi tersimpan.</p>}
    </section>}
    <div className="row r2">
      <KaoraCard><div className="hd"><div><h3>Tren Kematangan Kakao</h3><p className="sub">Deteksi per tanggal dari record backend yang dimuat.</p></div><div className="phase3e-period-controls">{Object.keys(periods).map((p) => <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p}</button>)}</div></div>
        {loading ? <p>Memuat tren…</p> : error ? <p role="alert">Tren tidak tersedia.</p> : records.length ? <><TrendChart s={stats.trend} labels={stats.labels} /><Legend /></> : <p>Belum ada data untuk membentuk tren.</p>}
        <div className="kaora-dashboard-maturity-legend"><small>Pemetaan kelas backend</small><div>{Object.entries(MATURITY_LABELS).map(([key, label]) => <span key={key}><MaturityMark maturityClass={key} size={24} />{label}</span>)}</div></div>
      </KaoraCard>
      <KaoraCard><h3>Distribusi Kematangan</h3><p className="sub">Proporsi record deteksi berdasarkan kelas kematangan.</p>{loading ? <p>Memuat distribusi…</p> : error ? <p role="alert">Distribusi tidak tersedia.</p> : !records.length ? <p>Belum ada record untuk dianalisis.</p> : CLASSES.map((name) => <div className="phase3e-bar-row" key={name}><span>{name}</span><div className="phase3e-bar-track"><i style={{ width: `${stats.counts[name] / records.length * 100}%`, background: COLORS[name] }} /></div><b>{formatCount(stats.counts[name])}</b></div>)}</KaoraCard>
    </div>
    <div className="row r3">
      <KaoraCard><div className="hd"><div><h3>Kamera Kebun</h3><p className="sub">Status perangkat belum tersedia di backend.</p></div><StatusBadge variant="neutral">Belum terintegrasi</StatusBadge></div><CameraPreviewUnavailable /><p className="sub">Feed kamera dan identitas perangkat belum dicatat pada API.</p><button className="btn full" onClick={() => go("monitor")}>Lihat status integrasi</button></KaoraCard>
      <KaoraCard><div className="hd"><div><h3>Riwayat Deteksi Terkini</h3><p className="sub">Record terbaru dari database KAORA</p></div><button className="btn ghost" onClick={() => go("riwayat")}>Lihat Semua</button></div>
        {loading ? <p>Memuat riwayat…</p> : error ? <div role="alert"><p>Riwayat tidak tersedia.</p><button className="btn" onClick={refresh}>Coba lagi</button></div> : histRows.length ? <HistTable rows={histRows} className="dashboard-history-scroll" /> : <p>Belum ada deteksi tersimpan.</p>}
      </KaoraCard>
    </div>
  </>;
};

export default DashboardPage;
