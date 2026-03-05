import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { SearchEvent } from "../models/SearchEvent.js";
import { Store } from "../models/Store.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";

const router = Router();

router.get("/", async (req, res) => {
  const query = {};
  if (req.query.storeId && mongoose.Types.ObjectId.isValid(String(req.query.storeId))) {
    query.storeId = String(req.query.storeId);
  }
  if (req.query.storeSlug) {
    const store = await Store.findOne({ slug: String(req.query.storeSlug), isActive: true }).select("_id");
    if (!store) return res.json([]);
    query.storeId = store._id;
  }
  if (req.query.includeDrafts !== "true") {
    query.status = { $ne: "draft" };
  }
  if (req.query.category && req.query.category !== "all") {
    query.category = String(req.query.category);
  }
  if (req.query.search) {
    query.title = { $regex: String(req.query.search).trim(), $options: "i" };
  }
  if (String(req.query.inStock || "").toLowerCase() === "true") {
    query.stockQty = { $gt: 0 };
  }

  let products = await Product.find(query).sort({ createdAt: -1 });
  const minRating = Number(req.query.minRating || 0);
  const maxPrice = Number(req.query.maxPrice || 0);

  if (minRating > 0) {
    products = products.filter((product) => {
      const reviews = product.reviews || [];
      if (reviews.length === 0) return false;
      const avg = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
      return avg >= minRating;
    });
  }

  if (maxPrice > 0) {
    products = products.filter((product) => {
      const price = Number(product.salePrice > 0 ? product.salePrice : product.price || 0);
      return price <= maxPrice;
    });
  }

  res.json(products);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  let store = null;
  if (product.storeId) {
    store = await Store.findById(product.storeId).select("name slug description logoUrl");
  }
  res.json({
    ...product,
    store: store
      ? {
          id: String(store._id),
          name: store.name,
          slug: store.slug,
          description: store.description || "",
          logoUrl: store.logoUrl || "",
        }
      : null,
  });
});

router.post("/search-events", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const store = body.storeSlug ? await Store.findOne({ slug: String(body.storeSlug) }).select("_id") : null;
  await SearchEvent.create({
    userId: req.user?.id || null,
    query: String(body.query || "").trim(),
    category: String(body.category || ""),
    storeId: store?._id || null,
    inStockOnly: Boolean(body.inStockOnly),
    minRating: Number(body.minRating || 0),
    maxPrice: Number(body.maxPrice || 0),
    resultCount: Math.max(0, Number(body.resultCount || 0)),
  });
  return res.status(201).json({ ok: true });
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
