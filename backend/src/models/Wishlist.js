import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: {
      type: [
        new mongoose.Schema(
          {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            alerts: {
              priceDrop: { type: Boolean, default: false },
              backInStock: { type: Boolean, default: false },
            },
            lastKnownPrice: { type: Number, default: 0 },
            lastKnownInStock: { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
