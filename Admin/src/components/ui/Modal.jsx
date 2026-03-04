import { useEffect, useRef } from "react";
import { cn } from "./cn";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal = ({ isOpen, onClose, title, children, footer, fullScreenOnMobile = true }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll(FOCUSABLE);
    focusable?.[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" onClick={onClose} />
      <section
        ref={panelRef}
        className={cn(
          "relative z-10 flex w-full max-h-[90vh] flex-col rounded-t-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl sm:rounded-2xl",
          fullScreenOnMobile ? "min-h-[70vh] sm:min-h-0 sm:max-h-[85vh]" : "sm:max-h-[80vh]"
        )}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close modal">
            x
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        {footer ? <footer className="mt-5 flex justify-end gap-2">{footer}</footer> : null}
      </section>
    </div>
  );
};
