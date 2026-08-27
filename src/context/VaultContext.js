import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isCryptoAvailable } from "../lib/crypto";
import * as vault from "../services/vault";

/**
 * Kasa durumu — uygulamanın tek oturum kaynağı.
 *
 * Şifre çözme anahtarı YALNIZCA bellekte (bu bileşenin state'inde) tutulur.
 * localStorage'a, sessionStorage'a veya diske hiç yazılmaz. Sayfa yenilendiğinde
 * anahtar kaybolur ve kilit ekranı gelir — 1Password veya Bitwarden'ın web
 * kasasıyla aynı davranış. Bunun bedeli her açılışta parola girmek, karşılığı
 * ise cihazı eline geçiren birinin günlükleri okuyamaması.
 */

const VaultContext = createContext(null);

/** Hareketsizlik süresi: bu kadar süre işlem yapılmazsa kasa kendini kilitler. */
const IDLE_LOCK_MS = 10 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel"];

export const VAULT_STATUS = {
  CHECKING: "checking",
  UNSUPPORTED: "unsupported",
  EMPTY: "empty",
  LOCKED: "locked",
  UNLOCKED: "unlocked",
};

export function VaultProvider({ children }) {
  const [status, setStatus] = useState(VAULT_STATUS.CHECKING);
  const [key, setKey] = useState(null);
  const [lockedByIdle, setLockedByIdle] = useState(false);

  const idleTimer = useRef(null);

  /* ---- Açılışta: kasa var mı? ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isCryptoAvailable()) {
        if (!cancelled) setStatus(VAULT_STATUS.UNSUPPORTED);
        return;
      }

      try {
        const exists = await vault.hasVault();
        if (!cancelled) {
          setStatus(exists ? VAULT_STATUS.LOCKED : VAULT_STATUS.EMPTY);
        }
      } catch (error) {
        console.error("[gunluk] kasa okunamadı:", error);
        if (!cancelled) setStatus(VAULT_STATUS.UNSUPPORTED);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const lock = useCallback((byIdle = false) => {
    setKey(null);
    setLockedByIdle(byIdle);
    setStatus((current) =>
      current === VAULT_STATUS.UNLOCKED ? VAULT_STATUS.LOCKED : current
    );
  }, []);

  /* ---- Hareketsizlik kilidi ---- */
  useEffect(() => {
    if (status !== VAULT_STATUS.UNLOCKED) return undefined;

    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => lock(true), IDLE_LOCK_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true })
    );

    return () => {
      window.clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [status, lock]);

  /* ---- İşlemler ---- */

  const setup = useCallback(async (passphrase) => {
    const nextKey = await vault.createVault(passphrase);
    setKey(nextKey);
    setLockedByIdle(false);
    setStatus(VAULT_STATUS.UNLOCKED);
    return nextKey;
  }, []);

  const unlock = useCallback(async (passphrase) => {
    const nextKey = await vault.unlockVault(passphrase);
    setKey(nextKey);
    setLockedByIdle(false);
    setStatus(VAULT_STATUS.UNLOCKED);
    return nextKey;
  }, []);

  const changePassphrase = useCallback(
    async (newPassphrase) => {
      if (!key) throw new Error("Kasa kilitli.");
      const nextKey = await vault.changePassphrase(key, newPassphrase);
      setKey(nextKey);
      return nextKey;
    },
    [key]
  );

  const restore = useCallback(async (backup, passphrase, mode) => {
    const result = await vault.importBackup(backup, passphrase, mode);
    const nextKey = await vault.unlockVault(passphrase);
    setKey(nextKey);
    setLockedByIdle(false);
    setStatus(VAULT_STATUS.UNLOCKED);
    return result;
  }, []);

  const destroy = useCallback(async () => {
    await vault.destroyVault();
    setKey(null);
    setLockedByIdle(false);
    setStatus(VAULT_STATUS.EMPTY);
  }, []);

  const clearIdleFlag = useCallback(() => setLockedByIdle(false), []);

  const value = useMemo(
    () => ({
      status,
      key,
      isUnlocked: status === VAULT_STATUS.UNLOCKED && Boolean(key),
      hasVault: status === VAULT_STATUS.LOCKED || status === VAULT_STATUS.UNLOCKED,
      lockedByIdle,
      clearIdleFlag,
      setup,
      unlock,
      lock,
      changePassphrase,
      restore,
      destroy,
    }),
    [status, key, lockedByIdle, clearIdleFlag, setup, unlock, lock, changePassphrase, restore, destroy]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault yalnızca <VaultProvider> içinde kullanılabilir.");
  }
  return context;
}
