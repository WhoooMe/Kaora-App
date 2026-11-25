import React, { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooter";
import {
  DashboardPage,
  DeteksiPage,
  AnalisisPage,
  MonitorPage,
  KebunPage,
  KameraPage,
  RiwayatPage,
  PengaturanPage,
} from "./pages/index.js";

const PAGES = {
  dashboard: DashboardPage,
  deteksi: DeteksiPage,
  analisis: AnalisisPage,
  monitor: MonitorPage,
  kebun: KebunPage,
  kamera: KameraPage,
  riwayat: RiwayatPage,
  pengaturan: PengaturanPage,
};

export default function App() {
  const read = () => location.hash.slice(1) || "dashboard";
  const [pg, setPg] = useState(read),
    [menu, setMenu] = useState(false),
    [more, setMore] = useState(false),
    [bell, setBell] = useState(false),
    [tm, setTm] = useState("");

  useEffect(() => {
    const f = () => {
      setPg(read());
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);

  const go = (p) => {
    location.hash = p;
    setMenu(false);
    setMore(false);
  };

  const toast = (m) => {
    setTm(m);
    setTimeout(() => setTm(""), 2600);
  };

  const Page = PAGES[pg] || DashboardPage;

  return (
    <div className="shell">
      <AppHeader
        pg={pg}
        go={go}
        menu={menu}
        setMenu={setMenu}
        more={more}
        setMore={setMore}
        bell={bell}
        setBell={setBell}
      />

      <main key={pg}>
        <Page go={go} toast={toast} />
      </main>

      <AppFooter />

      {tm && (
        <div className="toast" role="status">
          {tm}
        </div>
      )}
    </div>
  );
}
