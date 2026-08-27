import React from "react";

/** Sayfa geçişleri ve veri beklerken gösterilen yükleme göstergesi. */
export default function PageLoader({ label = "Yükleniyor…" }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="spinner spinner-lg" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
