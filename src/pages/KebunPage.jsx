import React from "react";
import { BLOK, CAMS, sum } from "../data.js";
import { Card } from "../ui.jsx";
import { Head } from "./shared.jsx";

const KebunPage = () => (
  <>
    <Head
      t="Kebun dan Blok"
      s="Kelola blok, luas area, dan perangkat yang terpasang."
    >
      <button className="btn">Tambah Blok</button>
    </Head>
    <div className="kpis k4">
      {Object.entries(BLOK).map(([k, v]) => (
        <Card key={k}>
          <h3>Blok {k}</h3>
          <p className="sub">
            Kebun Sumber Rejeki · {[2.4, 1.8, 2.1, 1.6][+(k.charCodeAt(0) - 65)]} ha
          </p>
          <div className="cmp one">
            <div>
              <small className="mut">Total buah</small>
              <b>{sum(v)}</b>
            </div>
            <div>
              <small className="mut">Siap panen</small>
              <b style={{ color: "#2F7048" }}>{v.ok}</b>
            </div>
          </div>
          <small className="mut">
            {CAMS.filter((c) => c.b === k).length} kamera · 5 sensor
          </small>
        </Card>
      ))}
    </div>
  </>
);

export default KebunPage;
