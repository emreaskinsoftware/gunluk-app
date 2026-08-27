import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiCheck, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

/**
 * Bildirimler — `alert()` yerine.
 *
 * Sayfanın altında, ölçülü bir şerit halinde belirir. Ekran okuyucular için
 * `role="status"` / `role="alert"` ile duyurulur.
 */

const ToastContext = createContext(null);

const ICONS = { success: FiCheck, error: FiAlertCircle, info: FiInfo };
const DEFAULT_MS = 4000;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  const lastId = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)));

    window.clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      window.setTimeout(() => {
        setItems((current) => current.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, 180)
    );
  }, []);

  const push = useCallback(
    (message, type = "info", duration = DEFAULT_MS) => {
      if (!message) return null;

      const id = ++lastId.current;
      // En fazla 3 bildirim aynı anda görünsün
      setItems((current) => [...current.slice(-2), { id, message, type }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, ms) => push(message, "success", ms),
      error: (message, ms) => push(message, "error", ms ?? 6000),
      info: (message, ms) => push(message, "info", ms),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toasts" role="region" aria-label="Bildirimler">
        {items.map((item) => {
          const Icon = ICONS[item.type] || FiInfo;
          return (
            <div
              key={item.id}
              className={`toast toast-${item.type}${item.leaving ? " leaving" : ""}`}
              role={item.type === "error" ? "alert" : "status"}
              aria-live={item.type === "error" ? "assertive" : "polite"}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="toast-body">{item.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(item.id)}
                aria-label="Kapat"
              >
                <FiX size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast yalnızca <ToastProvider> içinde kullanılabilir.");
  return context;
}
