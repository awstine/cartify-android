import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";

const router = Router();

router.get("/", async (_req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

router.post(
  "/:id/reviews",
  requireAuth,
  [body("rating").isInt({ min: 1, max: 5 }), body("comment").optional().isString().isLength({ max: 1000 })],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = await User.findById(req.user.id).select("name");
    const comment = String(req.body.comment || "").trim();
    const rating = Number(req.body.rating);
    const existingIdx = (product.reviews || []).findIndex((review) => String(review.userId) === String(req.user.id));

    const nextReview = {
      userId: req.user.id,
      userName: user?.name || "Customer",
      rating,
      comment,
      createdAt: new Date(),
    };

    if (existingIdx >= 0) {
      product.reviews[existingIdx] = nextReview;
    } else {
      product.reviews.push(nextReview);
    }

    await product.save();
    res.status(201).json({ message: "Review saved", reviews: product.reviews });
  }
);

export default router;
