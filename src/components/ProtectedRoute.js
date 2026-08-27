import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLoader from "./PageLoader";

/**
 * Oturum gerektiren sayfaları sarmalar.
 *
 * Eski App.js'te /home, /diary, /drafts ve /diary-view rotaları herkese açıktı.
 * Adresi bilen biri giriş yapmadan doğrudan sayfayı açabiliyordu. (Veri yine
 * Firestore kurallarıyla korunuyor olsa da arayüz bozuk şekilde yükleniyor ve
 * `auth.currentUser.uid` okuması hata veriyordu.)
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Oturum doğrulanıyor…" />;

  if (!isAuthenticated) {
    // Girişten sonra kullanıcıyı gitmek istediği sayfaya geri götürebilmek için
    // hedef adresi saklıyoruz.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/** Giriş yapmış kullanıcıyı giriş/kayıt sayfalarından ana sayfaya yollar. */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoader label="Yükleniyor…" />;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return children;
}
