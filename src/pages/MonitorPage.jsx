import React from "react";
import { Card } from "../ui.jsx";
import { CameraPreviewUnavailable } from "../components/ui/KaoraComponents.jsx";
import { Head } from "./shared.jsx";

export default function MonitorPage({ go }) {
  return (
    <div className="monitor-page">
      <Head
        t="Monitor Perangkat"
        s="Status operasional hanya ditampilkan bila tersedia dari integrasi perangkat."
      />
      <div className="kpis k4 monitor-kpis">
        <Card className="kpi"><div className="t">Status kamera</div><b>Belum tersedia</b></Card>
        <Card className="kpi"><div className="t">Feed live</div><b>Tidak terintegrasi</b></Card>
        <Card className="kpi"><div className="t">Sensor lingkungan</div><b>Belum tersedia</b></Card>
        <Card className="kpi"><div className="t">Peringatan perangkat</div><b>Belum tersedia</b></Card>
      </div>
      <div className="row r2 monitor-panels">
        <Card className="monitor-camera-panel">
          <div className="monitor-camera-preview">
            <CameraPreviewUnavailable />
          </div>
          <h3>Feed kamera</h3>
          <p className="sub">
            Backend saat ini tidak menyediakan inventaris perangkat atau feed live. Kamera
            browser untuk mengambil gambar tersedia di alur Deteksi Kakao.
          </p>
          <button className="btn" onClick={() => go("deteksi")}>Buka Deteksi Kakao</button>
        </Card>
        <Card className="monitor-sensor-panel">
          <h3>Sensor lingkungan</h3>
          <p className="sub">
            Data sensor dan blok kebun belum tersedia pada backend. Tidak ada nilai simulasi
            yang ditampilkan.
          </p>
          <button className="btn ghost" onClick={() => go("kebun")}>Lihat informasi kebun</button>
        </Card>
      </div>
    </div>
  );
}
