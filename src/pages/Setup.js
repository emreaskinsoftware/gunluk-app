import React, { useMemo, useRef, useState } from "react";
import { FiEye, FiEyeOff, FiUploadCloud, FiArrowRight } from "react-icons/fi";

import ThemeToggle from "../components/ThemeToggle";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { toFriendlyMessage } from "../utils/errors";
import { scorePassphrase, validatePassphrase } from "../utils/validation";
import "../styles/Vault.css";

/**
 * İlk kurulum: kasa parolası belirleme.
 *
 * Burada bir "hesap" açılmıyor — girilen parolayla bir şifreleme anahtarı
 * türetiliyor. Parola hiçbir yere gönderilmiyor, hiçbir yerde saklanmıyor.
 * Bu yüzden unutulursa kurtarma yolu da yok; kullanıcının bunu bilerek
 * onaylaması gerekiyor.
 */
export default function Setup() {
  const { setup, restore } = useVault();
  const toast = useToast();

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePass, setRestorePass] = useState("");

  const fileRef = useRef(null);

  const strength = useMemo(() => scorePassphrase(passphrase), [passphrase]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const next = {
      passphrase: validatePassphrase(passphrase),
      confirm: passphrase !== confirm ? "Parolalar eşleşmiyor." : null,
      acknowledged: acknowledged ? null : "Devam etmek için uyarıyı onaylayın.",
    };

    if (next.passphrase || next.confirm || next.acknowledged) {
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      await setup(passphrase);
      toast.success("Kasan hazır. İlk günlüğünü yazabilirsin.");
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Kasa oluşturulamadı."));
      setBusy(false);
    }
  };

  /* Yedekten geri yükleme — yeni cihaza taşınırken kullanılır */
  const pickRestoreFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setRestoreFile(file);
  };

  const handleRestore = async (event) => {
    event.preventDefault();
    if (busy || !restoreFile || !restorePass) return;

    setBusy(true);
    try {
      const backup = JSON.parse(await restoreFile.text());
      const result = await restore(backup, restorePass, "replace");
      toast.success(`${result.entries} günlük geri yüklendi.`);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Yedek geri yüklenemedi."));
      setBusy(false);
    }
  };

  return (
    <div className="vault-page">
      <div className="vault-corner">
        <ThemeToggle />
      </div>

      <main className="vault-sheet">
        <header className="vault-head">
          <h1>Günlük</h1>
          <span className="label">Bu cihazda · Şifreli · Sunucusuz</span>
          <p className="vault-lede">
            Bir parola belirle. Günlüklerin bu parolayla şifrelenip yalnızca
            bu cihazda saklanacak — hiçbir sunucuya gitmeyecek.
          </p>
        </header>

        <form className="vault-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="setup-pass">
              Kasa parolası
            </label>
            <div className="field-row">
              <input
                id="setup-pass"
                className="input input-mono input-with-action"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="kirmizi bisiklet pazar sabahi"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                aria-invalid={Boolean(errors.passphrase)}
                aria-describedby="setup-strength"
                disabled={busy}
                autoFocus
              />
              <button
                type="button"
                className="field-action"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Parolayı gizle" : "Parolayı göster"}
                tabIndex={-1}
              >
                {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>

            {passphrase ? (
              <div className={`strength strength-${strength.score}`} id="setup-strength">
                <div className="strength-track" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`strength-seg${index < strength.score ? " on" : ""}`}
                    />
                  ))}
                </div>
                <div className="strength-read">
                  <strong>{strength.label}</strong>
                  {strength.hints.length > 0 && (
                    <span>{strength.hints.slice(0, 2).join(" · ")}</span>
                  )}
                </div>
              </div>
            ) : (
              <span className="field-hint">
                Birkaç kelimeden oluşan bir cümle, kısa ve karmaşık bir paroladan
                daha güçlüdür.
              </span>
            )}

            {errors.passphrase && <span className="field-error">{errors.passphrase}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="setup-confirm">
              Parola tekrar
            </label>
            <input
              id="setup-confirm"
              className="input input-mono"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Aynısını bir kez daha yaz"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={Boolean(errors.confirm)}
              disabled={busy}
            />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>

          <div className="vault-warning">
            <h4>Bu parolanın yedeği yok</h4>
            <p>
              Parolayı unutursan günlüklerine kimse — biz de dahil — erişemez.
              Şifreleme anahtarı yalnızca senin parolandan üretiliyor ve hiçbir
              yerde saklanmıyor. Parolayı güvenli bir yere not et.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={busy}
              />
              <span className="checkbox-box" aria-hidden="true">
                ✓
              </span>
              <span>Anladım, parolamı kaybedersem verilerim kurtarılamaz.</span>
            </label>
            {errors.acknowledged && (
              <span className="field-error" style={{ marginTop: "var(--s2)" }}>
                {errors.acknowledged}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                Anahtar üretiliyor…
              </>
            ) : (
              <>
                Kasayı oluştur
                <FiArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="vault-alt">
          <span>veya</span>
        </div>

        <form
          className="vault-restore"
          style={{ marginTop: "var(--s4)" }}
          onSubmit={handleRestore}
        >
          <button
            type="button"
            className="btn btn-block"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <FiUploadCloud size={16} aria-hidden="true" />
            {restoreFile ? restoreFile.name : "Yedek dosyasından geri yükle"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={pickRestoreFile}
          />

          {restoreFile ? (
            <>
              <input
                className="input input-mono"
                type="password"
                autoComplete="off"
                placeholder="Yedeğin parolası"
                value={restorePass}
                onChange={(event) => setRestorePass(event.target.value)}
                disabled={busy}
                aria-label="Yedek parolası"
              />
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={busy || !restorePass}
              >
                {busy ? <span className="spinner" /> : null}
                Geri yükle
              </button>
            </>
          ) : (
            <span className="field-hint" style={{ textAlign: "center" }}>
              Başka bir cihazda aldığın <span className="num">.json</span> yedeğini buraya yükle.
            </span>
          )}
        </form>

        <footer className="vault-foot">
          <p>
            Şifreleme: <span className="num">AES-256-GCM</span> · Anahtar türetme:{" "}
            <span className="num">PBKDF2-SHA256, 600.000 tur</span>
          </p>
          <p>Hesap yok · İnternet gerekmiyor · Veri cihazdan çıkmıyor</p>
        </footer>
      </main>
    </div>
  );
}
