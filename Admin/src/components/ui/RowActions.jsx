import { useState } from "react";
import { Button } from "./Button";

export const RowActions = ({ onView, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" className="px-2 py-1" onClick={() => setOpen((prev) => !prev)} aria-label="Row actions">
        ...
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {onView ? (
            <button onClick={() => { setOpen(false); onView(); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              View
            </button>
          ) : null}
          {onEdit ? (
            <button onClick={() => { setOpen(false); onEdit(); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
