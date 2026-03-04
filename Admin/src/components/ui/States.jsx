import { Card } from "./Surface";

export const LoadingState = ({ label = "Loading...", showSpinner = true }) => (
  <Card className="flex items-center gap-3">
    {showSpinner ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> : null}
    <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
  </Card>
);

export const EmptyState = ({ title, description, action }) => (
  <Card className="text-center">
    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </Card>
);

export const ErrorState = ({ message, action }) => (
  <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
    <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    {action ? <div className="mt-3">{action}</div> : null}
  </Card>
);
