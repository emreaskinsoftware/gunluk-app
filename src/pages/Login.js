import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiLogIn } from "react-icons/fi";

import { auth, applyPersistence } from "../firebase";
import AuthLayout from "../components/AuthLayout";
import useLoginThrottle from "../hooks/useLoginThrottle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { validateEmail } from "../utils/validation";
import { toFriendlyMessage } from "../utils/errors";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const throttle = useLoginThrottle();
  const { idleLogout, clearIdleLogout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  /* Hareketsizlik nedeniyle çıkış yapıldıysa kullanıcıya nedenini söyle.
     Aksi halde kullanıcı sebepsizce giriş ekranına atılmış gibi hisseder. */
  useEffect(() => {
    if (!idleLogout) return;
    toast.info("Güvenlik için uzun süre işlem yapılmayan oturum kapatıldı.");
    clearIdleLogout();
  }, [idleLogout, clearIdleLogout, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || throttle.isLocked) return;

    const emailError = validateEmail(email);
    const passwordError = password ? null : "Parola gerekli.";

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      // Oturum kalıcılığını GİRİŞTEN ÖNCE ayarla; aksi halde ilk oturum
      // yanlış depolama alanına yazılır.
      await applyPersistence(remember);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      throttle.reset();
      toast.success("Hoş geldin! Günlüklerin yükleniyor…");

      // Kullanıcı korumalı bir sayfaya gitmek isterken yönlendirildiyse
      // girişten sonra oraya geri götür.
      navigate(location.state?.from || "/home", { replace: true });
    } catch (error) {
      throttle.registerFailure();
      setPassword("");
      toast.error(toFriendlyMessage(error, "Giriş yapılamadı."));
    } finally {
      setBusy(false);
    }
  };

  const lockMinutes = Math.floor(throttle.secondsLeft / 60);
  const lockSeconds = String(throttle.secondsLeft % 60).padStart(2, "0");

  return (
    <AuthLayout
      title="Giriş yap"
      description="Günlüklerine ulaşmak için hesabına gir."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {throttle.isLocked && (
          <div className="auth-lock" role="alert">
            <FiShield size={20} aria-hidden="true" />
            <span>
              Çok fazla başarısız deneme. Yeniden denemek için{" "}
              <strong>
                {lockMinutes > 0 ? `${lockMinutes}:${lockSeconds}` : `${throttle.secondsLeft} sn`}
              </strong>{" "}
              bekleyin.
            </span>
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="login-email">
            E-posta
          </label>
          <div className="field-row">
            <FiMail className="field-icon" size={18} aria-hidden="true" />
            <input
              id="login-email"
              className="input input-with-icon"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              disabled={busy || throttle.isLocked}
              required
            />
          </div>
          {errors.email && (
            <span className="field-error" id="login-email-error">
              {errors.email}
            </span>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Parola
          </label>
          <div className="field-row">
            <FiLock className="field-icon" size={18} aria-hidden="true" />
            <input
              id="login-password"
              className="input input-with-icon"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              disabled={busy || throttle.isLocked}
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
          {errors.password && (
            <span className="field-error" id="login-password-error">
              {errors.password}
            </span>
          )}
        </div>

        <div className="auth-options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span className="checkbox-box" aria-hidden="true">
              ✓
            </span>
            <span>Beni hatırla</span>
          </label>

          <Link to="/reset-password">Parolamı unuttum</Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || throttle.isLocked}
        >
          {busy ? (
            <>
              <span className="spinner" style={{ width: 17, height: 17 }} />
              Giriş yapılıyor…
            </>
          ) : (
            <>
              <FiLogIn size={18} aria-hidden="true" />
              Giriş yap
            </>
          )}
        </button>

        {!throttle.isLocked && throttle.failedCount > 0 && throttle.remainingAttempts <= 2 && (
          <p style={{ fontSize: "0.82rem", color: "var(--text-subtle)", textAlign: "center" }}>
            {throttle.remainingAttempts} deneme hakkınız kaldı.
          </p>
        )}
      </form>

      <p className="auth-footer">
        Hesabın yok mu? <Link to="/register">Ücretsiz kayıt ol</Link>
      </p>
    </AuthLayout>
  );
}
