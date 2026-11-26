import React from "react";
import { Card } from "../ui.jsx";
import { CameraPreviewUnavailable } from "../components/ui/KaoraComponents.jsx";
import { Head } from "./shared.jsx";

export default function KameraPage({ go }) {
  return <>
    <Head t="Kamera & Pengambilan Gambar" s="Kamera browser digunakan langsung dalam alur Kalibrasi/Deteksi. Inventaris perangkat belum tersedia." />
    <Card className="phase3e-camera-intro"><div><h3>Kamera browser</h3><p className="sub">Akses kamera perangkat pengguna tersedia pada alur Kalibrasi dan Deteksi. Halaman ini tidak menampilkan feed live perkebunan.</p></div><div className="phase3e-actions"><button className="btn" onClick={() => go("kalibrasi")}>Buka Kalibrasi</button><button className="btn ghost" onClick={() => go("deteksi")}>Buka Deteksi / Unggah</button></div></Card>
    <Card><CameraPreviewUnavailable /><h3>Inventaris kamera</h3><p className="sub">Belum ada daftar perangkat kamera atau feed yang tersimpan pada backend.</p></Card>
  </>;
}
