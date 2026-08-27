import React from "react";

/**
 * Kağıt greni.
 *
 * Ekranı kaplayan, göze çarpmayan bir doku katmanı. Tek amacı yüzeylerin
 * "düz dijital beyaz" görünmemesi. Tamamen CSS (theme.css > .grain) ile
 * çizilir, resim indirmez ve etkileşimi engellemez.
 */
export default function PaperGrain() {
  return <div className="grain" aria-hidden="true" />;
}
