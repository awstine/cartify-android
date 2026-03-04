import { useEffect, useState } from "react";
import { cn } from "./cn";

const DRAWER_TRANSITION_MS = 550;

export const Drawer = ({ isOpen, onClose, title, children, side = "left" }) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const rafId = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => setIsMounted(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [isMounted, onClose]);

  if (!isMounted) return null;
  return (
    <div className={cn("fixed inset-0 z-50 bg-slate-950/50 transition-opacity ease-out", isVisible ? "opacity-100" : "opacity-0")} style={{ transitionDuration: `${DRAWER_TRANSITION_MS}ms` }}>
      <button className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close drawer" />
      <aside
        className={cn(
          "absolute top-0 h-full w-[85vw] max-w-xs border-slate-200 bg-white p-4 transition-transform ease-out dark:border-slate-800 dark:bg-slate-950",
          side === "left"
            ? `left-0 border-r ${isVisible ? "translate-x-0" : "-translate-x-full"}`
            : `right-0 border-l ${isVisible ? "translate-x-0" : "translate-x-full"}`
        )}
        style={{ transitionDuration: `${DRAWER_TRANSITION_MS}ms` }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose} aria-label="Close drawer">
            x
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
};
