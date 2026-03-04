import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
