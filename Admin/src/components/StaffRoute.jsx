import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

const STAFF_ROLES = ["merchant", "support", "manager", "admin", "super_admin"];

export const StaffRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!STAFF_ROLES.includes(user?.role || "")) return <Navigate to="/" replace />;
  return children;
};
