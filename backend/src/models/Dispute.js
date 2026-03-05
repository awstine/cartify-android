import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    customerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    merchantUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    reason: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "rejected"],
      default: "open",
      index: true,
    },
    resolutionNote: { type: String, default: "" },
    resolvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Dispute = mongoose.models.Dispute || mongoose.model("Dispute", disputeSchema);

