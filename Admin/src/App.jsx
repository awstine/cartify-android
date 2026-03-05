import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StaffRoute } from "./components/StaffRoute";
import { StoreLayout } from "./components/StoreLayout";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CouponsPage } from "./pages/CouponsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DisputesPage } from "./pages/DisputesPage";
import { GrowthDashboardPage } from "./pages/GrowthDashboardPage";
import { HelpSafetyPage } from "./pages/HelpSafetyPage";
import { LoginPage } from "./pages/LoginPage";
import { MerchantsPage } from "./pages/MerchantsPage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProductsPage } from "./pages/ProductsPage";
import { SalesPage } from "./pages/SalesPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { StoreCartPage } from "./pages/StoreCartPage";
import { StoreHomePage } from "./pages/StoreHomePage";
import { StoreProductPage } from "./pages/StoreProductPage";
import { StoreProfilePage } from "./pages/StoreProfilePage";
import { StoreWishlistPage } from "./pages/StoreWishlistPage";
import { StoresPage } from "./pages/StoresPage";
import { UsersPage } from "./pages/UsersPage";

const App = () => {
  const { isAuthenticated, isStaff } = useAuth();
  const withLayout = (node) => (
    <StaffRoute>
      <Layout>{node}</Layout>
    </StaffRoute>
  );
  const withStoreLayout = (node) => <StoreLayout>{node}</StoreLayout>;
  const withAuth = (node) => <ProtectedRoute>{withStoreLayout(node)}</ProtectedRoute>;

  const defaultRoute = "/";
  const defaultLoginTarget = isAuthenticated ? (isStaff ? "/admin" : "/") : null;

  const legacyRoutes = [
    { path: "/products", target: "/admin/products" },
    { path: "/categories", target: "/admin/categories" },
    { path: "/orders", target: "/admin/orders" },
    { path: "/users", target: "/admin/users" },
    { path: "/sales", target: "/admin/sales" },
    { path: "/coupons", target: "/admin/coupons" },
    { path: "/audit-logs", target: "/admin/audit-logs" },
  ];

  const shouldShowLegacyRoutes = isAuthenticated && isStaff;

  return (
    <Routes>
      <Route path="/login" element={defaultLoginTarget ? <Navigate to={defaultLoginTarget} replace /> : <LoginPage />} />

      <Route path="/" element={withStoreLayout(<StoreHomePage />)} />
      <Route path="/stores" element={withStoreLayout(<StoresPage />)} />
      <Route path="/store/:storeSlug" element={withStoreLayout(<StoreHomePage />)} />
      <Route path="/product/:id" element={withStoreLayout(<StoreProductPage />)} />
      <Route path="/cart" element={withAuth(<StoreCartPage />)} />
      <Route path="/my-orders" element={withAuth(<MyOrdersPage />)} />
      <Route
        path="/profile"
        element={isAuthenticated && isStaff ? <Navigate to="/admin/profile" replace /> : withAuth(<StoreProfilePage />)}
      />
      <Route
        path="/wishlist"
        element={isAuthenticated && isStaff ? <Navigate to="/admin/profile" replace /> : withAuth(<StoreWishlistPage />)}
      />
      <Route path="/help-safety" element={withStoreLayout(<HelpSafetyPage />)} />

      <Route path="/admin" element={withLayout(<DashboardPage />)} />
      <Route path="/admin/products" element={withLayout(<ProductsPage />)} />
      <Route path="/admin/categories" element={withLayout(<CategoriesPage />)} />
      <Route path="/admin/orders" element={withLayout(<OrdersPage />)} />
      <Route path="/admin/users" element={withLayout(<UsersPage />)} />
      <Route path="/admin/merchants" element={withLayout(<MerchantsPage />)} />
      <Route path="/admin/disputes" element={withLayout(<DisputesPage />)} />
      <Route path="/admin/growth" element={withLayout(<GrowthDashboardPage />)} />
      <Route path="/admin/sales" element={withLayout(<SalesPage />)} />
      <Route path="/admin/coupons" element={withLayout(<CouponsPage />)} />
      <Route path="/admin/audit-logs" element={withLayout(<AuditLogsPage />)} />
      <Route path="/admin/profile" element={withLayout(<ProfilePage />)} />

      {shouldShowLegacyRoutes
        ? legacyRoutes.map((item) => <Route key={item.path} path={item.path} element={<Navigate to={item.target} replace />} />)
        : null}

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
};

export default App;
