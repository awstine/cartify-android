import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, prefetchGet } from "../api";
import { useAuth } from "../auth";
import { Button } from "./ui/Button";
import { Drawer } from "./ui/Drawer";
import { Input } from "./ui/Field";

const STAFF_ROLES = ["support", "manager", "admin", "super_admin"];

export const StoreLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState(searchParams.get("search") || "");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      if (!isAuthenticated) {
        if (active) setCartCount(0);
        return;
      }
      try {
        const response = await api.get("/cart");
        const count = (response.data.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        if (active) setCartCount(count);
      } catch (_err) {
        if (active) setCartCount(0);
      }
    };
    loadCart();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const response = await api.get("/products");
        if (!active) return;
        const unique = [...new Set((response.data || []).map((item) => String(item.category || "general")))].filter(Boolean);
        setCategories(unique.sort((a, b) => a.localeCompare(b)));
      } catch (_err) {
        if (active) setCategories([]);
      }
    };
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
  }, [searchParams]);

  const canAccessAdmin = useMemo(() => STAFF_ROLES.includes(user?.role || ""), [user?.role]);
  const selectedCategory = searchParams.get("category") || "all";
  const prefetchStore = (target, { withProgress = false } = {}) => {
    const tasks = {
      shop: [prefetchGet("/products", { withProgress })],
      cart: [prefetchGet("/cart", { withProgress })],
      orders: [prefetchGet("/orders", { withProgress })],
      profile: [prefetchGet("/users/me", { withProgress })],
      admin: [
        prefetchGet("/admin/dashboard", { withProgress }),
        prefetchGet("/admin/orders", { params: { limit: 5 }, withProgress }),
      ],
    };
    return Promise.all(tasks[target] || []).catch(() => null);
  };
  const navigateWithStorePrefetch = async (path, target) => {
    try {
      await prefetchStore(target, { withProgress: true });
    } catch (_err) {
      // Ignore and continue navigation.
    }
    navigate(path);
  };
  const applyShopFilters = ({ search, category }) => {
    const params = new URLSearchParams();
    const nextSearch = search !== undefined ? String(search).trim() : String(searchParams.get("search") || "").trim();
    const nextCategory = category !== undefined ? category : searchParams.get("category") || "all";
    if (nextSearch) params.set("search", nextSearch);
    if (nextCategory && nextCategory !== "all") params.set("category", nextCategory);
    const destination = `/${params.toString() ? `?${params.toString()}` : ""}`;
    navigateWithStorePrefetch(destination, "shop");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white p-2 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link to="/" className="font-heading text-xl font-bold text-slate-900">
            Cartify
          </Link>
          <nav className="ml-4 hidden items-center gap-4 text-sm text-slate-700 lg:flex">
            <Link
              to="/"
              onMouseEnter={() => prefetchStore("shop")}
              onFocus={() => prefetchStore("shop")}
              onClick={(event) => {
                event.preventDefault();
                navigateWithStorePrefetch("/", "shop");
              }}
              className="hover:text-slate-900"
            >
              Shop
            </Link>
            <div className="group relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-slate-900"
                onMouseEnter={() => {
                  setCategoryMenuOpen(true);
                  prefetchStore("shop");
                }}
              >
                Categories
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div
                className={`absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition ${
                  categoryMenuOpen ? "visible opacity-100" : "invisible opacity-0"
                }`}
                onMouseEnter={() => setCategoryMenuOpen(true)}
                onMouseLeave={() => setCategoryMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => applyShopFilters({ category: "all" })}
                  className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${selectedCategory === "all" ? "bg-slate-100 font-semibold" : ""}`}
                >
                  All Categories
                </button>
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseEnter={() => prefetchStore("shop")}
                    onClick={() => applyShopFilters({ category: item })}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${selectedCategory === item ? "bg-slate-100 font-semibold" : ""}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            {isAuthenticated ? (
              <>
                <Link
                  to="/my-orders"
                  onMouseEnter={() => prefetchStore("orders")}
                  onFocus={() => prefetchStore("orders")}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateWithStorePrefetch("/my-orders", "orders");
                  }}
                  className="hover:text-slate-900"
                >
                  My Orders
                </Link>
                <Link
                  to="/cart"
                  onMouseEnter={() => prefetchStore("cart")}
                  onFocus={() => prefetchStore("cart")}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateWithStorePrefetch("/cart", "cart");
                  }}
                  className="hover:text-slate-900"
                >
                  Cart ({cartCount})
                </Link>
              </>
            ) : null}
          </nav>
          {location.pathname === "/" ? (
            <form
              className="ml-2 hidden w-full max-w-md items-center gap-2 lg:flex"
              onSubmit={(event) => {
                event.preventDefault();
                applyShopFilters({ search: searchText });
              }}
            >
              <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search products..." aria-label="Search products" onFocus={() => prefetchStore("shop")} />
              <Button type="submit" variant="secondary" className="px-3">
                Search
              </Button>
            </form>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {canAccessAdmin ? (
              <Button
                variant="secondary"
                onMouseEnter={() => prefetchStore("admin")}
                onFocus={() => prefetchStore("admin")}
                onClick={() => navigateWithStorePrefetch("/admin", "admin")}
                className="hidden sm:inline-flex"
              >
                Admin
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => navigateWithStorePrefetch("/cart", "cart")}
              onMouseEnter={() => prefetchStore("cart")}
              onFocus={() => prefetchStore("cart")}
              className="relative rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" />
              </svg>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              aria-label="Account menu"
            >
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.8-3.5 5-5 8-5s6.2 1.5 8 5" />
                </svg>
                <span className="hidden sm:inline">{isAuthenticated ? user?.name || "Account" : "Login"}</span>
              </span>
            </button>
            {menuOpen ? (
              <div className="absolute right-4 top-14 z-40 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {isAuthenticated ? (
                  <>
                    <p className="truncate px-2 py-1 text-sm font-medium text-slate-800">{user?.email}</p>
                    <Link
                      to="/my-orders"
                      onMouseEnter={() => prefetchStore("orders")}
                      onFocus={() => prefetchStore("orders")}
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        navigateWithStorePrefetch("/my-orders", "orders");
                      }}
                      className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/cart"
                      onMouseEnter={() => prefetchStore("cart")}
                      onFocus={() => prefetchStore("cart")}
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        navigateWithStorePrefetch("/cart", "cart");
                      }}
                      className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
                    >
                      Cart ({cartCount})
                    </Link>
                    {canAccessAdmin ? (
                      <Link
                        to="/admin"
                        onMouseEnter={() => prefetchStore("admin")}
                        onFocus={() => prefetchStore("admin")}
                        onClick={(event) => {
                          event.preventDefault();
                          setMenuOpen(false);
                          navigateWithStorePrefetch("/admin", "admin");
                        }}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
                      >
                        Admin Dashboard
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigateWithStorePrefetch("/login", "profile");
                    }}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                  >
                    Sign in
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p className="font-medium text-slate-700">Cartify</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/"
              className="hover:text-slate-900"
              onClick={(event) => {
                event.preventDefault();
                navigateWithStorePrefetch("/", "shop");
              }}
            >
              Shop
            </Link>
            <Link
              to="/cart"
              className="hover:text-slate-900"
              onClick={(event) => {
                event.preventDefault();
                navigateWithStorePrefetch("/cart", "cart");
              }}
            >
              Cart
            </Link>
            <Link
              to="/my-orders"
              className="hover:text-slate-900"
              onClick={(event) => {
                event.preventDefault();
                navigateWithStorePrefetch("/my-orders", "orders");
              }}
            >
              My Orders
            </Link>
            {canAccessAdmin ? (
              <Link
                to="/admin"
                className="hover:text-slate-900"
                onClick={(event) => {
                  event.preventDefault();
                  navigateWithStorePrefetch("/admin", "admin");
                }}
              >
                Admin
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Cartify. All rights reserved.</p>
        </div>
      </footer>
      <Drawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Menu">
        <div className="space-y-3">
          <Link
            to="/"
            onMouseEnter={() => prefetchStore("shop")}
            onFocus={() => prefetchStore("shop")}
            onClick={(event) => {
              event.preventDefault();
              setMobileNavOpen(false);
              navigateWithStorePrefetch("/", "shop");
            }}
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
          >
            Shop
          </Link>
          <Link
            to="/cart"
            onMouseEnter={() => prefetchStore("cart")}
            onFocus={() => prefetchStore("cart")}
            onClick={(event) => {
              event.preventDefault();
              setMobileNavOpen(false);
              navigateWithStorePrefetch("/cart", "cart");
            }}
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
          >
            Cart ({cartCount})
          </Link>
          {isAuthenticated ? (
            <Link
              to="/my-orders"
              onMouseEnter={() => prefetchStore("orders")}
              onFocus={() => prefetchStore("orders")}
              onClick={(event) => {
                event.preventDefault();
                setMobileNavOpen(false);
                navigateWithStorePrefetch("/my-orders", "orders");
              }}
              className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
            >
              My Orders
            </Link>
          ) : null}
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search</p>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyShopFilters({ search: searchText });
                setMobileNavOpen(false);
              }}
            >
              <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search..." />
              <Button type="submit" variant="secondary" className="px-3">
                Go
              </Button>
            </form>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  applyShopFilters({ category: "all" });
                  setMobileNavOpen(false);
                }}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${selectedCategory === "all" ? "bg-slate-100 font-semibold" : ""}`}
              >
                All Categories
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    applyShopFilters({ category: item });
                    setMobileNavOpen(false);
                  }}
                  className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${selectedCategory === item ? "bg-slate-100 font-semibold" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
