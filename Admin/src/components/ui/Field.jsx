import { forwardRef } from "react";
import { cn } from "./cn";

const baseInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export const Field = ({ label, helperText, error, htmlFor, children }) => (
  <div className="space-y-1.5">
    {label ? (
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
    ) : null}
    {children}
    {error ? (
      <p className="text-xs text-red-600" role="alert">
        {error}
      </p>
    ) : helperText ? (
      <p className="text-xs text-slate-500">{helperText}</p>
    ) : null}
  </div>
);

export const Input = forwardRef(({ className = "", ...props }, ref) => (
  <input ref={ref} {...props} className={cn(baseInputClass, className)} />
));
Input.displayName = "Input";

export const Select = forwardRef(({ className = "", ...props }, ref) => (
  <select ref={ref} {...props} className={cn(baseInputClass, className)} />
));
Select.displayName = "Select";

export const Textarea = forwardRef(({ className = "", rows = 4, ...props }, ref) => (
  <textarea ref={ref} {...props} rows={rows} className={cn(baseInputClass, "resize-y", className)} />
));
Textarea.displayName = "Textarea";

export const Checkbox = forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    type="checkbox"
    className={cn(
      "h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900",
      className
    )}
  />
));
Checkbox.displayName = "Checkbox";

export const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      "inline-flex h-7 w-12 items-center rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
      checked ? "bg-slate-900" : "bg-slate-300"
    )}
  >
    <span
      className={cn(
        "h-5 w-5 rounded-full bg-white transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    />
    <span className="sr-only">{label}</span>
  </button>
);
