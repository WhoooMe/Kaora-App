import React from "react";
import { Icon } from "../ui.jsx";
import { KaoraLogo } from "./ui/KaoraComponents.jsx";
import { MAIN_NAVIGATION } from "./navigation.js";
import facebookIcon from "../assets/facebook.png";
import instagramIcon from "../assets/instagram.png";
import linkedinIcon from "../assets/linkedin.png";
import twitterIcon from "../assets/twitter.png";

const FOOTER_SOCIALS = [
  {
    name: "Facebook",
    src: facebookIcon,
    href: "https://www.facebook.com/",
  },
  {
    name: "Instagram",
    src: instagramIcon,
    href: "https://www.instagram.com/",
  },
  {
    name: "LinkedIn",
    src: linkedinIcon,
    href: "https://www.linkedin.com/",
  },
  {
    name: "X",
    src: twitterIcon,
    href: "https://x.com/",
  },
];

const AppFooter = ({ go }) => (
  <footer className="site-footer">
    <div className="footer-shell">
      <div className="footer-brand-block">
        <div className="footer-brand">
          <span className="footer-brand-mark">
            <KaoraLogo symbolOnly size={34} />
          </span>
          <div>
            <h3>KAORA</h3>
            <small>Agriculture Intelligence</small>
          </div>
        </div>

        <p>
          Solusi teknologi untuk mendukung petani kakao dalam meningkatkan
          produktivitas dan kualitas hasil panen.
        </p>

        <div className="footer-socials">
          {FOOTER_SOCIALS.map(({ name, src, href }) => {
            const sizeClass =
              name === "Instagram" ? " footer-social-link--instagram" : "";

            return (
              <a
                className={`footer-social-link${sizeClass}`}
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Kunjungi ${name}`}
              >
                <img
                  className="footer-social-icon"
                  src={src}
                  alt=""
                  width="28"
                  height="28"
                />
              </a>
            );
          })}
        </div>
      </div>

      <div className="footer-links-wrap">
        <div className="footer-links">
          <h4>Navigasi</h4>
          <ul>
            {MAIN_NAVIGATION.map(([page, label]) => (
              <li key={page}>
                <button
                  className="footer-nav-link"
                  type="button"
                  onClick={() => go?.(page)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links">
          <h4>Bantuan</h4>
          <ul>
            <li>Panduan: belum tersedia</li>
            <li>Bantuan: belum tersedia</li>
            <li>Kebijakan privasi: belum tersedia</li>
            <li>Syarat penggunaan: belum tersedia</li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Kontak</h4>
          <ul>
            <li>Informasi kontak resmi belum tersedia.</li>
          </ul>
        </div>
      </div>

      <div className="footer-cta">
        <div className="footer-cta-badge">
          <span className="footer-leaf-badge">
            <Icon n="leaf" s={18} />
          </span>
        </div>
        <h4>Mulai analisis kematangan kakao</h4>
        <p>
          Verifikasi gambar kakao dan tinjau hasil klasifikasi yang tersimpan.
        </p>
        <button
          className="btn footer-btn"
          type="button"
          onClick={() => go?.("deteksi")}
        >
          Mulai Deteksi Kakao
          <Icon n="chev" s={15} />
        </button>
      </div>
    </div>
  </footer>
);

export default AppFooter;
