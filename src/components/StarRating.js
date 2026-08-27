import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

/**
 * Yıldız puanlama bileşeni.
 *
 * `react-rating-stars-component` paketinin yerini alır. O paket React 18'i
 * peer bağımlılık olarak desteklemiyordu ve `npm install` sırasında ERESOLVE
 * hatası veriyordu. Bu bileşen sıfır bağımlılıkla aynı işi yapar; üstüne
 * klavye erişilebilirliği ve seçim animasyonu ekler.
 */
export default function StarRating({
  value = 0,
  onChange,
  size = 34,
  readOnly = false,
  label = "Bugünü puanla",
}) {
  const [hover, setHover] = useState(0);
  const [justPicked, setJustPicked] = useState(0);

  const active = hover || value;

  const pick = (star) => {
    if (readOnly || !onChange) return;
    // Aynı yıldıza tekrar basmak puanı sıfırlar
    const next = star === value ? 0 : star;
    onChange(next);
    setJustPicked(star);
    window.setTimeout(() => setJustPicked(0), 420);
  };

  return (
    <div
      className={`stars${readOnly ? " stars-readonly" : ""}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} / 5 yıldız` : label}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={[
            "star-btn",
            star <= active ? "is-active" : "",
            justPicked === star ? "just-picked" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ transitionDelay: `${star * 18}ms` }}
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
          <FaStar size={size} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
