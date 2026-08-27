import React from "react";

/**
 * Arka planda yavaşça süzülen renk küreleri.
 *
 * Tamamen CSS ile çalışır (theme.css > .aurora) ve yalnızca `transform`
 * animasyonu kullanır; bu yüzden GPU'da işlenir, sayfayı yavaşlatmaz.
 * Kullanıcı "hareketi azalt" tercihini açtıysa CSS tarafında gizlenir.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="orb" />
    </div>
  );
}
