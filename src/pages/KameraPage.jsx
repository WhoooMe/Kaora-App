import React from "react";
import { Card } from "../ui.jsx";
import { CameraPreviewUnavailable } from "../components/ui/KaoraComponents.jsx";
import { Head } from "./shared.jsx";

export default function KameraPage({ go }) {
  return (
    <div className="phase3e-camera-page">
      <Head
        t="Kamera & Pengambilan Gambar"
        s="Kamera browser digunakan langsung dalam alur Deteksi Kakao. Inventaris perangkat belum tersedia."
      />
      <Card className="phase3e-camera-intro">
        <div>
          <h3>Kamera browser</h3>
          <p className="sub">
            Akses kamera perangkat pengguna tersedia pada alur Deteksi Kakao. Halaman ini tidak
            menampilkan feed live perkebunan.
          </p>
        </div>
        <div className="phase3e-actions">
          <button className="btn" onClick={() => go("deteksi")}>Buka Deteksi Kakao</button>
        </div>
      </Card>
      <Card className="phase3e-camera-inventory">
        <CameraPreviewUnavailable />
        <h3>Inventaris kamera</h3>
        <p className="sub">Belum ada daftar perangkat kamera atau feed yang tersimpan pada backend.</p>
      </Card>
    </div>
  );
}
