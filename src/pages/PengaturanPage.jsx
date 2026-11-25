import React from "react";
import { Card } from "../ui.jsx";
import { Head } from "./shared.jsx";

const PengaturanPage = ({ toast }) => (
  <>
    <Head
      t="Pengaturan Akun"
      s="Kelola profil, kebun default, dan keamanan."
    />
    <Card className="form">
      {[
        ["Nama Lengkap", "Hendra Saputra"],
        ["Email", "hendra@contoh.id"],
        ["Kebun Default", "Kebun Sumber Rejeki"],
      ].map(([l, v]) => (
        <label key={l}>
          {l}
          <input defaultValue={v} />
        </label>
      ))}
      <button className="btn" onClick={() => toast("Perubahan disimpan.")}>
        Simpan Perubahan
      </button>
    </Card>
  </>
);

export default PengaturanPage;
