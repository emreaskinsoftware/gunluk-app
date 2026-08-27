import React, { useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiShield, FiUnlock } from "react-icons/fi";

import ThemeToggle from "../components/ThemeToggle";
import useUnlockThrottle from "../hooks/useUnlockThrottle";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { toFriendlyMessage } from "../utils/errors";
import "../styles/Vault.css";

/**
 * Kilit ekranı.
 *
 * Sayfa her yenilendiğinde buraya düşülür; çünkü şifre çözme anahtarı
 * yalnızca bellekte tutulur ve sayfa kapandığında yok olur.
 */
export default function Unlock() {
  const { unlock, lockedByIdle, clearIdleFlag } = useVault();
  const toast = useToast();
  const throttle = useUnlockThrottle();

  const [passphrase, setPassphrase] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  /* Kasa hareketsizlik yüzünden kilitlendiyse nedenini söyle */
  useEffect(() => {
    if (!lockedByIdle) return;
    toast.info("Bir süre işlem yapılmadı, kasa kendini kilitledi.");
    clearIdleFlag();
  }, [lockedByIdle, clearIdleFlag, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || throttle.isLocked || !passphrase) return;

    setBusy(true);
    try {
      await unlock(passphrase);
      throttle.reset();
    } catch (error) {
      throttle.registerFailure();
      setPassphrase("");
      toast.error(toFriendlyMessage(error, "Kasa açılamadı."));
      setBusy(false);
    }
  };

  const minutes = Math.floor(throttle.secondsLeft / 60);
  const seconds = String(throttle.secondsLeft % 60).padStart(2, "0");

  return (
    <div className="vault-page">
      <div className="vault-corner">
        <ThemeToggle />
      </div>

      <main className="vault-sheet">
        <header className="vault-head">
          <h1>Günlük</h1>
          <span className="label">Kasa kilitli</span>
        </header>

        <form className="vault-form" onSubmit={handleSubmit} noValidate>
          {throttle.isLocked && (
            <div className="vault-lock" role="alert">
              <FiShield size={17} aria-hidden="true" />
              <span>
                Çok fazla yanlış deneme. Yeniden denemek için{" "}
                <span className="num">
                  {minutes > 0 ? `${minutes}:${seconds}` : `${throttle.secondsLeft} sn`}
                </span>{" "}
                bekleyin.
              </span>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="unlock-pass">
              Parola
            </label>
            <div className="field-row">
              <input
                id="unlock-pass"
                className="input input-mono input-with-action"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Kasa parolan"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                disabled={busy || throttle.isLocked}
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
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={busy || throttle.isLocked || !passphrase}
          >
            {busy ? (
              <>
                <span className="spinner" />
                Çözülüyor…
              </>
            ) : (
              <>
                <FiUnlock size={16} aria-hidden="true" />
                Kasayı aç
              </>
            )}
          </button>

          {!throttle.isLocked && throttle.remainingAttempts <= 2 && throttle.failedCount > 0 && (
            <p className="field-hint" style={{ textAlign: "center" }}>
              <span className="num">{throttle.remainingAttempts}</span> deneme hakkın kaldı.
            </p>
          )}
        </form>

        <footer className="vault-foot">
          <p>
            Parolan hiçbir yerde saklanmıyor; her açılışta anahtar yeniden
            türetiliyor. Bu yüzden birkaç yüz milisaniye sürer.
          </p>
          <p>
            Parolanı unuttuysan tek yol, elindeki yedek dosyasıdır. Yedeğin de
            yoksa veriler kurtarılamaz.
          </p>
        </footer>
      </main>
    </div>
  );
}
