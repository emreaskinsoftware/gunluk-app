import { useCallback, useEffect, useState } from "react";

/**
 * Kilit açma denemelerini sınırlar.
 *
 * PBKDF2'nin 600.000 turu her denemeyi zaten ~0,3 saniyeye çıkarır; bu tek
 * başına kaba kuvveti çok yavaşlatır. Bu kanca üstüne bir de bekleme süresi
 * ekler: 5 yanlış denemeden sonra kilit süresi katlanarak artar.
 *
 * Sayaç localStorage'da tutulur — kararlı bir saldırgan temizleyebilir, ama
 * asıl koruma zaten anahtar türetmenin yavaşlığıdır. Bu katman, cihazı eline
 * geçiren birinin elle parola denemesini pratik olmaktan çıkarır.
 */

const STORAGE_KEY = "gunluk:unlock-attempts";
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 20 * 1000;
const MAX_LOCK_MS = 30 * 60 * 1000;

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, until: 0 };
    const parsed = JSON.parse(raw);
    return { count: Number(parsed.count) || 0, until: Number(parsed.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

function writeState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* depolama kapalıysa yoksay */
  }
}

export default function useUnlockThrottle() {
  const [state, setState] = useState(readState);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((state.until - Date.now()) / 1000)));

    tick();
    if (state.until <= Date.now()) return undefined;

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.until]);

  const registerFailure = useCallback(() => {
    setState((current) => {
      const count = current.count + 1;
      const until =
        count >= FREE_ATTEMPTS
          ? Date.now() + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** (count - FREE_ATTEMPTS))
          : 0;

      const next = { count, until };
      writeState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { count: 0, until: 0 };
    writeState(next);
    setState(next);
  }, []);

  return {
    isLocked: secondsLeft > 0,
    secondsLeft,
    failedCount: state.count,
    remainingAttempts: Math.max(0, FREE_ATTEMPTS - state.count),
    registerFailure,
    reset,
  };
}
