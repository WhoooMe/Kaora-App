import React from "react";
import { Icon } from "../../ui.jsx";

export const MATURITY_LABELS = Object.freeze({
  Immature: "Belum Matang",
  Mature: "Matang",
  Overmature: "Lewat Matang",
});

export function MaturityMark({ maturityClass, size = 28 }) {
  const label = MATURITY_LABELS[maturityClass];
  if (!label) return null;
  return (
    <span
      className="kaora-maturity-placeholder"
      style={{ width: size, height: size }}
      aria-label={`${label}; ikon resmi belum tersedia`}
      title="Placeholder sementara — aset ikon resmi KAORA belum tersedia"
    >
      <span aria-hidden="true">
        {maturityClass === "Immature"
          ? "I"
          : maturityClass === "Mature"
            ? "M"
            : "O"}
      </span>
    </span>
  );
}

export function KaoraLogo({ symbolOnly = false, size = 36, className = "" }) {
  return (
    <svg
      className={`kaora-logo ${className}`.trim()}
      width={symbolOnly ? size : size * 4}
      height={size}
      viewBox={symbolOnly ? "0 0 40 40" : "0 0 160 40"}
      role="img"
      aria-label={symbolOnly ? "Simbol KAORA" : "KAORA"}
    >
      <g transform="translate(2 2)">
        <path
          d="M18 35C8 31 5 23 8 14c2-5 6-9 11-12 5 4 9 9 10 15 1 8-3 15-11 18Z"
          fill="#6B4534"
        />
        <path
          d="M18 34c-1-8-1-15 5-22M15 22c-3-2-5-3-8-3"
          fill="none"
          stroke="#F5F0E6"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path d="M17 7C13 2 7 3 4 5c2 5 7 7 13 5" fill="#315B43" />
        <path
          d="M16 10C12 7 9 6 5 6"
          fill="none"
          stroke="#FCFAF5"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      {!symbolOnly && (
        <text
          x="47"
          y="27"
          fill="#203D31"
          fontFamily="inherit"
          fontSize="21"
          fontWeight="800"
          letterSpacing="1.4"
        >
          KAORA
        </text>
      )}
    </svg>
  );
}

export function CameraPreviewUnavailable() {
  return (
    <div
      className="kaora-camera-preview"
      role="img"
      aria-label="Preview kamera tidak tersedia; live feed belum terintegrasi"
    >
      <span>Preview kamera tidak tersedia</span>
      <small>Live feed belum terintegrasi</small>
    </div>
  );
}

export function DashboardHeroPlaceholder() {
  return (
    <div
      className="kaora-dashboard-hero-placeholder"
      role="img"
      aria-label="Aset visual kebun kakao belum tersedia"
    >
      <span className="kaora-hero-caption">
        Aset visual kebun kakao belum tersedia
      </span>
    </div>
  );
}

export function DashboardHeroMedia({
  src,
  type = "image",
  poster,
  alt = "Visual kebun kakao KAORA",
}) {
  const [failed, setFailed] = React.useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!src || failed) return <DashboardHeroPlaceholder />;
  if (type === "video" && !reducedMotion)
    return (
      <video
        className="kaora-dashboard-hero-media"
        autoPlay
        muted
        loop
        playsInline
        poster={poster}
        onError={() => setFailed(true)}
        aria-label={alt}
      >
        <source src={src} />
      </video>
    );
  if (type === "video")
    return poster ? (
      <img
        className="kaora-dashboard-hero-media"
        src={poster}
        alt={alt}
        onError={() => setFailed(true)}
      />
    ) : (
      <DashboardHeroPlaceholder />
    );
  return (
    <img
      className="kaora-dashboard-hero-media"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

const BADGE_VARIANTS = {
  ok: "kaora-status-badge--ok",
  warn: "kaora-status-badge--warn",
  error: "kaora-status-badge--error",
  gold: "kaora-status-badge--gold",
  neutral: "kaora-status-badge--neutral",
};

export function StatusBadge({ variant = "neutral", children, className = "" }) {
  const variantClass = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral;
  return (
    <span className={`kaora-status-badge ${variantClass} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`kaora-btn-primary ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`kaora-btn-secondary ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function StepIndicator({ steps = [], currentStep = 0 }) {
  return (
    <div className="kaora-step-indicator" role="list">
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div
            key={step.id || step.title}
            role="listitem"
            aria-current={isActive ? "step" : undefined}
            className={`kaora-step-item ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`.trim()}
          >
            <span className="kaora-step-num" aria-hidden="true">
              {step.icon ? (
                <Icon n={step.icon} s={16} />
              ) : isDone ? (
                "✓"
              ) : (
                index + 1
              )}
            </span>
            <div className="kaora-step-body">
              <div className="kaora-step-title-row">
                <strong>{step.title}</strong>
                {isDone && (
                  <span
                    className="kaora-step-done-badge"
                    aria-label="Selesai"
                    title="Selesai"
                  >
                    <Icon n="check" s={12} />
                  </span>
                )}
              </div>
              {step.description && <p className="sub">{step.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * GuideFrame is a visual guide for users to position a cocoa pod.
 * It is NOT an AI object detector; if future localization provides a real bbox,
 * it can be rendered optionally when bboxAvailable === true.
 */
export function GuideFrame({
  children,
  guideLabel = "Panduan posisi buah kakao (bukan deteksi AI)",
  showGuide = true,
  bbox = null,
  bboxAvailable = false,
  className = "",
}) {
  return (
    <div className={`kaora-guide-frame ${className}`.trim()}>
      {children}
      {showGuide && (
        <div className="kaora-guide-overlay" aria-hidden="true">
          <div className="kaora-guide-box">
            <span className="kaora-guide-label">{guideLabel}</span>
          </div>
        </div>
      )}
      {bboxAvailable && bbox && (
        <div
          className="kaora-guide-overlay"
          aria-label="Kotak lokalisasi objek kakao"
        >
          <div
            style={{
              position: "absolute",
              left: `${bbox.x * 100}%`,
              top: `${bbox.y * 100}%`,
              width: `${bbox.width * 100}%`,
              height: `${bbox.height * 100}%`,
              border: "2px solid var(--kaora-accent-gold)",
              borderRadius: "8px",
            }}
          />
        </div>
      )}
    </div>
  );
}

const VERIFICATION_TITLES = {
  idle: "Status verifikasi",
  pending: "Siap diverifikasi",
  checking: "Sedang memeriksa frame…",
  verified: "Objek kakao terverifikasi",
  rejected: "Objek belum memenuhi verifikasi",
  "not-ready": "Model verifikator belum siap",
  offline: "Backend tidak dapat dihubungi",
  error: "Verifikasi gagal diproses",
};

export function VerificationStatus({
  state = "idle",
  message = "",
  code = null,
}) {
  const iconName =
    state === "verified"
      ? "check"
      : state === "not-ready" ||
          state === "rejected" ||
          state === "error" ||
          state === "offline"
        ? "warn"
        : "scan";

  return (
    <div
      className={`kaora-verification-box kaora-verification-box--${state}`}
      role="status"
      aria-live="polite"
    >
      <Icon n={iconName} s={18} />
      <div>
        <strong>
          {VERIFICATION_TITLES[state] || VERIFICATION_TITLES.idle}
        </strong>
        {code && (
          <div style={{ marginTop: "0.2rem" }}>
            <StatusBadge variant="neutral">{code}</StatusBadge>
          </div>
        )}
        {message && <p style={{ marginTop: "0.25rem" }}>{message}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  title = "Belum ada data",
  description = "",
  action = null,
}) {
  return (
    <div className="kaora-state-card">
      <Icon n="scan" s={28} />
      <strong>{title}</strong>
      {description && <p className="sub">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kendala",
  description = "",
  code = null,
  onRetry = null,
  retryLabel = "Coba Lagi",
}) {
  return (
    <div className="kaora-state-card kaora-state-card--error" role="alert">
      <Icon n="warn" s={28} />
      <strong>{title}</strong>
      {code && <StatusBadge variant="error">{code}</StatusBadge>}
      {description && <p>{description}</p>}
      {onRetry && (
        <SecondaryButton onClick={onRetry}>{retryLabel}</SecondaryButton>
      )}
    </div>
  );
}
