import React, { useCallback, useEffect, useState } from "react";
import { getModelsStatus } from "../api/kaoraApi.js";
import { Card } from "../ui.jsx";
import { Head } from "./shared.jsx";

const readiness = (ready) => (ready ? "Siap" : "Belum siap");

export default function PengaturanPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getModelsStatus();
      setStatus(result);
      setCheckedAt(new Date());
    } catch (err) {
      setStatus(null);
      setError(err.message || "Status backend tidak tersedia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return <>
    <Head t="Pengaturan & Informasi Sistem" s="Status layanan dan model dibaca langsung dari backend KAORA." />
    <div className="row r2 phase3e-settings-grid">
      <Card><h3>Preferensi tampilan</h3><p className="sub">Preferensi pengguna belum tersedia. Tampilan mengikuti design system KAORA.</p><span className="kaora-status-badge kaora-status-badge--neutral">Informasi saja</span></Card>
      <Card><h3>Akun & profil</h3><p className="sub">Authentication dan profil pengguna belum terintegrasi.</p><span className="kaora-status-badge kaora-status-badge--neutral">Belum terintegrasi</span></Card>
      <Card>
        <h3>Status Layanan AI</h3>
        <p className="sub">Kesiapan komponen backend saat pemeriksaan terakhir.</p>
        {loading ? <p role="status">Memeriksa backend…</p> : error ? <div role="alert"><div className="phase3e-model-row"><b>API FastAPI</b><span>Offline</span></div><p>{error}</p><button className="btn" onClick={load}>Coba lagi</button></div> : <>
          <div className="phase3e-model-row"><b>API FastAPI</b><span>{status?.api === "ready" ? "Online" : "Tidak siap"}</span></div>
          <div className="phase3e-model-row"><b>Cocoa Verifier (MobileNetV3-Small)</b><span>{readiness(status?.cocoa_verifier)}{status?.verifier_error ? ` · ${status.verifier_error}` : ""}</span></div>
          <div className="phase3e-model-row"><b>Maturity Classifier (ResNet18)</b><span>{readiness(status?.resnet18)}{status?.maturity_errors?.resnet18 ? ` · ${status.maturity_errors.resnet18}` : ""}</span></div>
          <div className="phase3e-model-row"><b>Lokalisasi Objek</b><span>{status?.localizer ? "Aktif" : "Belum Tersedia — Model deteksi objek belum diimplementasikan."}</span></div>
          {status?.localization_note && <p className="sub">{status.localization_note}</p>}
          {checkedAt && <p className="sub">Diperiksa: {checkedAt.toLocaleString()}</p>}
          <button className="btn" onClick={load}>Periksa ulang</button>
        </>}
      </Card>
      <Card><h3>Informasi aplikasi</h3><div className="phase3e-model-row"><b>Nama</b><span>KAORA</span></div><div className="phase3e-model-row"><b>Konfigurasi persisten</b><span>Belum tersedia</span></div><p className="sub">Pengaturan yang memerlukan penyimpanan backend belum dapat diubah di sini.</p></Card>
    </div>
  </>;
}
