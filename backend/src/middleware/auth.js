import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
