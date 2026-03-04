import { cn } from "./cn";

export const Table = ({ columns, rows, renderRow, rowKey, emptyMessage = "No records found." }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur dark:bg-slate-900/95">
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", column.className)}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-t border-slate-200 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60",
                index % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-900/20" : ""
              )}
            >
              {renderRow(row)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const Td = ({ children, className = "" }) => (
  <td className={cn("px-4 py-3 align-middle text-slate-700 dark:text-slate-200", className)}>{children}</td>
);
