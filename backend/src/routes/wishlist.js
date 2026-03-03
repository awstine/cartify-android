import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Wishlist } from "../models/Wishlist.js";

const router = Router();
router.use(requireAuth);

const mapWishlistResponse = (wishlist, productsById) =>
  wishlist.items.map((productId) => {
    const product = productsById.get(String(productId));
    return {
      productId: String(productId),
      product: product
        ? {
            id: String(product._id),
            title: product.title,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            price: product.price,
          }
        : null,
    };
  });

router.get("/", async (req, res) => {
  const wishlist =
    (await Wishlist.findOne({ userId: req.user.id })) ||
    (await Wishlist.create({ userId: req.user.id, items: [] }));

  const products = await Product.find({ _id: { $in: wishlist.items } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  res.json({ items: mapWishlistResponse(wishlist, productsById) });
});

router.post(
  "/items",
  [body("productId").isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { productId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const wishlist =
      (await Wishlist.findOne({ userId: req.user.id })) ||
      (await Wishlist.create({ userId: req.user.id, items: [] }));

    const hasItem = wishlist.items.some((id) => String(id) === productId);
    if (!hasItem) {
      wishlist.items.push(productId);
      await wishlist.save();
    }

    return res.status(201).json({ message: "Added to wishlist" });
  }
);

router.delete(
  "/items/:productId",
  [param("productId").isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ userId: req.user.id });
    if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter((id) => String(id) !== productId);
    await wishlist.save();

    return res.json({ message: "Removed from wishlist" });
  }
);

export default router;
