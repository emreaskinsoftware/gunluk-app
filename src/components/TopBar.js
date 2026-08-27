import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLogOut, FiArrowLeft } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

/**
 * Uygulamanın üst çubuğu — sayfa kaydırılırken yapışkan (sticky) kalır,
 * arkasını bulanıklaştıran cam efektiyle içeriğin üstünde durur.
 */
export default function TopBar({
  title = "Günlüğüm",
  subtitle,
  backTo,
  children,
  showLogout = true,
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="brand">
        {backTo !== undefined && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="Geri dön"
            title="Geri dön"
          >
            <FiArrowLeft size={20} aria-hidden="true" />
          </button>
        )}

        <Link
          to="/home"
          className="brand-mark"
          aria-label="Ana sayfaya git"
          title="Ana sayfa"
        >
          <span aria-hidden="true">📔</span>
        </Link>

        <div className="brand-text">
          <h1 className="grad-text">{title}</h1>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>

      <div className="topbar-actions">
        {children}
        <ThemeToggle />
        {showLogout && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleLogout}
            title="Oturumu kapat"
          >
            <FiLogOut size={18} aria-hidden="true" />
            <span className="logout-label">Çıkış</span>
          </button>
        )}
      </div>
    </header>
  );
}
