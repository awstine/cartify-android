import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { Wishlist } from "../models/Wishlist.js";

const router = Router();
router.use(requireAuth);

const toWishlistItem = (entry) => {
  if (!entry) return null;
  if (mongoose.Types.ObjectId.isValid(String(entry))) {
    return {
      productId: entry,
      alerts: { priceDrop: false, backInStock: false },
      lastKnownPrice: 0,
      lastKnownInStock: true,
    };
  }
  return {
    productId: entry.productId,
    alerts: {
      priceDrop: Boolean(entry.alerts?.priceDrop),
      backInStock: Boolean(entry.alerts?.backInStock),
    },
    lastKnownPrice: Number(entry.lastKnownPrice || 0),
    lastKnownInStock: entry.lastKnownInStock ?? true,
  };
};

const normalizeWishlistItems = (items) =>
  (items || []).map(toWishlistItem).filter((entry) => entry?.productId);

const mapWishlistResponse = (wishlist, productsById, storesById) =>
  normalizeWishlistItems(wishlist.items).map((item) => {
    const product = productsById.get(String(item.productId));
    const store = product?.storeId ? storesById.get(String(product.storeId)) : null;
    const resolvedPrice = Number(product?.salePrice > 0 ? product?.salePrice : product?.price || 0);
    const inStock = Number(product?.stockQty || 0) > 0;
    const priceDropped = Number(item.lastKnownPrice || 0) > 0 && resolvedPrice < Number(item.lastKnownPrice || 0);
    const backInStock = item.lastKnownInStock === false && inStock;
    return {
      productId: String(item.productId),
      alerts: {
        priceDrop: Boolean(item.alerts?.priceDrop),
        backInStock: Boolean(item.alerts?.backInStock),
      },
      alertState: {
        priceDropped,
        backInStock,
      },
      product: product
        ? {
            id: String(product._id),
            title: product.title,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            price: resolvedPrice,
            stockQty: Number(product.stockQty || 0),
            storeId: product.storeId ? String(product.storeId) : null,
            storeName: store?.name || "Marketplace",
            storeSlug: store?.slug || "",
          }
        : null,
    };
  });

router.get("/", async (req, res) => {
  const wishlist =
    (await Wishlist.findOne({ userId: req.user.id })) ||
    (await Wishlist.create({ userId: req.user.id, items: [] }));

  wishlist.items = normalizeWishlistItems(wishlist.items);
  const productIds = wishlist.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));
  const storeIds = products.map((product) => product.storeId).filter(Boolean);
  const stores = await Store.find({ _id: { $in: storeIds } }).select("name slug");
  const storesById = new Map(stores.map((store) => [String(store._id), store]));
  const productById = new Map(products.map((product) => [String(product._id), product]));

  wishlist.items = wishlist.items.map((item) => {
    const product = productById.get(String(item.productId));
    if (!product) return item;
    const livePrice = Number(product.salePrice > 0 ? product.salePrice : product.price || 0);
    const liveInStock = Number(product.stockQty || 0) > 0;
    return {
      ...item,
      lastKnownPrice: livePrice,
      lastKnownInStock: liveInStock,
    };
  });
  await wishlist.save();

  res.json({ items: mapWishlistResponse(wishlist, productsById, storesById) });
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

    wishlist.items = normalizeWishlistItems(wishlist.items);
    const hasItem = wishlist.items.some((item) => String(item.productId) === productId);
    if (!hasItem) {
      wishlist.items.push({
        productId,
        alerts: { priceDrop: false, backInStock: false },
        lastKnownPrice: Number(product.salePrice > 0 ? product.salePrice : product.price || 0),
        lastKnownInStock: Number(product.stockQty || 0) > 0,
      });
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

    wishlist.items = normalizeWishlistItems(wishlist.items).filter((item) => String(item.productId) !== productId);
    await wishlist.save();

    return res.json({ message: "Removed from wishlist" });
  }
);

router.patch(
  "/items/:productId/alerts",
  [
    param("productId").isString().notEmpty(),
    body("priceDrop").optional().isBoolean(),
    body("backInStock").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ userId: req.user.id });
    if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = normalizeWishlistItems(wishlist.items);
    const item = wishlist.items.find((entry) => String(entry.productId) === productId);
    if (!item) return res.status(404).json({ message: "Wishlist item not found" });

    if (typeof req.body.priceDrop === "boolean") item.alerts.priceDrop = req.body.priceDrop;
    if (typeof req.body.backInStock === "boolean") item.alerts.backInStock = req.body.backInStock;
    await wishlist.save();

    return res.json({ message: "Wishlist alerts updated" });
  }
);

export default router;
