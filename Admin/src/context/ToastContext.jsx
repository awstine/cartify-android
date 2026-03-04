import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let nextToastId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message = "", type = "info", duration = 3000 }) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      window.setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm transition-all ${
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-xs">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md px-1 py-0.5 text-xs hover:bg-black/5"
                aria-label="Close notification"
              >
                x
              </button>
            </div>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
