import { useCallback, useEffect, useState } from "react";

/**
 * İstemci tarafı deneme sınırlaması (kaba kuvvet saldırılarını yavaşlatır).
 *
 * Firebase'in kendi sunucu tarafı koruması vardır ama devreye girmesi için
 * onlarca deneme gerekir. Bu kanca ilk 5 başarısız denemeden sonra girişi
 * kademeli olarak kilitler:  30 sn -> 60 sn -> 120 sn ... (en fazla 15 dk)
 *
 * Not: Bu bir savunma KATMANIDIR, tek başına yeterli değildir — kararlı bir
 * saldırgan localStorage'ı temizleyebilir. Asıl koruma Firebase tarafındadır.
 */

const STORAGE_KEY = "gunluk:login-attempts";
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, until: 0 };
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count) || 0,
      until: Number(parsed.until) || 0,
    };
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

export default function useLoginThrottle() {
  const [state, setState] = useState(readState);
  const [secondsLeft, setSecondsLeft] = useState(0);

  /* Kilit sayacını saniye saniye geriye say */
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((state.until - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    if (state.until <= Date.now()) return undefined;

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.until]);

  const registerFailure = useCallback(() => {
    setState((current) => {
      const count = current.count + 1;
      let until = 0;

      if (count >= FREE_ATTEMPTS) {
        const step = count - FREE_ATTEMPTS;
        until = Date.now() + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** step);
      }

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
    /** Kilitlenmeye kalan deneme sayısı (uyarı göstermek için). */
    remainingAttempts: Math.max(0, FREE_ATTEMPTS - state.count),
    registerFailure,
    reset,
  };
}
