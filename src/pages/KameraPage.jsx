import React from "react";
import { CAMS } from "../data.js";
import { Badge, Card } from "../ui.jsx";
import { Head } from "./shared.jsx";

const KameraPage = ({ toast }) => (
  <>
    <Head t="Kelola Kamera" s="Atur kamera pemantau di setiap blok.">
      <button
        className="btn"
        onClick={() => toast("Alur Tambah Kamera belum dibuat di prototipe ini.")}
      >
        Tambah Kamera
      </button>
    </Head>
    <Card>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Kamera</th>
              <th>Blok</th>
              <th>Status</th>
              <th>Terakhir terhubung</th>
            </tr>
          </thead>
          <tbody>
            {CAMS.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>Kamera {c.id}</b>
                </td>
                <td>Blok {c.b}</td>
                <td>
                  <Badge c={c.st === "online" ? "ok" : c.st === "warning" ? "raw" : "off"}>
                    {c.st === "online" ? "Online" : c.st === "warning" ? "Koneksi lemah" : "Offline"}
                  </Badge>
                </td>
                <td>{c.t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </>
);

export default KameraPage;
