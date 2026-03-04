import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CouponsPage } from "./pages/CouponsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProductsPage } from "./pages/ProductsPage";
import { SalesPage } from "./pages/SalesPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { UsersPage } from "./pages/UsersPage";

const App = () => {
  const { isAuthenticated } = useAuth();
  const withLayout = (node) => (
    <ProtectedRoute>
      <Layout>{node}</Layout>
    </ProtectedRoute>
  );

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={withLayout(<DashboardPage />)} />
      <Route path="/products" element={withLayout(<ProductsPage />)} />
      <Route path="/categories" element={withLayout(<CategoriesPage />)} />
      <Route path="/orders" element={withLayout(<OrdersPage />)} />
      <Route path="/users" element={withLayout(<UsersPage />)} />
      <Route path="/sales" element={withLayout(<SalesPage />)} />
      <Route path="/coupons" element={withLayout(<CouponsPage />)} />
      <Route path="/audit-logs" element={withLayout(<AuditLogsPage />)} />
      <Route path="/profile" element={withLayout(<ProfilePage />)} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
};

export default App;
