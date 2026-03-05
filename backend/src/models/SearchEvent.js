import mongoose from "mongoose";

const searchEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    query: { type: String, default: "" },
    category: { type: String, default: "" },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    inStockOnly: { type: Boolean, default: false },
    minRating: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    resultCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SearchEvent = mongoose.models.SearchEvent || mongoose.model("SearchEvent", searchEventSchema);
