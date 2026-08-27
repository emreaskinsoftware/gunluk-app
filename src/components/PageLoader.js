import React from "react";

/** Sayfa geçişleri ve veri beklenirken gösterilen gösterge. */
export default function PageLoader({ label = "Açılıyor" }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  );
}
