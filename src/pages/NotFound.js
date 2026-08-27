import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** 404 — bilinmeyen adresler için. Eski sürümde bu rota hiç yoktu. */
export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="shell page-enter">
      <div className="card empty-state" style={{ marginTop: "10vh" }}>
        <span className="empty-icon" aria-hidden="true">
          🧭
        </span>
        <h3>Sayfa bulunamadı</h3>
        <p>
          Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
        </p>
        <Link to={isAuthenticated ? "/home" : "/"} className="btn btn-primary">
          {isAuthenticated ? "Günlüklerime dön" : "Giriş sayfasına dön"}
        </Link>
      </div>
    </div>
  );
}
