import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: false, default: null },
    merchantUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
    variantSku: { type: String, default: "" },
    title: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    merchantUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String, default: "" },
    shippingAddress: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "" },
    },
    shippingDetails: {
      courier: { type: String, default: "" },
      trackingNumber: { type: String, default: "" },
      eta: { type: Date, required: false },
      timeline: {
        type: [
          new mongoose.Schema(
            {
              label: { type: String, required: true },
              note: { type: String, default: "" },
              at: { type: Date, default: Date.now },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
    },
    status: {
      type: String,
      enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
      default: "placed",
    },
    returnRefundRequest: {
      requested: { type: Boolean, default: false },
      type: { type: String, enum: ["return", "refund", ""], default: "" },
      reason: { type: String, default: "" },
      details: { type: String, default: "" },
      status: {
        type: String,
        enum: ["none", "requested", "in_review", "approved", "rejected", "completed"],
        default: "none",
      },
      requestedAt: { type: Date, required: false },
      updatedAt: { type: Date, required: false },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
