import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
    imageUrl: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
