import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Icon } from "../ui.jsx";
import {
  ErrorState,
  GuideFrame,
  MATURITY_LABELS,
  MaturityMark,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  StepIndicator,
  VerificationStatus,
} from "../components/ui/KaoraComponents.jsx";
import { BLOK } from "../data.js";
import { detectFrame, getModelsStatus, verifyCalibrationFrame } from "../api/kaoraApi.js";
import { useWorkflow } from "../context/WorkflowContext.jsx";

const BLOCK_OPTIONS = [...Object.keys(BLOK).map((k) => `Blok ${k}`), "Umum"].map((option) => ({
  value: option,
  label: option,
}));

function AppSelect({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="app-select"
      ref={dropdownRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="app-select-trigger"
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selectedOption?.label ?? value}`}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedOption?.label ?? value}
        <Icon n="chev" s={16} />
      </button>
      <div
        className={`menu manage-menu app-select-menu${open ? " is-open" : ""}`}
        role="listbox"
        aria-label={label}
        aria-hidden={!open}
      >
        {options.map((option) => (
          <button
            className={`app-select-option${value === option.value ? " is-selected" : ""}`}
            key={option.value}
            type="button"
            role="option"
            aria-selected={value === option.value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const WORKFLOW_STEPS = [
  {
    id: "capture",
    icon: "cam",
    title: "Ambil Gambar",
    description: "Aktifkan kamera perangkat atau unggah foto buah kakao (JPG, PNG, WEBP).",
  },
  {
    id: "verify",
    icon: "shieldCheck",
    title: "Verifikasi Sampel",
    description: "MobileNetV3-Small memeriksa kelayakan frame dan memastikan objek adalah buah kakao.",
  },
  {
    id: "analyze",
    icon: "focus",
    title: "Analisis Kematangan",
    description: "ResNet18 mengklasifikasikan kematangan: Belum matang, Matang, atau Lewat matang.",
  },
  {
    id: "result",
    icon: "badgeCheck",
    title: "Hasil Deteksi",
    description: "Tinjau hasil klasifikasi dan simpan otomatis ke riwayat deteksi.",
  },
];

const MATURITY_GUIDANCE = {
  Immature: "Buah masih dalam fase pertumbuhan. Tunda pemanenan agar kualitas biji optimal.",
  Mature: "Buah kakao siap dipanen dengan tingkat kematangan optimal.",
  Overmature: "Buah melewati masa panen optimal. Segera periksa kondisi biji.",
};

const formatPercent = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
};

const formatTimestamp = (value) => {
  if (!value) return "Baru saja";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCameraErrorMessage = (error) => {
  if (!window.isSecureContext) {
    return "Kamera memerlukan konteks aman (HTTPS atau localhost). Silakan gunakan Unggah Foto untuk menguji gambar.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Browser tidak mendukung akses kamera langsung. Gunakan Unggah Foto sebagai alternatif.";
  }
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
    return "Izin kamera ditolak oleh pengguna. Berikan izin kamera di browser atau gunakan Unggah Foto.";
  }
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "Tidak ada perangkat kamera yang ditemukan. Gunakan Unggah Foto untuk melanjutkan.";
  }
  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain atau gunakan Unggah Foto.";
  }
  return error?.message || "Kamera gagal diakses. Gunakan Unggah Foto sebagai alternatif.";
};

const mapVerificationToUiState = (response) => {
  if (!response) return "idle";
  if (response.verified === true && response.cocoa_detected === true) return "verified";
  if (response.status === "cocoa_verifier_not_ready" || response.status === "model_not_ready") return "not-ready";
  return "rejected";
};

const QUALITY_CHECK_LABELS = [
  { key: "sharpness_ok", label: "Fokus" },
  { key: "brightness_ok", label: "Pencahayaan" },
  { key: "resolution_ok", label: "Resolusi" },
];

export default function DeteksiPage({ go, toast }) {
  const {
    imageFile,
    imagePreviewUrl,
    imageSource,
    verification,
    setVerification,
    setFrame,
    clearWorkflow,
    lastDetection,
    markDetectionSuccess,
    selectedDetectionId,
  } = useWorkflow();

  const [mode, setMode] = useState(imageSource === "camera_capture" ? "camera" : "upload");
  const [blockName, setBlockName] = useState("Umum");
  const [stage, setStage] = useState(lastDetection ? "result" : "input");
  const [result, setResult] = useState(lastDetection || null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Memproses gambar...");
  const [modelStatus, setModelStatus] = useState(null);
  const [modelStatusLoading, setModelStatusLoading] = useState(true);
  const [modelStatusError, setModelStatusError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  const uploadInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const objectUrlRef = useRef("");

  const activePreviewUrl = localPreviewUrl || imagePreviewUrl || result?.image_url || "";

  const revokeLocalPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
    setLocalPreviewUrl("");
  }, []);

  const refreshModelStatus = useCallback(async () => {
    setModelStatusLoading(true);
    setModelStatusError("");
    try {
      const status = await getModelsStatus();
      setModelStatus(status);
    } catch (error) {
      setModelStatus(null);
      setModelStatusError(error.message || "Backend FastAPI belum dapat dihubungi.");
    } finally {
      setModelStatusLoading(false);
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((item) => item.kind === "videoinput");
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(videoInputs[0].deviceId);
      }
    } catch {
      // Abaikan jika browser membatasi enumerasi sebelum izin kamera diberikan.
    }
  }, [selectedDevice]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    refreshModelStatus();
    refreshDevices();
    return () => {
      stopCamera();
      revokeLocalPreview();
    };
  }, [refreshModelStatus, refreshDevices, stopCamera, revokeLocalPreview]);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  const startCamera = useCallback(
    async (deviceId = selectedDevice) => {
      if (cameraInitializing) return;
      setMode("camera");
      setCameraError("");
      setErrorMessage("");
      stopCamera();

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(getCameraErrorMessage());
        return;
      }

      setCameraInitializing(true);
      try {
        const videoConstraint = deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        await refreshDevices();
      } catch (error) {
        setCameraError(getCameraErrorMessage(error));
      } finally {
        setCameraInitializing(false);
      }
    },
    [cameraInitializing, refreshDevices, selectedDevice, stopCamera],
  );

  const handleUpload = (file) => {
    if (!file) return;
    stopCamera();
    revokeLocalPreview();
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setLocalPreviewUrl(previewUrl);
    setFrame(file, "uploaded_image");
    setMode("upload");
    setStage("input");
    setResult(null);
    setErrorMessage("");
    setCameraError("");
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Frame kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal menangkap frame kamera.");
          return;
        }
        const file = new File([blob], `kaora-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        revokeLocalPreview();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setLocalPreviewUrl(url);
        setFrame(file, "camera_capture");
        stopCamera();
        setStage("input");
        setResult(null);
        setErrorMessage("");
        setCameraError("");
        toast?.("Frame berhasil diambil. Lanjutkan ke Verifikasi Sampel.");
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleRetake = () => {
    clearWorkflow();
    revokeLocalPreview();
    setStage("input");
    setResult(null);
    setErrorMessage("");
    setCameraError("");
    if (mode === "camera") {
      startCamera(selectedDevice);
    }
  };

  const runVerification = async () => {
    if (!imageFile || isVerifying) return;
    setIsVerifying(true);
    setErrorMessage("");
    setVerification({
      state: "verifying",
      message: "Memeriksa kualitas frame dan memastikan objek adalah buah kakao...",
      token: null,
      result: null,
    });

    try {
      const response = await verifyCalibrationFrame(imageFile, imageSource || "uploaded_image");
      const nextState = mapVerificationToUiState(response);
      setVerification({
        state: nextState,
        message: response.message || "Verifikasi selesai.",
        token: response.verification_token || null,
        result: response,
      });

      if (nextState === "verified") {
        toast?.("Sampel kakao terverifikasi. Siap untuk Analisis Kematangan.");
      } else if (nextState === "not-ready") {
        toast?.("Model verifikator belum siap pada backend.");
      } else {
        toast?.("Sampel belum lolos verifikasi kakao.");
      }
    } catch (error) {
      const uiState = error.code === "API_OFFLINE" ? "offline" : error.status === 503 ? "not-ready" : "error";
      setVerification({
        state: uiState,
        message: error.message || "Verifikasi sampel gagal diproses.",
        token: null,
        result: null,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const runMaturityAnalysis = async () => {
    if (!imageFile) {
      setErrorMessage("Pilih atau ambil gambar buah kakao terlebih dahulu.");
      return;
    }
    if (verification.state !== "verified" || !verification.token) {
      setErrorMessage("Verifikasi sampel kakao harus berhasil sebelum menjalankan analisis kematangan.");
      return;
    }

    setStage("loading");
    setErrorMessage("");
    setLoadingMessage("Menganalisis kematangan buah kakao dengan ResNet18...");

    try {
      const detection = await detectFrame(imageFile, {
        verificationToken: verification.token,
        blockName: blockName || null,
        source: imageSource || "uploaded_image",
      });
      setResult(detection);
      markDetectionSuccess(detection);
      setStage("result");
      toast?.(`Deteksi berhasil: ${MATURITY_LABELS[detection.maturity_class] || detection.maturity_class}`);
    } catch (error) {
      setStage("error");
      setErrorMessage(error.message || "Deteksi kematangan gagal diproses.");
    }
  };

  const resetForNew = () => {
    stopCamera();
    clearWorkflow();
    revokeLocalPreview();
    setResult(null);
    setErrorMessage("");
    setStage("input");
  };

  const isVerified = verification.state === "verified" && Boolean(verification.token);
  const verificationChecks = verification.result?.checks || null;
  const cocoaVerifierReady = Boolean(
    modelStatus?.cocoa_verifier ?? modelStatus?.verifier ?? modelStatus?.cocoa_verifier_ready,
  );
  const maturityClassifierReady = Boolean(
    modelStatus?.resnet18 ?? modelStatus?.maturity_classifier ?? modelStatus?.maturity_classifier_ready,
  );
  const localizerAvailable = Boolean(
    modelStatus?.localizer ?? modelStatus?.localization ?? modelStatus?.localizer_available,
  );

  const currentStep = useMemo(() => {
    if (stage === "result" && result) return 4;
    if (isVerified) return 2;
    if (imageFile) return 1;
    return 0;
  }, [stage, result, isVerified, imageFile]);

  const sortedProbabilities = useMemo(() => {
    if (!result?.probabilities) return [];
    return Object.entries(result.probabilities).sort((a, b) => b[1] - a[1]);
  }, [result]);

  return (
    <div className="deteksi-page">
      <div className="deteksi-header">
        <div>
          <span className="eyebrow">Alur Terpadu · MobileNetV3&#8209;Small &amp; ResNet18</span>
          <h1>Deteksi Kematangan Kakao</h1>
          <p className="sub">
            Ambil atau unggah gambar kakao, verifikasi kelayakan sampel dengan MobileNetV3&#8209;Small, lalu analisis
            kematangannya dengan ResNet18.
          </p>
        </div>

        <div className="deteksi-header-meta">
          <div className="deteksi-field">
            <span>Blok Kebun (Opsional)</span>
            <AppSelect
              value={blockName}
              options={BLOCK_OPTIONS}
              onChange={setBlockName}
              label="Blok Kebun (Opsional)"
            />
          </div>

          <div className="deteksi-service-pills">
            <span className="deteksi-status" data-ready={!modelStatusError}>
              API {modelStatusLoading ? "cek backend..." : modelStatusError ? "offline" : "terhubung"}
            </span>
            <span className="deteksi-status" data-ready={cocoaVerifierReady}>
              Verifikator {cocoaVerifierReady ? "siap" : "belum siap"}
            </span>
            <span className="deteksi-status" data-ready={maturityClassifierReady}>
              Classifier {maturityClassifierReady ? "siap" : "belum siap"}
            </span>
          </div>
        </div>
      </div>

      <div className="deteksi-workspace">
        <Card className="deteksi-panel calib-camera-card">
          {stage === "loading" && (
            <div className="deteksi-state-wrap">
              <div className="kaora-state-card" role="status" aria-live="polite">
                <div className="kaora-state-icon">
                  <Icon n="scan" s={22} />
                </div>
                <h3>Menganalisis kematangan kakao</h3>
                <p className="sub">{loadingMessage}</p>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="deteksi-state-wrap">
              <ErrorState
                title="Deteksi kematangan belum berhasil"
                message={errorMessage}
                onRetry={isVerified ? runMaturityAnalysis : undefined}
                retryLabel="Coba Analisis Lagi"
              />
              <div className="deteksi-error-recovery">
                <SecondaryButton onClick={() => setStage("input")}>
                  <Icon n="cam" s={15} />
                  Kembali ke Input & Verifikasi
                </SecondaryButton>
                <SecondaryButton onClick={resetForNew}>
                  <Icon n="up" s={15} />
                  Pilih atau Ambil Gambar Baru
                </SecondaryButton>
              </div>
            </div>
          )}

          {stage === "result" && result && (
            <div className="deteksi-result-view">
              <div className="result-visual-column">
                <GuideFrame
                  aspect="4/3"
                  title="Gambar sampel teranalisis"
                  subtitle="Frame yang telah diverifikasi dan diklasifikasikan"
                >
                  {activePreviewUrl ? (
                    <img className="calib-media" src={activePreviewUrl} alt="Hasil analisis kakao" />
                  ) : (
                    <div className="calib-empty">
                      <Icon n="cam" s={28} />
                      <p>Preview gambar tersimpan pada record backend.</p>
                    </div>
                  )}
                </GuideFrame>
              </div>

              <div className="result-summary-column">
                <div className="result-header-row">
                  <span className="eyebrow">HASIL RESNET18</span>
                  <div className="result-badges">
                    <StatusBadge
                      variant={
                        result.maturity_class === "Mature"
                          ? "success"
                          : result.maturity_class === "Overmature"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {MATURITY_LABELS[result.maturity_class] || result.maturity_class}
                    </StatusBadge>
                    <StatusBadge variant="success">Tersimpan</StatusBadge>
                  </div>
                </div>

                <div className="maturity-hero">
                  <MaturityMark maturityClass={result.maturity_class} size={52} />
                  <div>
                    <h2>{MATURITY_LABELS[result.maturity_class] || result.maturity_class}</h2>
                    <p className="sub">{MATURITY_GUIDANCE[result.maturity_class] || "Hasil klasifikasi ResNet18."}</p>
                  </div>
                </div>

                <div className="result-confidence-row">
                  <div>
                    <small>Confidence ResNet18</small>
                    <strong>{formatPercent(result.confidence)}</strong>
                  </div>
                  <div>
                    <small>Verifikasi Kakao (MobileNetV3)</small>
                    <strong>{formatPercent(result.cocoa_probability)}</strong>
                  </div>
                </div>

                {sortedProbabilities.length > 0 && (
                  <div className="probability-list">
                    <small className="section-label">Distribusi probabilitas kelas</small>
                    {sortedProbabilities.map(([klass, prob]) => (
                      <div className="probability-row" key={klass}>
                        <span>{MATURITY_LABELS[klass] || klass}</span>
                        <div className="prob-track">
                          <div className="prob-fill" style={{ width: `${Math.round((prob || 0) * 100)}%` }} />
                        </div>
                        <b>{formatPercent(prob)}</b>
                      </div>
                    ))}
                  </div>
                )}

                <div className="result-meta-grid">
                  <div>
                    <small>Blok Kebun</small>
                    <b>{result.block_name || blockName || "—"}</b>
                  </div>
                  <div>
                    <small>Waktu Deteksi</small>
                    <b>{formatTimestamp(result.created_at)}</b>
                  </div>
                  <div>
                    <small>ID Record</small>
                    <b>#{result.id || selectedDetectionId || "—"}</b>
                  </div>
                </div>

                <div className="result-actions">
                  <PrimaryButton onClick={resetForNew}>
                    <Icon n="cam" s={15} />
                    Deteksi Gambar Lain
                  </PrimaryButton>
                  <SecondaryButton onClick={() => go?.("riwayat")}>
                    <Icon n="hist" s={15} />
                    Buka Riwayat
                  </SecondaryButton>
                  <SecondaryButton onClick={() => go?.("detail")}>
                    <Icon n="scan" s={15} />
                    Lihat Detail Hasil
                  </SecondaryButton>
                </div>
              </div>
            </div>
          )}

          {stage === "input" && (
            <>
              <div className="deteksi-panel-head">
                <div>
                  <h2>Input & Verifikasi Sampel Kakao</h2>
                  <p className="sub">
                    Ambil frame kamera atau unggah gambar, lalu verifikasi sampel sebelum analisis kematangan.
                  </p>
                </div>
                <div
                  className="deteksi-mode-tabs"
                  data-active={mode}
                  role="tablist"
                  aria-label="Sumber gambar"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "upload"}
                    className={mode === "upload" ? "is-active" : ""}
                    onClick={() => {
                      stopCamera();
                      setMode("upload");
                    }}
                  >
                    <Icon n="up" s={15} />
                    Unggah Foto
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "camera"}
                    className={mode === "camera" ? "is-active" : ""}
                    onClick={() => setMode("camera")}
                  >
                    <Icon n="cam" s={15} />
                    Kamera Langsung
                  </button>
                </div>
              </div>

              <div
                className={`deteksi-device-slot${mode === "camera" && devices.length > 1 ? " is-visible" : ""}`}
                aria-hidden={mode !== "camera" || devices.length <= 1}
              >
                <div className="deteksi-device-slot-inner">
                  {mode === "camera" && devices.length > 1 && (
                    <div className="calib-device-select">
                      <span>Pilih Perangkat Kamera</span>
                      <AppSelect
                        value={selectedDevice}
                        options={devices.map((device, index) => ({
                          value: device.deviceId,
                          label: device.label || `Kamera ${index + 1}`,
                        }))}
                        label="Pilih Perangkat Kamera"
                        onChange={(deviceId) => {
                          setSelectedDevice(deviceId);
                          if (cameraActive) startCamera(deviceId);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <GuideFrame
                guideLabel="Panduan posisi buah kakao (bukan lokalisasi AI)"
                showGuide={cameraActive || Boolean(activePreviewUrl)}
              >
                {cameraActive && <span className="calib-live-dot">LIVE · Kamera aktif</span>}
                {cameraInitializing && <span className="calib-live-dot is-initializing">Menginisialisasi kamera…</span>}
                {cameraActive ? (
                  <video ref={videoRef} className="calib-media" playsInline muted autoPlay />
                ) : activePreviewUrl ? (
                  <img className="calib-media" src={activePreviewUrl} alt="Preview sampel buah kakao" />
                ) : (
                  <div className="calib-empty" key={mode}>
                    <span className="calib-empty-icon" aria-hidden="true">
                      <Icon n={mode === "camera" ? "cam" : "up"} s={26} />
                    </span>
                    <strong>
                      {cameraInitializing
                        ? "Menghubungkan ke kamera perangkat…"
                        : mode === "camera"
                          ? "Kamera belum aktif"
                          : "Belum ada gambar dipilih"}
                    </strong>
                    <p>
                      {cameraInitializing
                        ? "Mohon tunggu sebentar dan izinkan akses kamera pada browser jika diminta."
                        : mode === "camera"
                          ? "Tekan Aktifkan Kamera untuk membuka pratinjau langsung, atau beralih ke Unggah Foto."
                          : "Tekan Pilih Gambar untuk mengunggah foto buah kakao (JPG, PNG, WEBP), atau beralih ke Kamera Langsung."}
                    </p>
                    <span className="calib-empty-disclaimer">
                      Panduan posisi buah kakao (bukan lokalisasi AI)
                    </span>
                  </div>
                )}
              </GuideFrame>

              <canvas ref={canvasRef} style={{ display: "none" }} />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />

              {cameraError && (
                <div className="calib-inline-alert" role="alert">
                  <Icon n="warn" s={16} />
                  <span>{cameraError}</span>
                </div>
              )}

              {errorMessage && (
                <div className="calib-inline-alert" role="alert">
                  <Icon n="warn" s={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="calib-camera-controls" key={mode}>
                {cameraActive ? (
                  <>
                    <PrimaryButton onClick={captureFrame}>
                      <Icon n="cam" s={15} />
                      Ambil Frame
                    </PrimaryButton>
                    <SecondaryButton onClick={stopCamera}>
                      <Icon n="x" s={15} />
                      Matikan Kamera
                    </SecondaryButton>
                  </>
                ) : activePreviewUrl && imageFile ? (
                  <>
                    {isVerified ? (
                      <PrimaryButton onClick={runMaturityAnalysis}>
                        <Icon n="focus" s={15} />
                        Analisis Kematangan
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={runVerification} disabled={isVerifying}>
                        <Icon n="shieldCheck" s={15} />
                        {isVerifying ? "Memverifikasi..." : "Verifikasi Sampel"}
                      </PrimaryButton>
                    )}
                    <SecondaryButton onClick={handleRetake} disabled={isVerifying}>
                      <Icon n="cam" s={15} />
                      Ambil Ulang
                    </SecondaryButton>
                    <SecondaryButton onClick={() => uploadInputRef.current?.click()} disabled={isVerifying}>
                      <Icon n="up" s={15} />
                      Pilih Gambar
                    </SecondaryButton>
                  </>
                ) : (
                  <>
                    {mode === "camera" ? (
                      <PrimaryButton onClick={() => startCamera(selectedDevice)} disabled={cameraInitializing}>
                        <Icon n="cam" s={15} />
                        {cameraInitializing ? "Mengaktifkan..." : "Aktifkan Kamera"}
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={() => uploadInputRef.current?.click()}>
                        <Icon n="up" s={15} />
                        Pilih Gambar
                      </PrimaryButton>
                    )}
                    <SecondaryButton
                      disabled={cameraInitializing}
                      onClick={() => {
                        if (mode === "camera") {
                          uploadInputRef.current?.click();
                        } else {
                          startCamera(selectedDevice);
                        }
                      }}
                    >
                      <Icon n={mode === "camera" ? "up" : "cam"} s={15} />
                      {mode === "camera" ? "Pilih Gambar" : "Aktifkan Kamera"}
                    </SecondaryButton>
                  </>
                )}
              </div>

              <VerificationStatus
                state={verification.state}
                message={
                  verification.message ||
                  "Unggah atau ambil gambar kakao, lalu tekan Verifikasi Sampel untuk memeriksa kelayakan gambar."
                }
              />

              {verificationChecks && (
                <div className="calib-quality-summary">
                  <div className="calib-quality-pills">
                    {QUALITY_CHECK_LABELS.map(({ key, label }) => {
                      const passed = Boolean(verificationChecks[key]);
                      return (
                        <span key={key} className={`calib-quality-pill ${passed ? "is-pass" : "is-fail"}`}>
                          <Icon n={passed ? "check" : "warn"} s={13} />
                          {label}: {passed ? "Baik" : "Perlu Perbaikan"}
                        </span>
                      );
                    })}
                  </div>
                  <p className="sub">
                    Detail frame: {verificationChecks.width || "—"}×{verificationChecks.height || "—"} px ·
                    Ketajaman {typeof verificationChecks.sharpness_score === "number" ? verificationChecks.sharpness_score.toFixed(1) : "—"} ·
                    Kecerahan {typeof verificationChecks.brightness_score === "number" ? verificationChecks.brightness_score.toFixed(1) : "—"}
                  </p>
                </div>
              )}

              {typeof verification.result?.cocoa_probability === "number" && (
                <div className="calib-verifier-summary">
                  <div>
                    <small>Skor Verifikasi Kakao (MobileNetV3-Small)</small>
                    <strong>{formatPercent(verification.result.cocoa_probability)}</strong>
                  </div>
                  <div>
                    <small>Ambang Batas Minimal</small>
                    <strong>{formatPercent(verification.result.cocoa_threshold ?? 0.6)}</strong>
                  </div>
                  <StatusBadge variant={verification.result.cocoa_detected ? "success" : "danger"}>
                    {verification.result.cocoa_detected ? "Objek Kakao Terkonfirmasi" : "Bukan Objek Kakao"}
                  </StatusBadge>
                </div>
              )}
            </>
          )}
        </Card>

        <div className="calib-side-column">
          <Card className="calib-guide-card">
            <div className="calib-side-heading">
              <span className="deteksi-mini-icon guide-icon">
                <Icon n="scan" s={16} />
              </span>
              <div>
                <h2>Alur Deteksi Kakao</h2>
                <p>Ikuti tahapan untuk memverifikasi dan menganalisis kematangan kakao.</p>
              </div>
            </div>
            <StepIndicator steps={WORKFLOW_STEPS} currentStep={currentStep} />
          </Card>

          <Card className="calib-status-card">
            <div className="calib-side-heading">
              <span className="deteksi-mini-icon status-icon">
                <Icon n="shieldCheck" s={16} />
              </span>
              <div>
                <h2>Status Layanan AI</h2>
                <p>Kesiapan model langsung dari backend FastAPI.</p>
              </div>
            </div>

            {modelStatusError ? (
              <div className="calib-status-alert" role="alert">
                <p>{modelStatusError}</p>
                <SecondaryButton onClick={refreshModelStatus}>Periksa Ulang</SecondaryButton>
              </div>
            ) : (
              <div className="calib-status-list">
                <div>
                  <span>API Backend</span>
                  <StatusBadge variant={modelStatusLoading ? "neutral" : "success"}>
                    {modelStatusLoading ? "Memeriksa..." : "Siap"}
                  </StatusBadge>
                </div>
                <div>
                  <span>Cocoa Verifier (MobileNetV3-Small)</span>
                  <StatusBadge variant={cocoaVerifierReady ? "success" : "warning"}>
                    {cocoaVerifierReady ? "Siap" : "Belum siap"}
                  </StatusBadge>
                </div>
                <div>
                  <span>Maturity Classifier (ResNet18)</span>
                  <StatusBadge variant={maturityClassifierReady ? "success" : "warning"}>
                    {maturityClassifierReady ? "Siap" : "Belum siap"}
                  </StatusBadge>
                </div>
                <div>
                  <span>Lokalisasi Objek</span>
                  <StatusBadge variant={localizerAvailable ? "success" : "neutral"}>
                    {localizerAvailable ? "Tersedia" : "Belum tersedia"}
                  </StatusBadge>
                </div>
              </div>
            )}

            <p className="calib-note">
              Bingkai panduan pada preview kamera/gambar adalah panduan framing visual untuk membantu pengguna, bukan
              deteksi bounding-box AI.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
