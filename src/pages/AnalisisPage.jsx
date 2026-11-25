import React, { useState } from "react";
import { BLOK, PERIODS, series, sum, C, NM } from "../data.js";
import { Card, Legend, Tabs, Badge } from "../ui.jsx";
import { Head, Kpis, Sel, Trend, Demo, fmt } from "./shared.jsx";

const AnalisisPage = () => {
  const [p, setP] = useState("7 Hari");
  const [b, setB] = useState("Semua");

  const bl = b === "Semua" ? BLOK : { [b]: BLOK[b] };
  const share = (sum(bl[Object.keys(bl)[0]]) * (b === "Semua" ? 0 : 1)) / 1248 || 1;
  const sh = b === "Semua" ? 1 : sum(BLOK[b]) / 1248;

  const s = series(p, sh);
  const totalBy = (c) => s[c].reduce((a, v) => a + v, 0);
  const v = {
    ok: totalBy("ok"),
    raw: totalBy("raw"),
    over: totalBy("over"),
    bad: totalBy("bad"),
  };
  v.total = v.ok + v.raw + v.over + v.bad;
  v.harv = Math.round(((296 * PERIODS[p].days) / 7) * sh);

  const top = (c) => Object.entries(BLOK).sort((a, z) => z[1][c] - a[1][c])[0];

  return (
    <>
      <Head
        t="Analisis Panen"
        s="Pantau tren kematangan, distribusi buah, dan kesiapan panen dari seluruh blok kebun."
      >
        <Sel
          v={b}
          on={setB}
          label="Blok"
          opts={[["Semua", "Semua Blok"], ...Object.keys(BLOK).map((k) => [k, "Blok " + k])]}
        />
        <button className="btn ghost" onClick={() => {}}>
          Ekspor
        </button>
      </Head>

      <div className="bar-f">
        <Tabs v={p} items={Object.keys(PERIODS)} on={setP} />
        <small className="mut">
          Perbandingan: periode sebelumnya dengan lama yang sama
        </small>
      </div>

      <Kpis v={v} />

      <div className="row r2">
        <Trend p={p} setP={setP} share={sh} title="Tren Kematangan Kakao" />
        <Card>
          <h3>Distribusi per Blok Area</h3>
          <p className="sub">Total dan rincian per kategori</p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Blok</th>
                  <th>Siap Panen</th>
                  <th>Mentah</th>
                  <th>Busuk / Rusak</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BLOK).map(([k, value]) => (
                  <tr key={k}>
                    <td>Blok {k}</td>
                    <td>{value.ok}</td>
                    <td>{value.raw}</td>
                    <td>{value.bad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Legend />
        </Card>
      </div>

      <Card className="mb">
        <h3>Perbandingan Blok</h3>
        <div className="cmp">
          {[
            ["Paling banyak siap panen", "ok"],
            ["Paling banyak mentah", "raw"],
            ["Paling banyak terlalu matang", "over"],
            ["Paling banyak busuk / rusak", "bad"],
          ].map(([l, c]) => (
            <div key={c}>
              <small className="mut">{l}</small>
              <b>Blok {top(c)[0]}</b>
              <Badge c={c}>{top(c)[1][c]} buah</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3>Ringkasan Panen</h3>
        <p className="sub">Prediksi dari deteksi dan catatan panen dipisahkan.</p>
        <div className="cmp">
          <div>
            <small className="mut">Diprediksi siap panen</small>
            <b>{fmt(v.ok)}</b>
          </div>
          <div>
            <small className="mut">Tercatat dipanen</small>
            <b>{fmt(v.harv)}</b>
          </div>
          <div>
            <small className="mut">Masih mentah</small>
            <b>{fmt(v.raw)}</b>
          </div>
          <div>
            <small className="mut">Terlalu matang / rusak</small>
            <b>{fmt(v.over + v.bad)}</b>
          </div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Blok</th>
                <th>Dipanen</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["17 Okt", "A", 64, "Panen pagi"],
                ["15 Okt", "C", 82, "Dua pekerja"],
                ["13 Okt", "B", 71, "—"],
                ["11 Okt", "A", 79, "Buah besar"],
              ].map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td>Blok {r[1]}</td>
                  <td>
                    <b>{r[2]}</b> buah
                  </td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

export default AnalisisPage;
