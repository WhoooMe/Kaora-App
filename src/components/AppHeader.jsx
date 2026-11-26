import React from "react";
import { Icon } from "../ui.jsx";
import { KaoraLogo } from "./ui/KaoraComponents.jsx";

const MAIN = [
  ["dashboard", "Dashboard", "grid"],
  ["deteksi", "Deteksi Kakao", "scan"],
  ["kalibrasi", "Kalibrasi", "scan"],
  ["analisis", "Analisis Deteksi", "chart"],
  ["monitor", "Monitor Perangkat", "vid"],
];

const MORE = [
  ["kebun", "Kebun dan Blok", "leaf"],
  ["kamera", "Kamera", "cam"],
  ["riwayat", "Riwayat Deteksi", "hist"],
  ["pengaturan", "Pengaturan", "set"],
];

const AppHeader = ({ pg, go, menu, setMenu, more, setMore, bell, setBell }) => {
  const isMore = MORE.some((m) => m[0] === pg);

  const Item = ([k, l, i]) => (
    <button
      key={k}
      className={"nl" + (pg === k ? " on" : "")}
      onClick={() => go(k)}
    >
      <Icon n={i} s={17} />
      {l}
    </button>
  );

  return (
    <div className="top-wrap">
      <header className="topbar">
        <button className="brand" aria-label="KAORA — Dashboard" onClick={() => go("dashboard")}>
          <KaoraLogo size={36} />
        </button>

        <nav className="links" aria-label="Navigasi utama">
          {MAIN.map(Item)}
          <div className="dd">
            <button
              className={"nl" + (isMore ? " on" : "")}
              onClick={() => setMore(!more)}
            >
              Kelola
              <Icon n="chev" s={15} />
            </button>
            {more && <div className="menu">{MORE.map(Item)}</div>}
          </div>
        </nav>

        <div className="right">
          <button className="sel kb" type="button" onClick={() => go("kebun")} aria-label="Informasi kebun belum tersedia">
            Kebun · belum tersedia
          </button>

          <div className="dd">
            <button
              className="ib"
              aria-label="Notifikasi"
              onClick={() => setBell(!bell)}
            >
              <Icon n="bell" />
              <b />
            </button>
            {bell && (
              <div className="menu r">
                <div>
                  <b>Notifikasi operasional belum tersedia</b>
                  <small>Backend belum menyediakan sumber notifikasi perangkat atau panen.</small>
                </div>
              </div>
            )}
          </div>

          <button
            className="ib burger"
            aria-label="Menu"
            onClick={() => setMenu(!menu)}
          >
            <Icon n="menu" />
          </button>
        </div>
      </header>

      {menu && <div className="mob">{[...MAIN, ...MORE].map(Item)}</div>}
    </div>
  );
};

export default AppHeader;
