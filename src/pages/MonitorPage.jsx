import React, { useState } from "react";
import { CAMS, BLOK, sensors } from "../data.js";
import { Badge, Card, Closeup, Icon, Sensors } from "../ui.jsx";
import { Demo, Head, Sel } from "./shared.jsx";

const MonitorPage = ({ go }) => {
  const [b, setB] = useState("A");
  const on = CAMS.filter((c) => c.st === "online").length;

  return (
    <>
      <Head
        t="Live Monitor"
        s="Pantau kamera dan kondisi lingkungan dari setiap blok perkebunan kakao."
      />
      <div className="kpis k5">
        {[
          ["Total Kamera", CAMS.length],
          ["Kamera Online", on],
          ["Kamera Offline", 1],
          ["Blok Dipantau", 4],
          ["Peringatan Aktif", 3],
        ].map(([l, n]) => (
          <Card key={l} className="kpi">
            <div className="t">{l}</div>
            <b>{n}</b>
          </Card>
        ))}
      </div>

      <div className="row r2">
        <div className="camgrid">
          {CAMS.map((c) => (
            <Card key={c.id} className="cc">
              <div className="cam">
                {c.st === "offline" ? (
                  <div className="off">
                    <Icon n="vid" s={28} />
                    <span>Kamera offline</span>
                  </div>
                ) : (
                  <Closeup boxes={c.n > 10 ? undefined : [[90, 110, "ok", 90], [210, 100, "raw", 85]]} />
                )}
                {c.st === "online" && <span className="live">● LIVE</span>}
              </div>
              <div className="cm">
                <div>
                  <b>Kamera Blok {c.id}</b>
                  <small className="mut">
                    Blok {c.b} · {c.t}
                  </small>
                </div>
                <Badge c={c.st === "online" ? "ok" : c.st === "warning" ? "raw" : "off"}>
                  {c.st === "online" ? "Online" : c.st === "warning" ? "Koneksi lemah" : "Offline"}
                </Badge>
              </div>
              <div className="cm">
                <small className="mut">
                  {c.st === "offline" ? "Tidak ada data terbaru" : c.n + " buah terdeteksi"}
                </small>
                <button className="btn ghost" onClick={() => setB(c.b)}>
                  Lihat Detail
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="hd">
            <div>
              <h3>Lingkungan Blok {b}</h3>
              <p className="sub">Sensor, terpisah dari deteksi kamera</p>
            </div>
            <Sel
              v={b}
              on={setB}
              label="Blok"
              opts={Object.keys(BLOK).map((k) => [k, "Blok " + k])}
            />
          </div>
          <Sensors list={sensors(b)} />
          <Demo />
        </Card>
      </div>
    </>
  );
};

export default MonitorPage;
