import React, { useMemo, useState } from "react";
import useDetectionRecords from "../hooks/useDetectionRecords.js";
import { Card } from "../ui.jsx";
import { Head, fmt } from "./shared.jsx";

const CLASSES = ["Immature", "Mature", "Overmature"];
const COLORS = { Immature: "#E2B23F", Mature: "#5EAD47", Overmature: "#ED8B43" };

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
    return { counts, confidence: confidenceCount ? sumConfidence / confidenceCount : null, confidenceCount, dates: [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)) };
  }, [records, period]);
  const maxCount = Math.max(1, ...Object.values(stats.counts));
  const maxDaily = Math.max(1, ...stats.dates.map(([, count]) => count));
  return <>
    <Head t="Analisis Hasil Deteksi" s="Agregasi dari record deteksi tersimpan pada backend KAORA." />
    {loading ? <Card role="status"><p>Memuat hasil deteksi…</p></Card> : error ? <Card role="alert"><h3>Data analisis tidak tersedia</h3><p className="sub">{error}</p><button className="btn" onClick={refresh}>Coba lagi</button></Card> : <>
      <Card className="phase3e-note"><b>Cakupan data</b><p className="sub">{fmt(records.length)} record dimuat dari total {fmt(total)} record backend. {records.length === total ? "Agregasi mencakup seluruh record yang tersedia." : "Agregasi parsial karena sebagian record belum berhasil dimuat."} Cocoa probability MobileNetV3-Small tidak digunakan sebagai confidence classifier.</p></Card>
      <div className="kpis k4"><Card className="kpi"><div className="t">Record deteksi</div><b>{fmt(records.length)}</b></Card>{CLASSES.map((name) => <Card className="kpi" key={name}><div className="t">{name}</div><b>{fmt(stats.counts[name])}</b></Card>)}</div>
      <div className="row r2 phase3e-analysis-grid">
        <Card><h3>Distribusi kelas kematangan</h3><p className="sub">Jumlah record per kelas; satu record dihitung satu kali.</p>{CLASSES.map((name) => <div className="phase3e-bar-row" key={name}><span>{name}</span><div className="phase3e-bar-track"><i style={{ width: `${stats.counts[name] / maxCount * 100}%`, background: COLORS[name] }} /></div><b>{fmt(stats.counts[name])}{records.length ? ` · ${(stats.counts[name] / records.length * 100).toFixed(1)}%` : ""}</b></div>)}</Card>
        <Card><h3>Confidence classifier</h3><p className="sub">Rata-rata confidence ResNet18.</p><strong className="phase3e-confidence">{stats.confidence === null ? "—" : `${(stats.confidence * 100).toFixed(1)}%`}</strong><p className="sub">Dihitung dari {fmt(stats.confidenceCount)} record dengan confidence valid; tidak dicampur dengan cocoa_probability.</p></Card>
      </div>
      <Card><div className="hd"><div><h3>Tren deteksi berdasarkan tanggal</h3><p className="sub">Record dengan timestamp valid.</p></div><label>Periode <select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Semua</option><option>24 Jam</option><option>7 Hari</option><option>30 Hari</option><option>6 Bulan</option></select></label></div>{stats.dates.length ? <div className="phase3e-trend">{stats.dates.map(([date, count]) => <div key={date} title={`${date}: ${count} deteksi`}><i style={{ height: `${Math.max(8, count / maxDaily * 100)}%` }} /><small>{new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</small></div>)}</div> : <p className="phase3e-empty">Belum ada timestamp valid pada periode ini.</p>}</Card>
      {!records.length && <Card className="phase3e-empty">Belum ada catatan deteksi aktual untuk dianalisis.</Card>}
    </>}
  </>;
}
