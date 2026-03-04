import { requireAuth } from "./auth.js";
import { User } from "../models/User.js";

export async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).select("role");
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  });
}
