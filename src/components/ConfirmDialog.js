import React, { useEffect, useRef } from "react";
import { FiAlertTriangle } from "react-icons/fi";

/**
 * Onay penceresi — `window.confirm()` yerine.
 *
 * Erişilebilirlik: Esc ile kapanır, odak pencerenin içinde hapsedilir
 * (focus trap) ve açılırken güvenli olan "Vazgeç" düğmesi odaklanır.
 */
export default function ConfirmDialog({
  open,
  title = "Emin misiniz?",
  description,
  confirmLabel = "Evet, sil",
  cancelLabel = "Vazgeç",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }

      if (event.key !== "Tab") return;

      // Odağı pencere içinde tut
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
      >
        <div className="modal-icon" aria-hidden="true">
          <FiAlertTriangle size={24} />
        </div>

        <h3 id="confirm-title">{title}</h3>
        {description && <p id="confirm-desc">{description}</p>}

        <div className="modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <span className="spinner" style={{ width: 16, height: 16 }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
