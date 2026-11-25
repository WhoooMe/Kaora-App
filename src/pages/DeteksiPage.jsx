import React, { useState, useRef, useEffect } from "react";
import { Icon, Badge, Card, Tabs, Closeup } from "../ui.jsx";
import { NM } from "../data.js";
import { Demo } from "./shared.jsx";

const DeteksiPage = ({ go, toast }) => {
  const [mode, setMode] = useState("Kamera Langsung");
  const [st, setSt] = useState("idle");
  const [pr, setPr] = useState(0);
  const [img, setImg] = useState(null);
  const [saved, setSaved] = useState(false);
  const fr = useRef();

  useEffect(() => {
    if (st !== "proses") return;
    const t = setInterval(
      () =>
        setPr((v) => {
          if (v >= 100) {
            clearInterval(t);
            setSt("hasil");
            return 100;
          }
          return v + 5;
        }),
      120,
    );
    return () => clearInterval(t);
  }, [st]);

  const run = () => {
    setPr(0);
    setSaved(false);
    setSt("proses");
  };

  const reset = () => {
    setSt("idle");
    setImg(null);
  };

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (f) setImg(URL.createObjectURL(f));
  };

  const res = { ok: 5, raw: 3, over: 1, bad: 1 };

  return (
    <>
      {st === "idle" && (
        <div className="deteksi-page">
          <header className="deteksi-header">
            <div className="deteksi-header-copy">
              <div className="deteksi-breadcrumb">
                Kebun Sumber Rejeki <span>/</span> Blok A
              </div>
              <h1>Deteksi Kakao</h1>
              <p>
                Kenali tingkat kematangan buah kakao dengan bantuan kamera atau
                unggah foto.
              </p>
            </div>
            <div className="deteksi-header-controls">
              <label className="deteksi-field">
                <span>Kebun</span>
                <select defaultValue="sumber-rejeki" aria-label="Pilih kebun">
                  <option value="sumber-rejeki">Kebun Sumber Rejeki</option>
                  <option value="lereng-timur">Kebun Lereng Timur</option>
                </select>
              </label>
              <label className="deteksi-field">
                <span>Blok</span>
                <select defaultValue="a" aria-label="Pilih blok">
                  <option value="a">Blok A</option>
                  <option value="b">Blok B</option>
                  <option value="c">Blok C</option>
                </select>
              </label>
            </div>
          </header>

          <div className="deteksi-layout">
            <Card className="deteksi-panel">
              <div className="deteksi-panel-header">
                <div className="deteksi-panel-title-wrap">
                  <span className="deteksi-mini-icon">
                    <Icon n="cam" s={16} />
                  </span>
                  <div>
                    <h2>Pratinjau Kamera</h2>
                    <p>Posisikan buah di tengah frame agar hasil lebih akurat.</p>
                  </div>
                </div>
                <span className="deteksi-status active">Kamera siap</span>
              </div>

              <div className="deteksi-mode-tabs">
                <Tabs
                  v={mode}
                  items={["Kamera Langsung", "Unggah Foto"]}
                  on={setMode}
                />
              </div>

              {mode === "Kamera Langsung" ? (
                <>
                  <div className="cam big deteksi-cam">
                    <Closeup boxes={[]} />
                    <span className="live">● Live</span>
                  </div>
                  <div className="deteksi-camera-meta">
                    <span className="deteksi-hint">
                      Posisikan buah kakao di tengah bingkai dengan cahaya yang
                      cukup.
                    </span>
                    <Badge c="ok">Diizinkan</Badge>
                  </div>
                  <div className="deteksi-actions">
                    <button className="btn deteksi-primary" onClick={run}>
                      <Icon n="cam" />
                      Ambil Foto
                    </button>
                    <button
                      className="btn deteksi-secondary"
                      onClick={() => toast("Kamera belakang dipilih (simulasi).")}
                    >
                      <Icon n="cam" />
                      Ganti Kamera
                    </button>
                    <button
                      className="btn deteksi-secondary"
                      onClick={() => setMode("Unggah Foto")}
                    >
                      <Icon n="up" />
                      Unggah Foto
                    </button>
                  </div>
                </>
              ) : img ? (
                <>
                  <div className="cam big deteksi-cam">
                    <img
                      src={img}
                      alt="Pratinjau foto"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div className="deteksi-actions">
                    <button className="btn deteksi-primary" onClick={run}>
                      <Icon n="scan" />
                      Analisis Foto
                    </button>
                    <button
                      className="btn deteksi-secondary"
                      onClick={() => fr.current.click()}
                    >
                      <Icon n="up" />
                      Ganti
                    </button>
                    <button
                      className="btn deteksi-secondary"
                      onClick={() => setImg(null)}
                    >
                      <Icon n="x" />
                      Hapus
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="drop deteksi-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pick({ target: { files: e.dataTransfer.files } });
                  }}
                >
                  <span className="drop-illustration">
                    <Icon n="up" s={34} />
                  </span>
                  <h3>Unggah Foto Buah Kakao</h3>
                  <p className="sub">
                    Seret foto ke sini atau pilih dari perangkat. Format JPG,
                    JPEG, PNG · maks. 10 MB.
                  </p>
                  <button className="btn deteksi-primary" onClick={() => fr.current.click()}>
                    <Icon n="up" />
                    Pilih Foto
                  </button>
                </div>
              )}
              <input
                ref={fr}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={pick}
              />
            </Card>

            <aside className="deteksi-guide">
              <div className="deteksi-guide-header">
                <span className="deteksi-mini-icon guide-icon">
                  <Icon n="scan" s={16} />
                </span>
                <div>
                  <h2>Panduan Deteksi</h2>
                  <p>Ikuti langkah berikut agar foto buah lebih mudah dianalisis.</p>
                </div>
              </div>

              <div className="deteksi-steps">
                <div className="deteksi-step">
                  <span className="step-number">1</span>
                  <div>
                    <h3>Pencahayaan cukup</h3>
                    <p>Hindari foto yang terlalu gelap atau terlalu terang.</p>
                  </div>
                </div>
                <div className="deteksi-step">
                  <span className="step-number">2</span>
                  <div>
                    <h3>Buah terlihat jelas</h3>
                    <p>Pastikan objek tidak terpotong dan tetap fokus.</p>
                  </div>
                </div>
                <div className="deteksi-step">
                  <span className="step-number">3</span>
                  <div>
                    <h3>Ambil atau unggah foto</h3>
                    <p>Gunakan kamera atau pilih gambar dari galeri.</p>
                  </div>
                </div>
              </div>

              <div className="deteksi-note">
                <span className="deteksi-note-icon">
                  <Icon n="warn" s={16} />
                </span>
                <div>
                  <h3>Catatan</h3>
                  <p>
                    Proses deteksi akan menilai kondisi buah berdasarkan bentuk,
                    warna, dan tingkat kematangan yang terlihat pada foto.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {st === "proses" && (
        <Card className="work center">
          <div className="cam big">
            <Closeup boxes={[]} />
          </div>
          <h3>Sedang Menganalisis Buah Kakao…</h3>
          <div className="prog">
            <i style={{ width: pr + "%" }} />
          </div>
          <p className="sub">
            {pr}% · simulasi, tidak memakai model deteksi sungguhan
          </p>
        </Card>
      )}

      {st === "hasil" && (
        <div className="row r2">
          <Card>
            <div className="cam big">
              <Closeup />
            </div>
            <p className="sub">
              Kotak dan label contoh; skor kepercayaan ditampilkan pada setiap
              buah.
            </p>
          </Card>
          <Card>
            <h3>Hasil Deteksi</h3>
            <p className="sub">
              Blok A · 18 Okt 2026, 08:14 WIB <Demo />
            </p>
            <div className="big-n">
              10<small> buah terdeteksi</small>
            </div>
            {Object.entries(res).map(([c, n]) => (
              <div className="sen" key={c}>
                <div className="n">
                  <Badge c={c}>{NM[c]}</Badge>
                </div>
                <b className="val">{n}</b>
              </div>
            ))}
            {saved && (
              <div className="note ok">
                <Icon n="check" />
                <div>
                  <b>Hasil tersimpan</b>
                  <small>
                    Ditambahkan ke riwayat dan analisis. Ini bukan catatan panen.
                  </small>
                </div>
              </div>
            )}
            <div className="acts col">
              <button
                className="btn"
                disabled={saved}
                onClick={() => {
                  setSaved(true);
                  toast("Hasil deteksi disimpan.");
                }}
              >
                Simpan Hasil Deteksi
              </button>
              <button className="btn ghost" onClick={reset}>
                Deteksi Ulang
              </button>
              <button className="btn ghost" onClick={() => go("analisis")}>
                Lihat Analisis Panen
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default DeteksiPage;
