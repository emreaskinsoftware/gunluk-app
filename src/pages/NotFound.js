import React from "react";
import { Link } from "react-router-dom";

/** 404 sayfası. */
export default function NotFound() {
  return (
    <div className="sheet sheet-narrow page">
      <div className="empty" style={{ marginTop: "16vh" }}>
        <span className="label">404</span>
        <h3>Böyle bir sayfa yok</h3>
        <p>Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <Link to="/" className="btn btn-primary">
          Günlüğe dön
        </Link>
      </div>
    </div>
  );
}
