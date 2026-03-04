import { AuditLog } from "../models/AuditLog.js";

export async function logAudit(req, action, entityType, entityId = "", details = {}) {
  try {
    if (!req?.user?.id) return;
    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email || "",
      actorRole: req.user.role || "unknown",
      action,
      entityType,
      entityId: String(entityId || ""),
      details,
    });
  } catch (_err) {
    // Audit logging should not break business flow.
  }
}
