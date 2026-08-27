import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiUserPlus,
  FiCheck,
} from "react-icons/fi";

import { auth, applyPersistence } from "../firebase";
import AuthLayout from "../components/AuthLayout";
import { useToast } from "../context/ToastContext";
import { validateEmail, validatePassword, scorePassword } from "../utils/validation";
import { toFriendlyMessage } from "../utils/errors";

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: password !== confirm ? "Parolalar eşleşmiyor." : null,
    };

    if (nextErrors.email || nextErrors.password || nextErrors.confirm) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      // Kayıt sonrası oturumu tarayıcıda tutma: kullanıcı e-postasını
      // doğruladıktan sonra bilinçli olarak giriş yapsın.
      await applyPersistence(false);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // E-posta doğrulama bağlantısı gönder (hesap ele geçirmeye karşı katman)
      try {
        await sendEmailVerification(credential.user);
      } catch (verificationError) {
        console.warn("[gunluk] doğrulama e-postası gönderilemedi:", verificationError);
      }

      await signOut(auth);

      setDone(true);
      toast.success("Hesabın oluşturuldu! Doğrulama e-postasını kontrol et.");
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Kayıt tamamlanamadı."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Hesabın hazır" description="Son bir adım kaldı.">
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <FiCheck size={26} />
          </span>
          <h3>Doğrulama e-postası gönderildi</h3>
          <p>
            <strong>{email}</strong> adresine bir bağlantı yolladık. Bağlantıya
            tıkladıktan sonra giriş yapabilirsin. E-posta gelmediyse spam
            klasörünü kontrol et.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate("/", { replace: true })}
          >
            Giriş sayfasına dön
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Kayıt ol"
      description="Ücretsiz bir hesap oluştur, günlüğünü yazmaya başla."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="register-email">
            E-posta
          </label>
          <div className="field-row">
            <FiMail className="field-icon" size={18} aria-hidden="true" />
            <input
              id="register-email"
              className="input input-with-icon"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              disabled={busy}
              required
            />
          </div>
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-password">
            Parola
          </label>
          <div className="field-row">
            <FiLock className="field-icon" size={18} aria-hidden="true" />
            <input
              id="register-password"
              className="input input-with-icon"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="En az 8 karakter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-strength"
              disabled={busy}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          {password && (
            <div className={`strength strength-${strength.score}`} id="password-strength">
              <div className="strength-bars" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={`strength-bar${index < strength.score ? " on" : ""}`}
                  />
                ))}
              </div>
              <div className="strength-meta">
                <span className="strength-label">{strength.label}</span>
                {strength.hints.length > 0 && (
                  <span>Ekle: {strength.hints.slice(0, 2).join(", ")}</span>
                )}
              </div>
            </div>
          )}

          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-confirm">
            Parola tekrar
          </label>
          <div className="field-row">
            <FiLock className="field-icon" size={18} aria-hidden="true" />
            <input
              id="register-confirm"
              className="input input-with-icon"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Parolayı tekrar gir"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={Boolean(errors.confirm)}
              disabled={busy}
              required
            />
          </div>
          {errors.confirm && <span className="field-error">{errors.confirm}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" style={{ width: 17, height: 17 }} />
              Hesap oluşturuluyor…
            </>
          ) : (
            <>
              <FiUserPlus size={18} aria-hidden="true" />
              Hesap oluştur
            </>
          )}
        </button>
      </form>

      <p className="auth-footer">
        Zaten hesabın var mı? <Link to="/">Giriş yap</Link>
      </p>
    </AuthLayout>
  );
}
