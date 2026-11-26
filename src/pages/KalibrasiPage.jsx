import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Icon } from "../ui.jsx";
import {
  GuideFrame,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  StepIndicator,
  VerificationStatus,
} from "../components/ui/KaoraComponents.jsx";
import { getModelsStatus, verifyCalibrationFrame } from "../api/kaoraApi.js";
import { useWorkflow } from "../context/WorkflowContext.jsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CALIBRATION_STEPS = [
  {
    id: "camera",
    title: "Aktifkan kamera atau pilih gambar",
    description: "Izinkan browser mengakses kamera perangkat atau unggah foto kakao.",
  },
  {
    id: "guide",
    title: "Atur posisi dengan panduan visual",
    description: "Kotak pada pratinjau hanya membantu pembingkaian; bukan lokalisasi AI.",
  },
  {
    id: "capture",
    title: "Ambil frame",
    description: "Pastikan buah terlihat utuh, fokus, dan mendapat pencahayaan cukup.",
  },
  {
    id: "verify",
    title: "Verifikasi objek",
    description: "Backend memverifikasi objek sebagai kakao sebelum analisis kematangan.",
  },
];

const KalibrasiPage = ({ go, toast }) => {
  const {
    imageFile: captureFile,
    imagePreviewUrl: captureUrl,
    imageSource: captureSource,
    verification,
    setVerification,
    setFrame,
    clearWorkflow,
  } = useWorkflow();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraState, setCameraState] = useState("off");
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [modelStatus, setModelStatus] = useState(null);
  const [apiState, setApiState] = useState("checking");
  const [busy, setBusy] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraState("off");
  }, []);

  const loadModelStatus = useCallback(async () => {
    setApiState("checking");
    try {
      const data = await getModelsStatus();
      setModelStatus(data);
      setApiState("online");
    } catch {
      setModelStatus(null);
      setApiState("offline");
    }
  }, []);

  useEffect(() => {
    loadModelStatus();
  }, [loadModelStatus]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {
      setCameraError(
        "Browser tidak dapat memutar pratinjau kamera. Muat ulang halaman atau periksa izin kamera.",
      );
      setCameraState("error");
    });
  }, [stream]);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const cameras = list.filter((device) => device.kind === "videoinput");
    setDevices(cameras);
    if (!selectedDevice && cameras[0]) setSelectedDevice(cameras[0].deviceId);
  };

  const startCamera = async (deviceId = "") => {
    setCameraError("");
    setCameraState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          window.isSecureContext
            ? "Browser ini tidak menyediakan akses kamera. Gunakan browser terbaru yang mendukung getUserMedia."
            : "Akses kamera diblokir karena halaman bukan secure context. Buka melalui HTTPS tepercaya atau localhost; alamat IP WSL dengan HTTP tidak didukung. Unggah gambar tetap tersedia.",
        );
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = nextStream;
      setStream(nextStream);
      setCameraState("on");
      await refreshDevices();
    } catch (error) {
      setCameraState("error");
      setCameraError(
        error?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan akses kamera melalui pengaturan browser."
          : error?.name === "NotFoundError"
            ? "Tidak ada kamera yang terdeteksi pada perangkat ini."
            : error?.message || "Kamera gagal diaktifkan.",
      );
    }
  };

  const replaceCapture = (file, source = "uploaded_image") => {
    setFrame(file, source);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("Pratinjau kamera belum siap. Tunggu hingga gambar muncul lalu coba lagi.");
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    const stage = video.parentElement;
    const stageWidth = stage?.clientWidth || width;
    const stageHeight = stage?.clientHeight || height;

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
    const context = canvas.getContext("2d");
    context.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Frame kamera gagal diproses. Silakan ambil ulang.");
          return;
        }
        replaceCapture(
          new File([blob], `kaora-calibration-${Date.now()}.jpg`, { type: "image/jpeg" }),
          "camera_guide_roi",
        );
      },
      "image/jpeg",
      0.92,
    );
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    clearWorkflow();
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setVerification({
        state: "error",
        message: "Pilih file JPG, PNG, atau WEBP.",
        code: "INVALID_IMAGE",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setVerification({
        state: "error",
        message: "Ukuran gambar maksimal 10 MB.",
        code: "INVALID_IMAGE",
      });
      return;
    }
    replaceCapture(file, "uploaded_image");
  };

  const verifyCapture = async () => {
    if (!captureFile) return;
    setBusy(true);
    setVerification({
      state: "checking",
      message: "Mengirim frame ke layanan verifikasi KAORA…",
      code: null,
      token: null,
      result: null,
    });
    try {
      const payload = await verifyCalibrationFrame(captureFile, captureSource);
      if (payload.verified === true && payload.cocoa_detected === true && payload.verification_token) {
        setVerification({
          state: "verified",
          message:
            payload.message ||
            "Objek kakao dikenali dan posisi frame memenuhi kriteria kalibrasi.",
          code: null,
          token: payload.verification_token || null,
          result: payload,
        });
        toast?.("Objek kakao terverifikasi. Lanjutkan ke Deteksi Kematangan.");
      } else {
        const rejectionCode = payload.rejection_code || "COCOA_NOT_DETECTED";
        setVerification({
          state: "rejected",
          message:
            payload.message ||
            "Objek kakao belum terverifikasi. Sesuaikan posisi buah dan ambil frame baru.",
          code: rejectionCode,
          token: null,
          result: payload,
        });
      }
    } catch (err) {
      if (err.code === "MODEL_NOT_READY") {
        setVerification({
          state: "not-ready",
          message:
            "Backend terhubung, tetapi checkpoint model verifikator belum dipasang. Kalibrasi belum dapat dinyatakan berhasil.",
          code: err.code,
          token: null,
          result: null,
        });
      } else if (err.code === "API_OFFLINE") {
        setVerification({
          state: "offline",
          message: err.message,
          code: err.code,
          token: null,
          result: null,
        });
      } else {
        setVerification({
          state: "error",
          message: err.message || "Frame belum dapat diverifikasi.",
          code: err.code || "INFERENCE_ERROR",
          token: null,
          result: null,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const clearCapture = () => {
    clearWorkflow();
  };

  const calibrationReady = Boolean(modelStatus?.ready_for_calibration);
  const currentStep =
    verification.state === "verified" ? 4 : captureUrl ? 3 : stream ? 2 : 0;

  return (
    <div className="calib-page">
      <header className="calib-page-head">
        <div>
          <div className="deteksi-breadcrumb">
            KAORA <span>/</span> Persiapan Analisis
          </div>
          <h1>Kalibrasi Kamera</h1>
          <p>
            Pastikan objek kakao terlihat jelas dan berada di dalam panduan posisi sebelum
            analisis kematangan dijalankan.
          </p>
        </div>
        <div className="calib-head-status">
          <StatusBadge variant={apiState === "online" ? "ok" : apiState === "offline" ? "error" : "neutral"}>
            {apiState === "online" ? "API terhubung" : apiState === "offline" ? "API offline" : "Memeriksa API"}
          </StatusBadge>
          <StatusBadge variant={calibrationReady ? "ok" : "warn"}>
            {calibrationReady ? "Verifikator siap" : "Verifikator belum siap"}
          </StatusBadge>
        </div>
      </header>
      <StepIndicator
        steps={[
          { id: "image", title: "Pilih gambar", description: "Unggah atau ambil foto" },
          { id: "verify", title: "Verifikasi", description: "Kualitas & objek kakao" },
          { id: "detect", title: "Deteksi", description: "Klasifikasi kematangan" },
        ]}
        currentStep={verification.state === "verified" ? 2 : captureFile ? 1 : 0}
      />

      <div className="calib-layout">
        <Card className="calib-camera-card">
          <div className="calib-card-head">
            <div className="calib-title-wrap">
              <span className="deteksi-mini-icon">
                <Icon n="scan" s={17} />
              </span>
              <div>
                <h2>Verifikasi kualitas & objek kakao</h2>
                <p>MobileNetV3-Small memeriksa kualitas gambar dan probabilitas objek kakao.</p>
              </div>
            </div>
            <StatusBadge variant={cameraState === "on" ? "ok" : cameraState === "error" ? "error" : "neutral"}>
              {cameraState === "on"
                ? "Kamera aktif"
                : cameraState === "loading"
                  ? "Menghubungkan"
                  : cameraState === "error"
                    ? "Perlu perhatian"
                    : "Kamera mati"}
            </StatusBadge>
          </div>

          <GuideFrame
            showGuide={Boolean(stream && !captureUrl)}
            guideLabel="Panduan posisi buah kakao (bukan lokalisasi AI)"
          >
            {captureUrl ? (
              <img
                className="calib-preview-image"
                src={captureUrl}
                alt="Frame yang akan diverifikasi"
              />
            ) : stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Pratinjau kamera langsung"
                />
                <span className="calib-live-indicator">
                  <i /> LIVE
                </span>
              </>
            ) : (
              <div className="calib-camera-placeholder calib-empty-state">
                <span><Icon n="scan" s={30} /></span>
                <b>Siapkan foto buah kakao</b>
                <small>Gunakan gambar tajam dengan pencahayaan merata. Tampilkan buah dengan jelas; panduan bingkai hanya membantu posisi.</small>
                <div className="calib-empty-actions">
                  <PrimaryButton onClick={() => fileRef.current?.click()}><Icon n="up" />Pilih gambar</PrimaryButton>
                  <SecondaryButton onClick={() => startCamera(selectedDevice)} disabled={cameraState === "loading"}><Icon n="cam" />{cameraState === "loading" ? "Menghubungkan…" : "Buka kamera"}</SecondaryButton>
                </div>
              </div>
            )}
          </GuideFrame>
          <canvas ref={canvasRef} className="calib-hidden-canvas" />

          {cameraError && (
            <div className="calib-alert error" role="alert">
              <Icon n="warn" s={16} />
              {cameraError}
            </div>
          )}

          <div className="calib-camera-controls">
            {devices.length > 1 && !captureUrl && (
              <label className="calib-device-select">
                <span>Pilih kamera</span>
                <select
                  value={selectedDevice}
                  onChange={(event) => {
                    setSelectedDevice(event.target.value);
                    startCamera(event.target.value);
                  }}
                >
                  {devices.map((device, index) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Kamera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!stream && !captureUrl && (
              <PrimaryButton
                onClick={() => startCamera(selectedDevice)}
                disabled={cameraState === "loading"}
              >
                <Icon n="cam" />
                {cameraState === "loading" ? "Menghubungkan…" : "Aktifkan Kamera"}
              </PrimaryButton>
            )}
            {stream && !captureUrl && (
              <>
                <PrimaryButton onClick={captureFrame}>
                  <Icon n="scan" />
                  Ambil Frame untuk Verifikasi
                </PrimaryButton>
                <SecondaryButton onClick={stopCamera}>Matikan Kamera</SecondaryButton>
              </>
            )}
            {captureUrl && (
              <>
                {verification.state === "verified" && verification.token ? (
                  <PrimaryButton onClick={() => go?.("deteksi")}>
                    <Icon n="scan" />
                    Lanjut ke Deteksi Kematangan
                  </PrimaryButton>
                ) : (
                  <PrimaryButton onClick={verifyCapture} disabled={busy}>
                    <Icon n="check" />
                    {busy ? "Memverifikasi…" : "Verifikasi Objek"}
                  </PrimaryButton>
                )}
                <SecondaryButton onClick={clearCapture}>Ambil Ulang</SecondaryButton>
              </>
            )}
            <SecondaryButton onClick={() => fileRef.current?.click()}>
              <Icon n="up" />
              Pilih Gambar
            </SecondaryButton>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={chooseImage}
            />
          </div>

          <VerificationStatus
            state={verification.state}
            message={verification.message}
            code={verification.code}
          />
          {verification.result?.quality && (
            <div className="calib-quality-summary">
              <div className="calib-quality-summary-head">
                <strong>Kualitas gambar</strong>
                <StatusBadge variant={verification.result.quality.passed ? "ok" : "error"}>
                  {verification.result.quality.passed ? "Memenuhi syarat" : "Perlu gambar baru"}
                </StatusBadge>
              </div>
              <div className="calib-quality-checks">
                {[["Fokus", "sharpness_ok"], ["Pencahayaan", "lighting_ok"], ["Resolusi", "resolution_ok"]].map(([label, key]) => (
                  <div className="calib-quality-check" key={key}>
                    <span aria-hidden="true">{verification.result.quality[key] ? "✓" : "!"}</span>
                    <span>{label}</span>
                    <strong>{verification.result.quality[key] ? "Baik" : "Perlu diperbaiki"}</strong>
                  </div>
                ))}
              </div>
              <details className="calib-quality-details">
                <summary>Lihat pengukuran teknis</summary>
                <dl>
                  {typeof verification.result.quality.sharpness_score === "number" && <div><dt>Skor ketajaman (heuristik)</dt><dd>{verification.result.quality.sharpness_score}</dd></div>}
                  {typeof verification.result.quality.brightness_mean === "number" && <div><dt>Rata-rata pencahayaan</dt><dd>{verification.result.quality.brightness_mean}</dd></div>}
                </dl>
              </details>
            </div>
          )}
          {verification.result && typeof verification.result.cocoa_probability === "number" && (
            <div className="calib-verifier-summary">
              <div><strong>Verifikasi kakao</strong><span>Probabilitas gambar mengandung kakao</span></div>
              <strong>{Math.round(verification.result.cocoa_probability * 100)}%</strong>
              {typeof verification.result.threshold === "number" && <small>Ambang verifikasi: {Math.round(verification.result.threshold * 100)}%</small>}
            </div>
          )}
        </Card>

        <aside className="calib-side-column">
          <Card className="calib-guide-card">
            <div className="calib-side-heading">
              <span className="deteksi-mini-icon guide-icon">
                <Icon n="scan" s={16} />
              </span>
              <div>
                <h2>Alur Kalibrasi</h2>
                <p>Siapkan frame yang layak dianalisis.</p>
              </div>
            </div>
            <StepIndicator steps={CALIBRATION_STEPS} currentStep={currentStep} />
          </Card>

          <Card className="calib-status-card">
            <div className="calib-side-heading">
              <div>
                <h2>Status Layanan AI</h2>
                <p>Kesiapan komponen backend saat ini.</p>
              </div>
            </div>
            <div className="calib-status-row">
              <span>API FastAPI</span>
              <StatusBadge variant={apiState === "online" ? "ok" : "error"}>
                {apiState === "online" ? "Terhubung" : apiState === "offline" ? "Offline" : "Memeriksa"}
              </StatusBadge>
            </div>
            <div className="calib-status-row">
              <span>Cocoa Verifier (MobileNetV3-Small)</span>
              <StatusBadge variant={modelStatus?.verifier ? "ok" : "warn"}>
                {modelStatus?.verifier ? "Siap" : "Belum dipasang"}
              </StatusBadge>
            </div>
            <div className="calib-status-row">
              <span>Maturity Classifier (ResNet18)</span>
              <StatusBadge variant={modelStatus?.maturity_classifier ? "ok" : "warn"}>
                {modelStatus?.maturity_classifier ? "Siap" : "Belum dipasang"}
              </StatusBadge>
            </div>
            <div className="calib-status-row">
              <span>Lokalisasi Objek</span>
              <StatusBadge variant={modelStatus?.localization ? "ok" : "neutral"}>
                {modelStatus?.localization ? "Siap" : "Belum tersedia"}
              </StatusBadge>
            </div>
            <div className="calib-note">
              <Icon n="warn" s={16} />
              <p>
                GuideFrame pada pratinjau adalah panduan posisi visual untuk pengguna, bukan
                detektor objek AI. Kalibrasi hanya dinyatakan berhasil setelah verifikator
                backend aktif dan mengembalikan hasil valid.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default KalibrasiPage;
