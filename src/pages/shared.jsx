import React, { useState } from "react";
import { C, NM, BLOK, CAMS, HIST, PERIODS, series, sum, sensors, ORDER } from "../data.js";
import {
  Icon,
  Badge,
  Card,
  Legend,
  Tabs,
  Pod,
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
    ["Total Deteksi Tersimpan", v.total, "scan", "#2F7848"],
    ["Mature (kelas terdeteksi)", v.ok, "check", "#5EAD47"],
    ["Sudah Dipanen · belum dicatat", v.harv, "leaf", "#174D35"],
    ["Mentah", v.raw, "chart", "#E2B23F"],
    ["Terlalu Matang", v.over, "hist", "#ED8B43"],
    ["Kerusakan · belum dicatat", v.bad, "x", "#D9534F"],
  ];

  return (
    <div className="kpis">
      {K.map(([l, n, i, c]) => (
        <Card key={l} className="kpi">
          <div className="t">
            <span className="ic" style={{ background: c }}>
              <Icon n={i} s={15} />
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
        <div className="th">
          <Pod c={C[c]} />
        </div>
      </td>
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
        <Badge c={c}>{NM[c]}</Badge>
      </td>
    </tr>
  ));

export const HistTable = ({ rows, className = "" }) => (
  <div className={`scroll ${className}`.trim()}>
    <table>
      <thead>
        <tr>
          <th />
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
