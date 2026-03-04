import { useEffect } from "react";
import { cn } from "./cn";

export const Drawer = ({ isOpen, onClose, title, children, side = "left" }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50">
      <button className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close drawer" />
      <aside
        className={cn(
          "absolute top-0 h-full w-[85vw] max-w-xs border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950",
          side === "left" ? "left-0 border-r" : "right-0 border-l"
        )}
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
