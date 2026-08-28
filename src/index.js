import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import reportWebVitals from "./reportWebVitals";

/**
 * Clickjacking koruması.
 *
 * Normalde bunu `X-Frame-Options: DENY` veya CSP'nin `frame-ancestors 'none'`
 * yönergesi yapar. Ancak ikisi de YALNIZCA HTTP başlığı olarak çalışır ve
 * GitHub Pages özel başlık eklemeye izin vermez. Bu yüzden aynı işi
 * JavaScript tarafında yapıyoruz.
 *
 * Kötü niyetli bir site uygulamayı görünmez bir çerçeveye alıp kullanıcıya
 * farkında olmadan "Kasayı sil" düğmesine bastırabilirdi. Uygulama bir
 * çerçeve içindeyse hiç açılmıyor.
 *
 * Saldırgan betikleri kapatılmış (sandbox) bir çerçeve kullanırsa bu kontrol
 * çalışmaz — ama o durumda uygulamanın kendisi de çalışmaz, dolayısıyla
 * tıklanacak bir arayüz oluşmaz.
 */
function isFramed() {
  try {
    return window.top !== window.self;
  } catch {
    // Erişim engellendiyse zaten farklı kaynaklı bir çerçeve içindeyiz
    return true;
  }
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("#root öğesi bulunamadı — public/index.html bozulmuş olabilir.");
}

if (isFramed()) {
  container.innerHTML = "";

  const warning = document.createElement("div");
  warning.style.cssText =
    "max-width:420px;margin:14vh auto;padding:2rem;font-family:Georgia,serif;text-align:center;color:#1a1613";
  warning.innerHTML =
    '<h1 style="font-size:1.3rem;font-weight:400;letter-spacing:.12em;text-transform:uppercase">Günlük</h1>' +
    '<hr style="width:40px;border:0;border-top:2px solid #1a1613;margin:1.5rem auto">' +
    '<p style="color:#5c554c;line-height:1.6">Güvenlik nedeniyle bu uygulama başka bir sayfanın içinde açılamaz.</p>';

  const link = document.createElement("a");
  link.href = window.location.href;
  link.target = "_top";
  link.rel = "noopener";
  link.textContent = "Günlüğü kendi sekmesinde aç";
  link.style.cssText = "color:#9c4221;font-family:system-ui,sans-serif;font-size:.9rem";

  warning.appendChild(link);
  container.appendChild(warning);
} else {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Performans ölçümü isteğe bağlıdır; hiçbir veri dışarı gönderilmez.
  reportWebVitals();
}
