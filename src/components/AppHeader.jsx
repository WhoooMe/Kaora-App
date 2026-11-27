import React, { useEffect, useRef } from "react";
import { Icon } from "../ui.jsx";
import { KaoraLogo } from "./ui/KaoraComponents.jsx";
import { MAIN_NAVIGATION } from "./navigation.js";

const MORE = [
  ["kebun", "Kebun dan Blok", "leaf"],
  ["kamera", "Kamera", "cam"],
  ["riwayat", "Riwayat Deteksi", "hist"],
  ["pengaturan", "Pengaturan", "set"],
];

const AppHeader = ({ pg, go, menu, setMenu, more, setMore, bell, setBell }) => {
  const isMore = MORE.some((m) => m[0] === pg);
  const manageDropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    if (!more && !bell) return undefined;

    const closeOutside = (event) => {
      if (!manageDropdownRef.current?.contains(event.target)) setMore(false);
      if (!notificationsRef.current?.contains(event.target)) setBell(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMore(false);
        setBell(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [more, bell, setMore, setBell]);

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
          {MAIN_NAVIGATION.map(Item)}
          <div className="dd" ref={manageDropdownRef}>
            <button
              className={"nl" + (isMore ? " on" : "")}
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              Kelola
              <Icon n="chev" s={15} />
            </button>
            <div
              className={`menu manage-menu${more ? " is-open" : ""}`}
              aria-hidden={!more}
            >
              {MORE.map(Item)}
            </div>
          </div>
        </nav>

        <div className="right">
          <button className="sel kb" type="button" onClick={() => go("kebun")} aria-label="Informasi kebun belum tersedia">
            Kebun · belum tersedia
          </button>

          <div className="dd" ref={notificationsRef}>
            <button
              className="ib"
              aria-label="Notifikasi"
              onClick={() => setBell(!bell)}
            >
              <Icon n="bell" />
              <b />
            </button>
            {bell && (
              <div className="menu r is-open">
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

      {menu && <div className="mob">{[...MAIN_NAVIGATION, ...MORE].map(Item)}</div>}
    </div>
  );
};

export default AppHeader;
