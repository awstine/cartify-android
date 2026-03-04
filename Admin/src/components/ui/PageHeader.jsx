import { Button } from "./Button";

export const PageHeader = ({ title, description, action }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      {description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </div>
);

export const Toolbar = ({ children, onOpenFilters }) => (
  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
    <div className="hidden items-center gap-3 md:flex">{children}</div>
    <div className="flex justify-end md:hidden">
      <Button variant="secondary" onClick={onOpenFilters}>
        Filters
      </Button>
    </div>
  </div>
);
