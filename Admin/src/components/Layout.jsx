import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { Breadcrumbs } from "./ui/Breadcrumbs";
import { Button } from "./ui/Button";
import { Drawer } from "./ui/Drawer";
import { Input } from "./ui/Field";

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/products", label: "Products", icon: "products" },
  { to: "/categories", label: "Categories", icon: "categories" },
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/users", label: "Customers", icon: "customers" },
  { to: "/sales", label: "Sales", icon: "sales" },
];

const NavIcon = ({ type }) => {
  const common = "h-4 w-4";
  if (type === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="5" rx="1" />
        <rect x="13" y="10" width="8" height="11" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
      </svg>
    );
  }
  if (type === "products") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7 12 3l9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
      </svg>
    );
  }
  if (type === "categories") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h8v6H3zM13 6h8v4h-8zM13 12h8v6h-8zM3 14h8v4H3z" />
      </svg>
    );
  }
  if (type === "orders") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4h12l2 4H4l2-4Z" />
        <path d="M5 8h14v12H5z" />
        <path d="M9 12h6" />
      </svg>
    );
  }
  if (type === "customers") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19h16M6 15l3-3 3 2 4-5 2 3" />
    </svg>
  );
};

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState("");
  const firstPollRef = useRef(true);

  const seenKey = `cartify_admin_last_seen_order_${user?.id || user?.email || "default"}`;
  const formatMoney = (value) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value || 0);

  const markNotificationsRead = (orders = recentOrders) => {
    if (!orders || orders.length === 0) return;
    const newest = orders
      .map((order) => new Date(order.createdAt).getTime())
      .reduce((max, value) => Math.max(max, value), 0);
    if (newest > 0) {
      localStorage.setItem(seenKey, String(newest));
    }
    setUnreadCount(0);
  };

  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/admin/orders", { params: { page: 1, limit: 8 } });
        if (!active) return;
        const orders = response.data.items || [];
        setRecentOrders(orders);

        const lastSeen = Number(localStorage.getItem(seenKey) || 0);
        const newCount = orders.filter((order) => new Date(order.createdAt).getTime() > lastSeen).length;
        setUnreadCount(newCount);

        if (!firstPollRef.current && newCount > 0) {
          showToast({
            type: "info",
            title: `You have ${newCount} new order${newCount > 1 ? "s" : ""}`,
            message: "Check the notifications list for details.",
          });
        }
        firstPollRef.current = false;
      } catch (_err) {
        // Silent fail for notification polling.
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [seenKey, showToast]);

  const navLinks = useMemo(
    () => (
      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                isActive
                  ? "bg-primary text-white dark:bg-primary dark:text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
            onClick={() => setMobileOpen(false)}
          >
            <span className="inline-flex items-center gap-2">
              <NavIcon type={item.icon} />
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>
    ),
    [setMobileOpen]
  );

  const sidebar = (
    <aside className={`${collapsed ? "w-20" : "w-64"} hidden h-screen shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 transition-all dark:border-slate-800 dark:bg-slate-950 lg:block`}>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">{collapsed ? "CA" : "Cartify Admin"}</h1>
        <Button variant="ghost" className="px-2 py-1" onClick={() => setCollapsed((prev) => !prev)} aria-label="Collapse sidebar">
          {collapsed ? ">" : "<"}
        </Button>
      </div>
      {!collapsed ? (
        <>
          {navLinks}
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={`compact-${item.to}`}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex h-9 w-9 items-center justify-center rounded-xl text-xs transition ${
                  isActive
                    ? "bg-primary text-white dark:bg-primary dark:text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
              title={item.label}
            >
              <NavIcon type={item.icon} />
            </NavLink>
          ))}
        </div>
      )}
    </aside>
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      <div className="flex h-screen w-full overflow-hidden">
        {sidebar}
        <div className="min-w-0 flex h-full flex-1 flex-col overflow-hidden">
          <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
            <Button variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              Menu
            </Button>
            <div className="hidden w-full max-w-md md:block">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, orders, customers..."
                aria-label="Search dashboard"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" aria-label="Users" onClick={() => navigate("/users")}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <circle cx="17" cy="9" r="2" />
                </svg>
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  aria-label="Notifications"
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    if (next) markNotificationsRead();
                  }}
                >
                  <span className="relative">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                      <path d="M9 17a3 3 0 0 0 6 0" />
                    </svg>
                    {unreadCount > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </span>
                </Button>
                {notificationsOpen ? (
                  <div className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <p className="text-sm font-semibold">Notifications</p>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => markNotificationsRead()}>
                        Mark read
                      </Button>
                    </div>
                    {recentOrders.length === 0 ? (
                      <p className="px-2 py-4 text-xs text-slate-500">No recent orders.</p>
                    ) : (
                      <div className="max-h-72 space-y-1 overflow-y-auto">
                        {recentOrders.map((order) => (
                          <button
                            key={order._id}
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate("/orders");
                            }}
                            className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              New order #{order._id.slice(-6)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {order.userId?.email || "Customer"} - {formatMoney(order.total)}
                            </p>
                            <p className="text-[11px] text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === "dark" ? "Light" : "Dark"}
              </Button>
              <div className="relative">
                <Button variant="ghost" onClick={() => setProfileOpen((prev) => !prev)} aria-label="Profile menu">
                  {user?.name?.slice(0, 1) || "A"}
                </Button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <p className="px-2 py-1 text-xs text-slate-500">Signed in as</p>
                    <p className="truncate px-2 py-1 text-sm font-medium">{user?.email}</p>
                    <Button
                      variant="secondary"
                      className="mt-2 w-full"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/profile");
                      }}
                    >
                      Profile
                    </Button>
                    <Button className="mt-2 w-full" onClick={logout}>
                      Logout
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
      <Drawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title="Navigation">
        {navLinks}
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button onClick={logout} className="w-full">
            Logout
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
