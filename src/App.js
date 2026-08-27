import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

import AuroraBackground from "./components/AuroraBackground";
import ConfigError from "./components/ConfigError";
import PageLoader from "./components/PageLoader";
import ProtectedRoute, { PublicOnlyRoute } from "./components/ProtectedRoute";

import { isFirebaseConfigured } from "./firebase";

/**
 * Sayfalar isteğe bağlı yüklenir (code splitting).
 * Zengin metin editörü (Quill) yaklaşık 200 KB; giriş ekranını açan bir
 * kullanıcının bunu indirmesi için hiçbir sebep yok.
 */
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const DiaryEntry = lazy(() => import("./pages/DiaryEntry"));
const DiaryView = lazy(() => import("./pages/DiaryView"));
const Drafts = lazy(() => import("./pages/Draft"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  // .env eksikse Firebase'i hiç başlatmadan net bir kurulum ekranı göster.
  if (!isFirebaseConfigured) {
    return (
      <ThemeProvider>
        <AuroraBackground />
        <ConfigError />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuroraBackground />

          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* --- Herkese açık (giriş yapmışsa /home'a yönlendirilir) --- */}
                <Route
                  path="/"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/reset-password"
                  element={
                    <PublicOnlyRoute>
                      <ResetPassword />
                    </PublicOnlyRoute>
                  }
                />

                {/* --- Oturum gerektiren sayfalar --- */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diary"
                  element={
                    <ProtectedRoute>
                      <DiaryEntry />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diary-view/:id"
                  element={
                    <ProtectedRoute>
                      <DiaryView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/drafts"
                  element={
                    <ProtectedRoute>
                      <Drafts />
                    </ProtectedRoute>
                  }
                />

                {/* Eski bağlantı uyumluluğu */}
                <Route path="/diary-view" element={<Navigate to="/home" replace />} />

                {/* --- 404 --- */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
