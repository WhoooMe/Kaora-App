import React from "react";
import { Icon } from "../ui.jsx";

const AppFooter = ({ go }) => (
  <footer className="site-footer">
    <div className="footer-shell">
      <div className="footer-brand-block">
        <div className="footer-brand">
          <span className="footer-brand-mark">
            <Icon n="leaf" s={18} />
          </span>
          <div>
            <h3>Kaora App</h3>
            <small>Agriculture Intelligence</small>
          </div>
        </div>

        <p>
          Solusi teknologi untuk mendukung petani kakao dalam meningkatkan
          produktivitas dan kualitas hasil panen.
        </p>

        <div className="footer-socials">
          <span>f</span>
          <span>◌</span>
          <span>in</span>
          <span>x</span>
        </div>
      </div>

      <div className="footer-links-wrap">
        <div className="footer-links">
          <h4>Navigasi</h4>
          <ul>
            <li>Dashboard</li>
            <li>Deteksi Kakao</li>
            <li>Kalibrasi</li>
            <li>Analisis Deteksi</li>
            <li>Monitor Perangkat</li>
            <li>Kebun dan Blok</li>
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
        <p>Verifikasi gambar kakao dan tinjau hasil klasifikasi yang tersimpan.</p>
        <button className="btn footer-btn" type="button" onClick={() => go?.("kalibrasi")}>
          Mulai Kalibrasi
          <Icon n="chev" s={15} />
        </button>
      </div>
    </div>
  </footer>
);

export default AppFooter;
