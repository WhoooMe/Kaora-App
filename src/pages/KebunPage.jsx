import React from "react";
import useDetectionRecords from "../hooks/useDetectionRecords.js";
import { Card } from "../ui.jsx";
import { Head } from "./shared.jsx";

export default function KebunPage() {
  const { records, total, loading, error, refresh } = useDetectionRecords();
  const blocks = new Map();
  records.forEach((record) => {
    const name = record.block_name?.trim();
    if (!name) return;
    const item = blocks.get(name) || { total: 0, classes: { Immature: 0, Mature: 0, Overmature: 0 } };
    item.total += 1;
    if (Object.hasOwn(item.classes, record.maturity_class)) item.classes[record.maturity_class] += 1;
    blocks.set(name, item);
  });
  return <>
    <Head t="Kebun dan Blok" s="Rekap berdasarkan nama blok yang dicatat pada record deteksi. Ini bukan inventaris kebun." />
    {loading ? <Card role="status">Memuat data deteksi…</Card> : error ? <Card role="alert"><p>Data blok tidak dapat dimuat: {error}</p><button className="btn" onClick={refresh}>Coba lagi</button></Card> : <>
      <Card className="phase3e-note"><b>Batasan sumber data</b><p className="sub">Backend tidak menyediakan inventaris kebun/blok, lokasi, atau pencatatan panen. Rekap berikut hanya menghitung record yang memiliki block_name; jumlah Mature bukan jumlah panen.</p><p className="sub">{records.length} dari {total} record dimuat.</p></Card>
      {blocks.size ? <div className="kpis k4">{[...blocks.entries()].map(([name, values]) => <Card key={name} className="phase3e-garden-card"><h3>{name}</h3><div className="cmp one"><div><small className="mut">Record deteksi</small><b>{values.total}</b></div></div><p className="sub">Immature: {values.classes.Immature} · Mature: {values.classes.Mature} · Overmature: {values.classes.Overmature}</p></Card>)}</div> : <Card className="phase3e-empty">Belum ada record deteksi dengan nama blok tersimpan. Lokasi kebun dan aktivitas panen belum tersedia.</Card>}
      {total > records.length && <Card className="phase3e-note">Rekap ini mencakup sebagian data saja.</Card>}
    </>}
  </>;
}
