import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { VaultProvider, useVault, VAULT_STATUS } from "./context/VaultContext";

import PaperGrain from "./components/PaperGrain";
import PageLoader from "./components/PageLoader";
import RequireVault, { peekPendingPath, clearPendingPath } from "./components/RequireVault";

/**
 * Sayfalar isteğe bağlı yüklenir. Kilit ekranını açan biri, zengin metin
 * editörünün (~200 KB) indirilmesini beklemek zorunda kalmaz.
 */
const Unlock = lazy(() => import("./pages/Unlock"));
const Setup = lazy(() => import("./pages/Setup"));
const Home = lazy(() => import("./pages/Home"));
const Write = lazy(() => import("./pages/Write"));
const Read = lazy(() => import("./pages/Read"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsupported = lazy(() => import("./pages/Unsupported"));

/**
 * Kök adres kasanın durumuna göre farklı ekran gösterir:
 *   kasa yok      -> kurulum
 *   kasa kilitli  -> kilit ekranı
 *   kasa açık     -> günlük listesi
 */
function Gate() {
  const { status } = useVault();

  // Kilit yüzünden yarıda kalan adres varsa oraya geri dön. Değeri render
  // sırasında okuyup efektte temizliyoruz (bkz. RequireVault > peekPendingPath).
  const pending = status === VAULT_STATUS.UNLOCKED ? peekPendingPath() : null;

  useEffect(() => {
    if (pending) clearPendingPath();
  }, [pending]);

  switch (status) {
    case VAULT_STATUS.CHECKING:
      return <PageLoader label="Kasa aranıyor" />;
    case VAULT_STATUS.UNSUPPORTED:
      return <Unsupported />;
    case VAULT_STATUS.EMPTY:
      return <Setup />;
    case VAULT_STATUS.UNLOCKED:
      // Bir günlüğü okurken sayfa yenilendiyse listeye değil, o günlüğe dön.
      return pending && pending !== "/" ? <Navigate to={pending} replace /> : <Home />;
    default:
      return <Unlock />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <VaultProvider>
          <PaperGrain />

          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Gate />} />

                <Route
                  path="/yaz"
                  element={
                    <RequireVault>
                      <Write />
                    </RequireVault>
                  }
                />
                <Route
                  path="/gunluk/:id"
                  element={
                    <RequireVault>
                      <Read />
                    </RequireVault>
                  }
                />
                <Route
                  path="/taslaklar"
                  element={
                    <RequireVault>
                      <Drafts />
                    </RequireVault>
                  }
                />
                <Route
                  path="/ayarlar"
                  element={
                    <RequireVault>
                      <Settings />
                    </RequireVault>
                  }
                />

                {/* Eski Firebase sürümünün adresleri */}
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/diary" element={<Navigate to="/yaz" replace />} />
                <Route path="/drafts" element={<Navigate to="/taslaklar" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="/reset-password" element={<Navigate to="/" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </VaultProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
