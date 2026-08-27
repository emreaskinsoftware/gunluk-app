import React from "react";
import "../styles/Vault.css";

/**
 * Tarayıcı Web Crypto veya IndexedDB desteklemiyorsa gösterilir.
 * (Genellikle çok eski tarayıcılar ya da bu API'leri kapatan gizlilik
 * eklentileri.)
 */
export default function Unsupported() {
  return (
    <div className="vault-page">
      <main className="vault-sheet">
        <header className="vault-head">
          <h1>Günlük</h1>
          <span className="label">Tarayıcı desteklemiyor</span>
        </header>

        <div className="note note-danger">
          <span>
            Bu uygulama, günlükleri cihazında şifrelemek için tarayıcının{" "}
            <strong>Web Crypto</strong> ve <strong>IndexedDB</strong> özelliklerini
            kullanıyor. Bu tarayıcıda ikisinden biri kullanılamıyor.
          </span>
        </div>

        <div className="vault-foot" style={{ borderTop: "none", marginTop: "var(--s4)" }}>
          <p>Denenebilecekler:</p>
          <p>
            Güncel bir tarayıcı kullan (Chrome, Firefox, Safari, Edge) · Gizli
            sekmeden çık · Site verisini engelleyen eklentileri bu site için kapat
          </p>
        </div>
      </main>
    </div>
  );
}
