import { requireAuth } from "./auth.js";
import { User } from "../models/User.js";

export async function requireAdmin(req, res, next) {
  const allowedRoles = ["support", "manager", "admin", "super_admin"];
  requireRoles(allowedRoles)(req, res, next);
}

export function requireRoles(allowedRoles = []) {
  return async (req, res, next) => {
    requireAuth(req, res, async () => {
      try {
        const user = await User.findById(req.user.id).select("role");
        if (!user || !allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: "Forbidden" });
        }

        req.user.role = user.role;
        next();
      } catch (error) {
        next(error);
      }
    });
  };
}

export function requireSuperAdmin(req, res, next) {
  return requireRoles(["super_admin"])(req, res, next);
}

export function requireManagerOrAbove(req, res, next) {
  return requireRoles(["manager", "admin", "super_admin"])(req, res, next);
}

export function requireAdminOrAbove(req, res, next) {
  return requireRoles(["admin", "super_admin"])(req, res, next);
}

export async function requireSupportOrAbove(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).select("role");
      if (!user || !["support", "manager", "admin", "super_admin"].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  });
}
