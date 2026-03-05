import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    imageUrl: { type: String, default: "" },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 4,
        message: "A product can have up to 4 images",
      },
    },
    costPrice: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0, default: 0 },
    stockQty: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["active", "draft"], default: "active" },
    variants: {
      type: [
        new mongoose.Schema(
          {
            sku: { type: String, default: "" },
            size: { type: String, default: "" },
            color: { type: String, default: "" },
            price: { type: Number, min: 0, default: 0 },
            stockQty: { type: Number, min: 0, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    reviews: {
      type: [
        new mongoose.Schema(
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            userName: { type: String, required: true },
            rating: { type: Number, min: 1, max: 5, required: true },
            comment: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
