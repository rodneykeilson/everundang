import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  ToastContext,
  type Toast,
  type ToastType,
  DEFAULT_DURATION,
  generateToastId,
} from "./ToastContext";
import "../styles/toast.css";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = generateToastId();
      const duration = toast.duration ?? DEFAULT_DURATION;
      const dismissible = toast.dismissible ?? true;

      setToasts((prev) => [...prev, { ...toast, id, duration, dismissible }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const createHelper = useCallback(
    (type: ToastType) => (message: string, title?: string) => {
      return addToast({ type, message, title });
    },
    [addToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearToasts,
      success: createHelper("success"),
      error: createHelper("error"),
      warning: createHelper("warning"),
      info: createHelper("info"),
    }),
    [toasts, addToast, removeToast, clearToasts, createHelper]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role="alert"
            aria-live="polite"
          >
            <div className="toast__content">
              {toast.title && <strong className="toast__title">{toast.title}</strong>}
              <p className="toast__message">{toast.message}</p>
            </div>
            {toast.dismissible && (
              <button
                className="toast__close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
