import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, required: false },
    endsAt: { type: Date, required: false },
    maxUses: { type: Number, required: false, min: 1 },
    usesCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
