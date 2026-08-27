import React from "react";
import { missingEnvKeys } from "../firebase";

/**
 * `.env` dosyası yoksa gösterilir.
 *
 * Eskiden bu durumda uygulama sessizce beyaz ekran veriyordu; kullanıcı
 * "çalışmıyor" diyor ama nedeni tarayıcı konsolunun derinliklerinde kalıyordu.
 * Artık ne yapılması gerektiği ekranda yazıyor.
 */
export default function ConfigError() {
  return (
    <div className="shell">
      <div className="card" style={{ padding: "2.5rem", marginTop: "8vh" }}>
        <span style={{ fontSize: "2.5rem" }} aria-hidden="true">
          ⚙️
        </span>

        <h2 style={{ margin: "1rem 0 0.5rem" }}>Kurulum tamamlanmamış</h2>

        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Firebase bağlantı bilgileri bulunamadı. Uygulamanın çalışabilmesi için
          proje kökünde bir <code>.env</code> dosyası olmalı.
        </p>

        <ol
          style={{
            color: "var(--text-muted)",
            lineHeight: 2,
            paddingLeft: "1.2rem",
            marginBottom: "1.5rem",
          }}
        >
          <li>
            <code>.env.example</code> dosyasını <code>.env</code> adıyla kopyalayın
          </li>
          <li>
            Firebase Console &gt; Proje Ayarları&apos;ndaki değerleri doldurun
          </li>
          <li>
            Geliştirme sunucusunu durdurup <code>npm start</code> ile yeniden
            başlatın
          </li>
        </ol>

        {missingEnvKeys.length > 0 && (
          <>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Eksik değişkenler:
            </p>
            <pre
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "1rem",
                overflowX: "auto",
                fontSize: "0.82rem",
                color: "var(--danger-500)",
              }}
            >
              {missingEnvKeys.join("\n")}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
