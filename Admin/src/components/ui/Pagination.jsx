import { Button } from "./Button";

export const Pagination = ({ page, total, limit, onPageChange }) => {
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(Math.min(pages, page + 1))} disabled={page >= pages}>
          Next
        </Button>
      </div>
    </div>
  );
};
