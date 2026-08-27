import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { FiMail, FiSend, FiCheck } from "react-icons/fi";

import { auth } from "../firebase";
import AuthLayout from "../components/AuthLayout";
import { useToast } from "../context/ToastContext";
import { validateEmail } from "../utils/validation";

export default function ResetPassword() {
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (sendError) {
      // Hata olsa bile kullanıcıya AYNI mesajı gösteriyoruz.
      //
      // "Bu e-posta kayıtlı değil" demek, saldırganın hangi adreslerin
      // sistemde olduğunu tek tek denemesine izin verir (hesap numaralandırma).
      // Gerçek hatayı sadece geliştirici konsolunda tutuyoruz.
      if (sendError?.code !== "auth/user-not-found") {
        console.warn("[gunluk] sıfırlama e-postası:", sendError?.code);
      }
    } finally {
      setBusy(false);
      setSent(true);
      toast.success("İşlem tamamlandı. E-posta kutunu kontrol et.");
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Kontrol et" description="Sıfırlama talebin işlendi.">
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <FiCheck size={26} />
          </span>
          <h3>E-postanı kontrol et</h3>
          <p>
            <strong>{email}</strong> adresi sistemde kayıtlıysa, parola sıfırlama
            bağlantısı gönderildi. Bağlantı kısa süre içinde geçerliliğini yitirir.
          </p>
          <Link to="/" className="btn btn-primary btn-block">
            Giriş sayfasına dön
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Parolamı unuttum"
      description="Kayıtlı e-posta adresine sıfırlama bağlantısı gönderelim."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="reset-email">
            E-posta
          </label>
          <div className="field-row">
            <FiMail className="field-icon" size={18} aria-hidden="true" />
            <input
              id="reset-email"
              className="input input-with-icon"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              disabled={busy}
              required
            />
          </div>
          {error && <span className="field-error">{error}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" style={{ width: 17, height: 17 }} />
              Gönderiliyor…
            </>
          ) : (
            <>
              <FiSend size={18} aria-hidden="true" />
              Sıfırlama bağlantısı gönder
            </>
          )}
        </button>
      </form>

      <p className="auth-footer">
        Parolanı hatırladın mı? <Link to="/">Giriş yap</Link>
      </p>
    </AuthLayout>
  );
}
