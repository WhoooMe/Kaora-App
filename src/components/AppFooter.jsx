import React from "react";
import { Icon } from "../ui.jsx";

const AppFooter = () => (
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
            <li>Beranda</li>
            <li>Dashboard</li>
            <li>Deteksi Kakao</li>
            <li>Analisis Panen</li>
            <li>Live Monitor</li>
            <li>Kelola Kebun</li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Bantuan</h4>
          <ul>
            <li>Pusat Bantuan</li>
            <li>Panduan Penggunaan</li>
            <li>FAQ</li>
            <li>Kontak Kami</li>
            <li>Kebijakan Privasi</li>
            <li>Syarat &amp; Ketentuan</li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Kontak</h4>
          <ul>
            <li>Jl. Pertanian No. 123, Bogor, Jawa Barat 16152</li>
            <li>support@kaora.app</li>
            <li>+62 812 3456 7890</li>
            <li>Senin - Jumat, 08:00 - 17:00 WIB</li>
          </ul>
        </div>
      </div>

      <div className="footer-cta">
        <div className="footer-cta-badge">
          <span className="footer-leaf-badge">
            <Icon n="leaf" s={18} />
          </span>
        </div>
        <h4>Siap untuk hasil panen yang lebih baik?</h4>
        <p>Mulai gunakan Kaora App sekarang dan rasakan manfaatnya.</p>
        <button className="btn footer-btn" type="button">
          Mulai Sekarang
          <Icon n="chev" s={15} />
        </button>
      </div>
    </div>
  </footer>
);

export default AppFooter;
