import React from "react";
import { FiLock, FiAlertTriangle } from "react-icons/fi";
import "../styles/Vault.css";

/**
 * Şifreleme kullanılamadığında gösterilir.
 *
 * İki farklı neden var ve ikisi çok farklı şeyler söylüyor:
 *
 *   1. Sayfa güvensiz bir bağlantıyla (http://) açılmış.
 *      Tarayıcı, Web Crypto'yu yalnızca güvenli bağlamlarda verir; bu yüzden
 *      crypto.subtle tanımsız olur. Sorun tarayıcıda değil, adreste.
 *
 *   2. Tarayıcı gerçekten eski ya da bir eklenti API'leri kapatmış.
 *
 * Eskiden ikisine de "tarayıcın desteklemiyor" deniyordu; https:// ile
 * açması yeterli olan kullanıcı boşuna tarayıcı değiştirmeye çalışıyordu.
 */
export default function Unsupported() {
  const insecure = typeof window !== "undefined" && !window.isSecureContext;

  const httpsUrl =
    typeof window !== "undefined"
      ? `https://${window.location.host}${window.location.pathname}${window.location.search}`
      : "#";

  return (
    <div className="vault-page">
      <main className="vault-sheet">
        <header className="vault-head">
          <h1>Günlük</h1>
          <span className="label">
            {insecure ? "Güvenli bağlantı gerekli" : "Tarayıcı desteklemiyor"}
          </span>
        </header>

        {insecure ? (
          <>
            <div className="note note-warning">
              <FiLock size={16} aria-hidden="true" />
              <span>
                Bu sayfa <strong>http://</strong> ile açıldı. Tarayıcılar
                şifreleme işlevlerini yalnızca güvenli bağlantılarda çalıştırır,
                bu yüzden kasa açılamıyor.
              </span>
            </div>

            <a href={httpsUrl} className="btn btn-primary btn-lg btn-block" style={{ marginTop: "var(--s4)" }}>
              <FiLock size={15} aria-hidden="true" />
              Güvenli bağlantıyla aç
            </a>

            <div className="vault-foot">
              <p>
                Bu adresi sık kullanıyorsan yer imini <strong>https://</strong>
                ile güncelle. Günlüklerin etkilenmedi — cihazında duruyor.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="note note-danger">
              <FiAlertTriangle size={16} aria-hidden="true" />
              <span>
                Bu uygulama, günlükleri cihazında şifrelemek için tarayıcının{" "}
                <strong>Web Crypto</strong> ve <strong>IndexedDB</strong>{" "}
                özelliklerini kullanıyor. Bu tarayıcıda ikisinden biri
                kullanılamıyor.
              </span>
            </div>

            <div className="vault-foot">
              <p>Denenebilecekler:</p>
              <p>
                Güncel bir tarayıcı kullan (Chrome, Firefox, Safari, Edge) ·
                Gizli sekmeden çık · Site verisini engelleyen eklentileri bu
                site için kapat
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
