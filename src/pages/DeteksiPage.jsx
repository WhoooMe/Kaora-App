import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Icon, Tabs } from "../ui.jsx";
import {
  EmptyState,
  ErrorState,
  GuideFrame,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  StepIndicator,
} from "../components/ui/KaoraComponents.jsx";
import { detectFrame, getModelsStatus, verifyCalibrationFrame } from "../api/kaoraApi.js";
import { useWorkflow } from "../context/WorkflowContext.jsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DETECTION_STEPS = [
  {
    id: "input",
    title: "Siapkan foto atau frame kamera",
    description: "Gunakan kamera perangkat atau unggah foto buah kakao (JPG, PNG, WEBP).",
  },
  {
    id: "verify",
    title: "Verifikasi objek & kualitas",
    description: "Server memastikan gambar fokus dan merupakan objek buah kakao.",
  },
  {
    id: "result",
    title: "Klasifikasi kematangan",
    description: "Hasil dikelompokkan sebagai Belum matang, Matang, atau Lewat matang.",
  },
];

const MATURITY_LABEL_ID = {
  Immature: "Belum matang",
  Mature: "Matang",
  Overmature: "Lewat matang",
};

const DeteksiPage = ({ go, toast }) => {
  const {
    imageFile,
    imagePreviewUrl: imageUrl,
    imageSource,
    verification,
    setVerification,
    setFrame,
    clearWorkflow,
    markDetectionSuccess,
    setSelectedDetectionId,
  } = useWorkflow();

  const [mode, setMode] = useState("Unggah Foto");
  const [stage, setStage] = useState("idle"); // idle | loading | result | error
  const [loadingText, setLoadingText] = useState("Menjalankan verifikasi dan klasifikasi kematangan di server.");
  const [blockName, setBlockName] = useState("");
  const [modelStatus, setModelStatus] = useState(null);
  const [apiOnline, setApiOnline] = useState(null);
  const [result, setResult] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  // Real device camera state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await getModelsStatus();
      setModelStatus(data);
      setApiOnline(true);
    } catch {
      setModelStatus(null);
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {
      setCameraError("Browser gagal memutar pratinjau kamera.");
    });
  }, [stream]);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const setSelectedFile = (file, source = "uploaded_image") => {
    setFrame(file, source);
    setErrorInfo(null);
    setResult(null);
    setStage("idle");
  };

  const handleFilePick = (event) => {
    const file = event.target.files?.[0];
    if (event.target.value !== undefined) event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorInfo({
        code: "INVALID_IMAGE",
        title: "Format gambar tidak didukung",
        message: "Pilih file gambar berformat JPG, PNG, atau WEBP.",
      });
      setStage("error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorInfo({
        code: "INVALID_IMAGE",
        title: "Ukuran gambar terlalu besar",
        message: "Ukuran file maksimal adalah 10 MB.",
      });
      setStage("error");
      return;
    }
    setSelectedFile(file, "uploaded_image");
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          window.isSecureContext
            ? "Browser ini tidak menyediakan akses kamera. Gunakan browser terbaru yang mendukung getUserMedia."
            : "Akses kamera diblokir karena halaman bukan secure context. Buka melalui HTTPS tepercaya atau localhost; alamat IP WSL dengan HTTP tidak didukung. Unggah gambar tetap tersedia.",
        );
      }
      stopCamera();
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = nextStream;
      setStream(nextStream);
    } catch (err) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Izin kamera ditolak oleh browser."
          : err?.message || "Kamera gagal diaktifkan.",
      );
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    const stageEl = video.parentElement;
    const stageWidth = stageEl?.clientWidth || width;
    const stageHeight = stageEl?.clientHeight || height;

    const scale = Math.max(stageWidth / width, stageHeight / height);
    const renderedWidth = width * scale;
    const renderedHeight = height * scale;
    const offsetX = (stageWidth - renderedWidth) / 2;
    const offsetY = (stageHeight - renderedHeight) / 2;
    let sx = (stageWidth * 0.27 - offsetX) / scale;
    let sy = (stageHeight * 0.15 - offsetY) / scale;
    let cropWidth = (stageWidth * 0.46) / scale;
    let cropHeight = (stageHeight * 0.7) / scale;
    sx = Math.max(0, Math.min(width - 1, sx));
    sy = Math.max(0, Math.min(height - 1, sy));
    cropWidth = Math.max(1, Math.min(width - sx, cropWidth));
    cropHeight = Math.max(1, Math.min(height - sy, cropHeight));

    canvas.width = 640;
    canvas.height = 640;
    canvas.getContext("2d").drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `kaora-detect-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelectedFile(captured, "camera_guide_roi");
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const runDetection = async () => {
    if (!imageFile) return;
    setStage("loading");
    setErrorInfo(null);
    try {
      let activeToken =
        verification.state === "verified" && verification.token ? verification.token : null;

      if (!activeToken) {
        setLoadingText("Langkah 1/2: Memverifikasi objek kakao & kualitas frame…");
        const cal = await verifyCalibrationFrame(imageFile, imageSource);
        if (cal.verified !== true || cal.cocoa_detected !== true || !cal.verification_token) {
          const rejectCode = cal.rejection_code || "COCOA_NOT_DETECTED";
          const rejectMsg =
            cal.message ||
            "Objek kakao belum terverifikasi. Analisis kematangan tidak dijalankan.";
          setVerification({
            state: "rejected",
            message: rejectMsg,
            code: rejectCode,
            token: null,
            result: cal,
          });
          setErrorInfo({
            code: rejectCode,
            title:
              rejectCode === "FRAME_QUALITY_FAILED"
                ? "Kualitas Frame Tidak Memenuhi Syarat"
                : "Objek Bukan Kakao",
            message: rejectMsg,
          });
          setStage("error");
          return;
        }
        activeToken = cal.verification_token;
        setVerification({
          state: "verified",
          message: cal.message || "Objek kakao terverifikasi.",
          code: null,
          token: activeToken,
          result: cal,
        });
      }

      setLoadingText("Langkah 2/2: Mengklasifikasikan tingkat kematangan (ResNet18)…");
      const payload = await detectFrame(imageFile, {
        verificationToken: activeToken,
        blockName: blockName || null,
        source: imageSource,
      });
      const finalResult = { ...payload, isSimulated: false };
      setResult(finalResult);
      markDetectionSuccess(finalResult);
      setStage("result");
      toast?.("Deteksi selesai diproses oleh backend.");
    } catch (err) {
      setErrorInfo({
        code: err.code || "INFERENCE_ERROR",
        title:
          err.code === "MODEL_NOT_READY"
            ? "Model AI Belum Siap"
            : err.code === "COCOA_NOT_DETECTED"
              ? "Objek Bukan Kakao"
              : "Deteksi Belum Dapat Diproses",
        message: err.message,
      });
      setStage("error");
    }
  };

  const resetWorkflow = () => {
    clearWorkflow();
    setResult(null);
    setErrorInfo(null);
    setStage("idle");
  };

  const isCalibrated = verification.state === "verified" && Boolean(verification.token);

  const detectionReady = Boolean(modelStatus?.ready_for_detection);

  return (
    <div className="deteksi-page">
      <header className="deteksi-header">
        <div className="deteksi-header-copy">
          <div className="deteksi-breadcrumb">
            KAORA <span>/</span> {blockName || "Tanpa Blok"}
          </div>
          <h1>Deteksi Kematangan Kakao</h1>
          <p>
            Unggah foto atau gunakan kamera perangkat untuk verifikasi buah kakao dan
            klasifikasi tingkat kematangan.
          </p>
        </div>
        <div className="deteksi-header-controls">
          <label className="deteksi-field">
            <span>Blok Kebun (Opsional)</span>
            <select
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              aria-label="Pilih blok"
            >
              <option value="">Tidak dipilih</option>
              <option value="Blok A">Blok A</option>
              <option value="Blok B">Blok B</option>
              <option value="Blok C">Blok C</option>
            </select>
          </label>
          <div className="deteksi-field">
            <span>Status Model</span>
            <StatusBadge variant={detectionReady ? "ok" : apiOnline === false ? "error" : "warn"}>
              {detectionReady
                ? "Model Siap"
                : apiOnline === false
                  ? "API Offline"
                  : "Menunggu Checkpoint"}
            </StatusBadge>
          </div>
        </div>
      </header>
      <StepIndicator
        steps={DETECTION_STEPS}
        currentStep={stage === "result" ? 2 : isCalibrated ? 2 : imageFile ? 1 : 0}
      />

      {stage === "loading" && (
        <Card className="work center" aria-busy="true" role="status" aria-live="polite">
          <h3>Mengirim Frame ke Backend KAORA…</h3>
          <p className="sub">{loadingText}</p>
        </Card>
      )}

      {stage === "error" && errorInfo && (
        <div className="deteksi-error-layout">
          <ErrorState
            title={errorInfo.title}
            code={errorInfo.code}
            description={errorInfo.message}
            onRetry={imageFile ? runDetection : resetWorkflow}
            retryLabel={imageFile ? "Coba Lagi" : "Pilih Gambar"}
          />
          <div className="deteksi-recovery">
            {imageUrl && <img src={imageUrl} alt="Gambar yang gagal diproses" />}
            <div>
              <h2>Langkah berikutnya</h2>
              <p>Periksa kualitas dan posisi objek, atau pilih gambar lain. Hasil kematangan hanya tersedia setelah verifikasi berhasil.</p>
              <div className="deteksi-actions">
                <SecondaryButton onClick={resetWorkflow}>Pilih atau ambil ulang gambar</SecondaryButton>
                <SecondaryButton onClick={() => go("kalibrasi")}>Buka Kalibrasi</SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div className="row r2">
          <Card>
            <GuideFrame
              showGuide={false}
              bbox={result.bbox}
              bboxAvailable={Boolean(result.bbox_available)}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Foto buah kakao yang dianalisis"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div className="calib-camera-placeholder">
                  <Icon n="scan" s={28} />
                  <b>Pratinjau Gambar</b>
                  <small>Pratinjau lokal tidak tersedia</small>
                </div>
              )}
            </GuideFrame>
            <p className="sub" style={{ marginTop: "0.75rem" }}>
              GuideFrame hanya panduan posisi visual. Lokalisasi objek AI tidak tersedia; hasil klasifikasi berlaku untuk frame yang dikirim.
            </p>
          </Card>

          <Card className="detection-result-card">
            <div className="detection-result-heading">
              <div>
                <span className="result-eyebrow">HASIL RESNET18</span>
                <h2>Klasifikasi kematangan</h2>
              </div>
              <StatusBadge variant="ok">Verifikasi kakao berhasil</StatusBadge>
            </div>
            <div className={`maturity-hero maturity-hero--${String(result.maturity_class || "").toLowerCase()}`}>
              <span>Kelas terprediksi</span>
              <strong>{result.maturity_label_id || MATURITY_LABEL_ID[result.maturity_class] || result.maturity_class || "Tidak tersedia"}</strong>
              {typeof result.confidence === "number" && (
                <span className="maturity-confidence">Keyakinan classifier pada kelas ini: <b>{Math.round(result.confidence * 100)}%</b></span>
              )}
            </div>
            <section className="result-distribution" aria-label="Distribusi probabilitas kelas kematangan">
              <h3>Distribusi probabilitas</h3>
              <p className="sub">Skor keluaran classifier untuk setiap kelas kematangan.</p>
              <div className="kaora-maturity-grid">
                {["Immature", "Mature", "Overmature"].map((cls) => {
                  const raw = result.probabilities?.[cls];
                  if (typeof raw !== "number") return null;
                  const pct = Math.max(0, Math.min(100, Math.round(raw * 100)));
                  return (
                    <div className={`kaora-prob-row ${cls === result.maturity_class ? "is-predicted" : ""}`} key={cls}>
                      <span>{MATURITY_LABEL_ID[cls]}</span>
                      <div className="kaora-prob-bar" role="progressbar" aria-label={`Probabilitas ${MATURITY_LABEL_ID[cls]}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <strong>{pct}%</strong>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="result-verification">
              <strong>Verifikasi kakao</strong>
              <span>{typeof result.cocoa_probability === "number" ? `Probabilitas gambar mengandung kakao: ${Math.round(result.cocoa_probability * 100)}%` : "Objek kakao telah lolos verifikasi sebelum klasifikasi."}</span>
            </div>
            <dl className="result-metadata">
              {result.block_name && <div><dt>Blok</dt><dd>{result.block_name}</dd></div>}
              {result.created_at && <div><dt>Waktu deteksi</dt><dd>{result.created_at}</dd></div>}
              {result.detection_id && <div><dt>ID deteksi</dt><dd>{result.detection_id}</dd></div>}
            </dl>
            <div className="deteksi-actions result-actions">
              <PrimaryButton onClick={resetWorkflow}>Deteksi gambar lain</PrimaryButton>
              <SecondaryButton onClick={() => go("riwayat")}>Buka riwayat</SecondaryButton>
              {result.detection_id && <SecondaryButton onClick={() => { setSelectedDetectionId(result.detection_id); go("riwayat"); }}>Lihat detail hasil</SecondaryButton>}
            </div>
          </Card>
        </div>
      )}

      {stage === "idle" && (
        <div className="deteksi-layout">
          <Card className="deteksi-panel">
            <div className="deteksi-panel-header">
              <div className="deteksi-panel-title-wrap">
                <span className="deteksi-mini-icon">
                  <Icon n="cam" s={16} />
                </span>
                <div>
                  <h2>Input Gambar Kakao</h2>
                  <p>Pilih unggah foto atau aktifkan kamera perangkat.</p>
                </div>
              </div>
              <StatusBadge variant={detectionReady ? "ok" : "warn"}>
                {detectionReady ? "Inferensi Aktif" : "Checkpoint Belum Siap"}
              </StatusBadge>
            </div>

            <div className="deteksi-mode-tabs">
              <Tabs v={mode} items={["Unggah Foto", "Kamera Langsung"]} on={setMode} />
            </div>
            {isCalibrated && (
              <div className="deteksi-verified-notice" role="status">
                <StatusBadge variant="ok">Verifikasi berhasil</StatusBadge>
                <span>Gambar yang sama telah lolos verifikasi. Deteksi kematangan dapat dijalankan tanpa verifikasi ulang.</span>
              </div>
            )}

            {mode === "Kamera Langsung" ? (
              <>
                <GuideFrame
                  showGuide={Boolean(stream && !imageUrl)}
                  guideLabel="Panduan posisi buah kakao (bukan deteksi AI)"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Hasil tangkapan kamera"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : stream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div className="calib-camera-placeholder">
                      <Icon n="cam" s={30} />
                      <b>Kamera belum aktif</b>
                      <small>Aktifkan kamera perangkat untuk mengambil foto buah kakao.</small>
                    </div>
                  )}
                </GuideFrame>
                <canvas ref={canvasRef} hidden />
                {cameraError && (
                  <p className="sub" style={{ color: "var(--kaora-error)", marginTop: "0.5rem" }}>
                    {cameraError}
                  </p>
                )}
                <div className="deteksi-actions" style={{ marginTop: "1rem" }}>
                  {!stream && !imageUrl && (
                    <PrimaryButton onClick={startCamera}>
                      <Icon n="cam" />
                      Aktifkan Kamera
                    </PrimaryButton>
                  )}
                  {stream && !imageUrl && (
                    <>
                      <PrimaryButton onClick={captureFromCamera}>
                        <Icon n="scan" />
                        Ambil Foto
                      </PrimaryButton>
                      <SecondaryButton onClick={stopCamera}>Matikan Kamera</SecondaryButton>
                    </>
                  )}
                  {imageUrl && (
                    <>
                      <PrimaryButton onClick={runDetection}>
                        <Icon n="scan" />
                        {isCalibrated ? "Jalankan Deteksi Kematangan" : "Verifikasi & Analisis Foto"}
                      </PrimaryButton>
                      <SecondaryButton onClick={resetWorkflow}>Ambil Ulang</SecondaryButton>
                    </>
                  )}
                </div>
              </>
            ) : imageUrl ? (
              <>
                <GuideFrame showGuide={false}>
                  <img
                    src={imageUrl}
                    alt="Pratinjau foto kakao"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </GuideFrame>
                {isCalibrated && (
                  <div className="calib-status-row" style={{ marginTop: "0.75rem" }}>
                    <div><StatusBadge variant="ok">Terverifikasi</StatusBadge><span>Probabilitas gambar mengandung kakao</span></div>
                    <strong>{typeof verification.result?.cocoa_probability === "number" ? `${Math.round(verification.result.cocoa_probability * 100)}%` : "Terverifikasi"}</strong>
                    {typeof verification.result?.threshold === "number" && <small>Ambang {Math.round(verification.result.threshold * 100)}%</small>}
                  </div>
                )}
                <div className="deteksi-actions" style={{ marginTop: "1rem" }}>
                  <PrimaryButton onClick={runDetection}>
                    <Icon n="scan" />
                    {isCalibrated ? "Jalankan Deteksi Kematangan" : "Verifikasi & Analisis Foto"}
                  </PrimaryButton>
                  <SecondaryButton onClick={() => fileRef.current?.click()}>
                    <Icon n="up" />
                    Ganti Foto
                  </SecondaryButton>
                  <SecondaryButton onClick={resetWorkflow}>
                    <Icon n="x" />
                    Hapus
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <EmptyState
                title="Mulai dengan foto buah kakao"
                description="Pilih gambar JPG, PNG, atau WEBP (maks. 10 MB). Foto fokus, pencahayaan merata, dan buah terlihat utuh membantu pemeriksaan."
                action={
                  <div className="deteksi-empty-actions">
                    <PrimaryButton onClick={() => fileRef.current?.click()}><Icon n="up" />Pilih foto</PrimaryButton>
                    <SecondaryButton onClick={() => { setMode("Kamera Langsung"); startCamera(); }}><Icon n="cam" />Buka kamera</SecondaryButton>
                  </div>
                }
              />
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleFilePick}
            />
          </Card>

          <aside className="deteksi-guide">
            <div className="deteksi-guide-header">
              <span className="deteksi-mini-icon guide-icon">
                <Icon n="scan" s={16} />
              </span>
              <div>
                <h2>Panduan Deteksi</h2>
                <p>Alur pemrosesan backend KAORA.</p>
              </div>
            </div>



            <div className="deteksi-note" style={{ marginTop: "1rem" }}>
              <span className="deteksi-note-icon">
                <Icon n="warn" s={16} />
              </span>
              <div>
                <h3>Status Kesiapan Model</h3>
                <p>
                  {detectionReady
                    ? "MobileNetV3-Small (verifikator) dan ResNet18 (klasifikasi kematangan) aktif."
                    : apiOnline === false
                      ? "Backend FastAPI sedang offline. Pastikan server API berjalan sebelum menjalankan deteksi."
                      : "Checkpoint model verifikator atau ResNet18 belum siap di server."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DeteksiPage;
