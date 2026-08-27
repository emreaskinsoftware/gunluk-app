import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";

/**
 * Oturum durumunu tek bir yerden yönetir.
 *
 * Eski kodda her sayfa kendi `auth.onAuthStateChanged` çağrısını yapıyor ve
 * hiçbiri aboneliği kapatmıyordu. `sortOption` her değiştiğinde yeni bir
 * dinleyici ekleniyor, eskisi kalıyordu (bellek sızıntısı + tekrarlı yönlendirme).
 * Artık tek bir dinleyici var ve düzgün şekilde kapatılıyor.
 */

const AuthContext = createContext(null);

/** Hareketsizlik süresi: 30 dakika sonra oturum otomatik kapanır. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [idleLogout, setIdleLogout] = useState(false);

  const idleTimer = useRef(null);

  const clearIdleLogout = useCallback(() => setIdleLogout(false), []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("[gunluk] çıkış yapılamadı:", error);
    }
  }, []);

  /* ---- Oturum dinleyicisi (tek örnek, temizlenen) ---- */
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      (error) => {
        console.error("[gunluk] oturum dinlenemedi:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /* ---- Hareketsizlik denetimi ----
     Kişisel bir günlük açık bırakılmış bir bilgisayarda okunabilir.
     30 dakika işlem yapılmazsa oturum kapatılır. */
  useEffect(() => {
    if (!user) return undefined;

    const reset = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setIdleLogout(true);
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true })
    );

    return () => {
      window.clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      userId: user?.uid || null,
      loading,
      isAuthenticated: Boolean(user),
      emailVerified: Boolean(user?.emailVerified),
      idleLogout,
      clearIdleLogout,
      logout,
    }),
    [user, loading, idleLogout, clearIdleLogout, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth yalnızca <AuthProvider> içinde kullanılabilir.");
  }
  return context;
}
