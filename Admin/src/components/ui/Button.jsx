import { cn } from "./cn";

const variants = {
  primary: "bg-primary text-white hover:bg-primaryDark focus-visible:ring-orange-300",
  secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400",
};

export const Button = ({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
      variants[variant],
      className
    )}
  >
    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
    {children}
  </button>
);
