import React, { useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooter";
import { WorkflowProvider } from "./context/WorkflowContext.jsx";
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
  kalibrasi: DeteksiPage,
};

export default function App() {
  const read = () => {
    const hash = location.hash.slice(1) || "dashboard";
    return hash === "kalibrasi" ? "deteksi" : hash;
  };
  const [pg, setPg] = useState(read),
    [menu, setMenu] = useState(false),
    [more, setMore] = useState(false),
    [bell, setBell] = useState(false),
    [tm, setTm] = useState("");

  useEffect(() => {
    if (location.hash === "#kalibrasi") {
      location.replace("#deteksi");
    }
    const f = () => {
      if (location.hash === "#kalibrasi") {
        location.replace("#deteksi");
        return;
      }
      setPg(read());
      setMore(false);
      setBell(false);
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);

  const go = (p) => {
    location.hash = p === "kalibrasi" ? "deteksi" : p;
    setMenu(false);
    setMore(false);
    setBell(false);
  };

  const toast = (m) => {
    setTm(m);
    setTimeout(() => setTm(""), 2600);
  };

  const Page = PAGES[pg] || DashboardPage;

  return (
    <WorkflowProvider>
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

        <AppFooter go={go} />

        {tm && (
          <div className="toast" role="status">
            {tm}
          </div>
        )}
      </div>
    </WorkflowProvider>
  );
}
