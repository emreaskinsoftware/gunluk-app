import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiLock, FiSettings } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";
import { useVault } from "../context/VaultContext";

/**
 * Üst künye — bir derginin başlık bloğu gibi: iki kural arasında ad, tarih
 * ve eylemler. Yapışkan değil; sayfayla birlikte kayar ve okumayı bölmez.
 */
export default function Masthead({
  title = "Günlük",
  eyebrow,
  backTo,
  children,
  showLock = true,
  showSettings = true,
}) {
  const navigate = useNavigate();
  const { lock } = useVault();

  return (
    <header className="masthead">
      <div className="masthead-title">
        {backTo !== undefined && (
          <button
            type="button"
            className="btn btn-quiet btn-icon"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="Geri"
            title="Geri"
          >
            <FiArrowLeft size={17} aria-hidden="true" />
          </button>
        )}

        <h1>
          <Link to="/" style={{ color: "inherit", backgroundImage: "none" }}>
            {title}
          </Link>
        </h1>

        {eyebrow && <span className="label">{eyebrow}</span>}
      </div>

      <div className="masthead-actions">
        {children}

        {showSettings && (
          <button
            type="button"
            className="theme-btn"
            onClick={() => navigate("/ayarlar")}
            title="Ayarlar"
            aria-label="Ayarlar"
          >
            <FiSettings size={17} aria-hidden="true" />
          </button>
        )}

        <ThemeToggle />

        {showLock && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => lock(false)}
            title="Kasayı kilitle"
          >
            <FiLock size={16} aria-hidden="true" />
            <span className="btn-text">Kilitle</span>
          </button>
        )}
      </div>
    </header>
  );
}
