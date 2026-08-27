import React, { useState } from "react";

/**
 * Yıldız puanlama — sıfır bağımlılık.
 *
 * Yıldız simgesi doğrudan SVG olarak çizilir; bir simge paketine bağlı
 * kalmadan çizgi kalınlığı ve dolgu davranışı tam denetim altında olur.
 * Boş yıldız yalnızca konturdur, dolu yıldız mürekkeple dolar.
 */

function Star({ size, filled }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95z" />
    </svg>
  );
}

export default function StarRating({
  value = 0,
  onChange,
  size = 20,
  readOnly = false,
  label = "Günü puanla",
}) {
  const [hover, setHover] = useState(0);
  const [justSet, setJustSet] = useState(0);

  const shown = hover || value;

  const pick = (star) => {
    if (readOnly || !onChange) return;
    onChange(star === value ? 0 : star); // aynı yıldıza tekrar basmak sıfırlar
    setJustSet(star);
    window.setTimeout(() => setJustSet(0), 320);
  };

  return (
    <span
      className={`stars${readOnly ? " stars-static" : ""}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} / 5 yıldız` : label}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star${star <= shown ? " on" : ""}${justSet === star ? " set" : ""}`}
          disabled={readOnly}
          tabIndex={readOnly ? -1 : 0}
          role={readOnly ? undefined : "radio"}
          aria-checked={readOnly ? undefined : star === value}
          aria-label={`${star} yıldız`}
          onMouseEnter={() => !readOnly && setHover(star)}
          onFocus={() => !readOnly && setHover(star)}
          onBlur={() => setHover(0)}
          onClick={() => pick(star)}
        >
          <Star size={size} filled={star <= shown} />
        </button>
      ))}
    </span>
  );
}
