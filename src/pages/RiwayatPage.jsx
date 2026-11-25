import React from "react";
import { Card } from "../ui.jsx";
import { HIST } from "../data.js";
import { Head, HistTable } from "./shared.jsx";

const RiwayatPage = () => (
  <>
    <Head
      t="Riwayat Deteksi"
      s="Semua hasil deteksi yang pernah disimpan. Ini data historis."
    />
    <Card>
      <HistTable rows={[...HIST, ...HIST]} />
    </Card>
  </>
);

export default RiwayatPage;
