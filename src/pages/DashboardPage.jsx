import React, { useState } from "react";
import { C, HIST, PERIODS, series } from "../data.js";
import { Icon, Badge, Legend, Tabs, Scene, Closeup, TrendChart, DistChart } from "../ui.jsx";
import KaoraCard from "../components/KaoraCard";
import { Demo, Kpis, HistTable } from "./shared.jsx";

const DashboardPage = ({ go }) => {
  const [p, setP] = useState("7 Hari");

  return (
    <>
      <section className="hero">
        <Scene />
        <div className="shade" />
        <div className="top">
          <div>
            <span className="chip">Minggu, 18 Oktober 2026 · 7 hari terakhir</span>
            <h2>Selamat Datang, Pak Hendra</h2>
            <p>
              Pantau kondisi kebun dan temukan buah kakao yang siap dipanen hari
              ini.
            </p>
          </div>
          <div className="glass">
            {[
              ["Suhu", "29°C"],
              ["Kelembapan Tanah", "68%"],
              ["Curah Hujan", "12 mm"],
            ].map(([a, b]) => (
              <div key={a}>
                <small>{a}</small>
                <b>{b}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="strip">
          <div className="nm">
            <small>Blok dengan panen terbanyak</small>
            <b>Blok A · Kebun Sumber Rejeki</b>
          </div>
          <div>
            <small>Luas</small>
            <b>2,4 ha</b>
          </div>
          <div>
            <small>Siap panen</small>
            <b style={{ color: C.ok }}>118</b>
          </div>
          <div>
            <small>Kamera aktif</small>
            <b>2 dari 2</b>
          </div>
          <button className="btn lime" onClick={() => go("deteksi")}>
            <Icon n="scan" />
            Deteksi Kakao
          </button>
        </div>
      </section>

      <Kpis v={{ total: 1248, ok: 412, harv: 296, raw: 506, over: 187, bad: 143 }} />

      <div className="row r2">
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Tren Kematangan Kakao</h3>
              <p className="sub">
                Jumlah buah terdeteksi per kategori kematangan <Demo />
              </p>
            </div>
            <Tabs v={p} items={Object.keys(PERIODS)} on={setP} />
          </div>
          <TrendChart
            s={series(p, 1)}
            labels={Array.from({ length: PERIODS[p].n }, (_, i) => PERIODS[p].lab(i))}
          />
          <Legend />
        </KaoraCard>

        <KaoraCard>
          <h3>Distribusi Buah per Blok</h3>
          <p className="sub">7 hari terakhir, menurut tingkat kematangan</p>
          <DistChart />
          <Legend />
        </KaoraCard>
      </div>

      <div className="row r3">
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Kamera Kebun</h3>
              <p className="sub">Pratinjau kamera terpasang</p>
            </div>
            <Badge c="ok">Online</Badge>
          </div>
          <div className="cam">
            <Closeup />
            <span className="live">● LIVE</span>
          </div>
          <div className="cm">
            <div>
              <b>Kamera Blok A-01</b>
              <small className="mut">Blok A · Diperbarui 08:02 WIB</small>
            </div>
            <div>
              <b>9 buah</b>
              <small className="mut">di frame</small>
            </div>
          </div>
          <button className="btn full" onClick={() => go("monitor")}>
            Buka Live Monitor
          </button>
        </KaoraCard>

        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Riwayat Deteksi Terkini</h3>
              <p className="sub">Hasil tersimpan, bukan tayangan langsung</p>
            </div>
            <button className="btn ghost" onClick={() => go("riwayat")}>
              Lihat Semua
            </button>
          </div>
          <HistTable rows={HIST} />
        </KaoraCard>
      </div>
    </>
  );
};

export default DashboardPage;
