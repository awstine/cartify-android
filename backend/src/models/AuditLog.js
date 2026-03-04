import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
