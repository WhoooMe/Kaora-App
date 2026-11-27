import React, { useState } from "react";
import { C, NM, BLOK, CAMS, HIST, PERIODS, series, sum, sensors, ORDER } from "../data.js";
import detectionIcon from "../assets/kpi-icons/detection.webp";
import matureIcon from "../assets/kpi-icons/mature.webp";
import panenIcon from "../assets/kpi-icons/panen.webp";
import rawIcon from "../assets/kpi-icons/raw.webp";
import overmatureIcon from "../assets/kpi-icons/overmature.webp";
import rootenIcon from "../assets/kpi-icons/rooten.webp";
import overFruitIcon from "../assets/over.png";
import perfectFruitIcon from "../assets/perfect.png";
import rawFruitIcon from "../assets/raw1.png";
import rootFruitIcon from "../assets/root.png";
import {
  Badge,
  Card,
  Legend,
  Tabs,
  DistChart,
  Sensors,
  TrendChart,
} from "../ui.jsx";

export const fmt = (n) => n.toLocaleString("id-ID");

export const Head = ({ t, s, children }) => (
  <div className="phead">
    <div>
      <h1>{t}</h1>
      <p>{s}</p>
    </div>
    <div className="acts">{children}</div>
  </div>
);

export const Demo = () => <span className="demo">Data Simulasi</span>;

const HIST_ICONS = {
  ok: perfectFruitIcon,
  over: overFruitIcon,
  raw: rawFruitIcon,
  bad: rootFruitIcon,
};

export const MaturityFruitIcon = ({ maturityClass }) => {
  const src = HIST_ICONS[maturityClass];
  return src ? <img className="maturity-fruit-icon" src={src} alt="" /> : null;
};

export const Sel = ({ v, on, opts, label }) => (
  <select
    className="sel"
    aria-label={label}
    value={v}
    onChange={(e) => on(e.target.value)}
  >
    {opts.map((o) => (
      <option key={o[0]} value={o[0]}>
        {o[1]}
      </option>
    ))}
  </select>
);

export function Kpis({ v }) {
  const K = [
    ["Total Deteksi", v.total, detectionIcon],
    ["Mature", v.ok, matureIcon],
    ["Sudah Dipanen", v.harv, panenIcon],
    ["Raw", v.raw, rawIcon],
    ["Overmature", v.over, overmatureIcon],
    ["Rooten", v.bad, rootenIcon],
  ];

  return (
    <div className="kpis">
      {K.map(([l, n, icon]) => (
        <Card key={l} className="kpi">
          <div className="t">
            <span className="ic">
              <img src={icon} alt="" />
            </span>
            {l}
          </div>
          <b>{n == null ? "—" : fmt(n)}</b>
        </Card>
      ))}
    </div>
  );
}

export const Trend = ({ p, setP, share = 1, title = "Tren Kematangan Kakao" }) => (
  <Card>
    <div className="hd">
      <div>
        <h3>{title}</h3>
        <p className="sub">
          Jumlah buah terdeteksi per kategori kematangan <Demo />
        </p>
      </div>
      <Tabs v={p} items={Object.keys(PERIODS)} on={setP} />
    </div>
    <TrendChart
      s={series(p, share)}
      labels={Array.from({ length: PERIODS[p].n }, (_, i) => PERIODS[p].lab(i))}
    />
    <Legend />
  </Card>
);

export const HistRows = ({ rows }) =>
  rows.map(([t, b, s, n, c], i) => (
    <tr key={i}>
      <td>
        {t}
        <small className="mut">Riwayat</small>
      </td>
      <td>Blok {b}</td>
      <td>{s}</td>
      <td>
        <b>{n}</b>
      </td>
      <td>
        <span className="dashboard-dominant">
          <MaturityFruitIcon maturityClass={c} />
          <Badge c={c}>{NM[c]}</Badge>
        </span>
      </td>
    </tr>
  ));

export const HistTable = ({ rows, className = "" }) => (
  <div className={`scroll ${className}`.trim()}>
    <table>
      <thead>
        <tr>
          <th>Waktu</th>
          <th>Blok</th>
          <th>Sumber</th>
          <th>Buah</th>
          <th>Dominan</th>
        </tr>
      </thead>
      <tbody>
        <HistRows rows={rows} />
      </tbody>
    </table>
  </div>
);

export { C, NM, BLOK, CAMS, HIST, PERIODS, series, sum, sensors, ORDER };
