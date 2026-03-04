import { cn } from "./cn";

export const Card = ({ children, className = "" }) => (
  <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950", className)}>
    {children}
  </section>
);

export const Badge = ({ children, tone = "default" }) => {
  const tones = {
    default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    info: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
};

export const Divider = () => <hr className="border-slate-200 dark:border-slate-800" />;
