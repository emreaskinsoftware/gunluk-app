import React from "react";
import { FiLock, FiFeather, FiCalendar } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";
import "../styles/Auth.css";

const FEATURES = [
  {
    icon: FiLock,
    title: "Yalnızca sana ait",
    text: "Her kayıt hesabına kilitli. Kimse başkasının günlüğünü göremez.",
  },
  {
    icon: FiFeather,
    title: "Zengin metin editörü",
    text: "Başlık, renk, liste, alıntı — düşüncelerini istediğin gibi biçimlendir.",
  },
  {
    icon: FiCalendar,
    title: "Takvim ve puanlama",
    text: "Günlerini yıldızla, aylık ruh halini tek bakışta gör.",
  },
];

/** Giriş, kayıt ve parola sıfırlama sayfalarının ortak çerçevesi. */
export default function AuthLayout({ title, description, children }) {
  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <section className="auth-hero">
        <div className="auth-logo">
          <span className="auth-logo-mark" aria-hidden="true">
            📔
          </span>
          <span className="auth-logo-text">Günlüğüm</span>
        </div>

        <h2>
          Bugünü <span className="grad-text">yaz</span>,
          <br />
          yarın hatırla.
        </h2>

        <p className="auth-hero-sub">
          Düşüncelerini, anılarını ve günlerine verdiğin puanları tek bir güvenli
          yerde topla. Reklam yok, takip yok — sadece sen ve günlüğün.
        </p>

        <ul className="auth-features">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li key={feature.title} style={{ "--i": index }}>
                <span className="auth-feature-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{feature.title}</strong>
                  {feature.text}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <main className="auth-card">
        <div className="auth-card-head">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
