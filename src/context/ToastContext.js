import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

/**
 * Bildirim (toast) sistemi — `alert()` çağrılarının yerini alır.
 *
 * `alert()` tarayıcıyı kilitler, mobilde çirkin görünür ve stil verilemez.
 * Bu bileşen animasyonlu, temaya uyumlu ve ekran okuyuculara duyurulan
 * bildirimler gösterir.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
};

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    // Önce çıkış animasyonunu oynat, sonra DOM'dan kaldır
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );

    window.clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, 240)
    );
  }, []);

  const push = useCallback(
    (message, type = "info", duration = DEFAULT_DURATION) => {
      if (!message) return null;

      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-3), { id, message, type, duration }]);

      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, duration) => push(message, "success", duration),
      error: (message, duration) => push(message, "error", duration ?? 6000),
      info: (message, duration) => push(message, "info", duration),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-stack" role="region" aria-label="Bildirimler">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || FiInfo;
          return (
            <div
              key={item.id}
              className={`toast toast-${item.type}${item.leaving ? " is-leaving" : ""}`}
              role={item.type === "error" ? "alert" : "status"}
              aria-live={item.type === "error" ? "assertive" : "polite"}
            >
              <span className="toast-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="toast-body">{item.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(item.id)}
                aria-label="Bildirimi kapat"
              >
                <FiX size={16} aria-hidden="true" />
              </button>
              <span
                className="toast-progress"
                style={{ animationDuration: `${item.duration}ms` }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast yalnızca <ToastProvider> içinde kullanılabilir.");
  }
  return context;
}
