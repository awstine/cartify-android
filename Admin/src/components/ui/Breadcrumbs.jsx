import { Link, useLocation } from "react-router-dom";

const labels = {
  "": "Dashboard",
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  users: "Customers",
  sales: "Sales",
  coupons: "Coupons",
  "audit-logs": "Audit Logs",
  profile: "Profile",
};

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const adminParts = parts[0] === "admin" ? parts.slice(1) : parts;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/admin" className="hover:text-slate-900 dark:hover:text-slate-100">
            Dashboard
          </Link>
        </li>
        {adminParts.map((part, index) => {
          const to = `/admin/${adminParts.slice(0, index + 1).join("/")}`;
          const isLast = index === adminParts.length - 1;
          return (
            <li key={to} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{labels[part] || part}</span>
              ) : (
                <Link to={to} className="hover:text-slate-900 dark:hover:text-slate-100">
                  {labels[part] || part}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
