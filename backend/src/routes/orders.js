import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";
import { Dispute } from "../models/Dispute.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = await Order.findOne({ _id: id, userId: req.user.id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  return res.json(order);
});

router.post(
  "/:id/disputes",
  [body("reason").isString().trim().isLength({ min: 3, max: 200 }), body("message").optional().isString().isLength({ max: 1000 })],
  async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const order = await Order.findOne({ _id: id, userId: req.user.id }).select("_id storeId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const existing = await Dispute.findOne({ orderId: order._id, customerUserId: req.user.id, status: { $in: ["open", "in_review"] } });
    if (existing) return res.status(409).json({ message: "An active dispute already exists for this order" });

    const dispute = await Dispute.create({
      orderId: order._id,
      storeId: order.storeId || null,
      customerUserId: req.user.id,
      reason: String(req.body.reason || "").trim(),
      message: String(req.body.message || "").trim(),
      status: "open",
    });

    res.status(201).json(dispute);
  }
);

router.post(
  "/checkout",
  [
    body("items").isArray({ min: 1 }),
    body("items.*.productId").optional().isString(),
    body("items.*.variantSku").optional().isString(),
    body("items.*.title").isString().trim().notEmpty(),
    body("items.*.imageUrl").optional().isString(),
    body("items.*.price").isFloat({ min: 0 }),
    body("items.*.quantity").isInt({ min: 1 }),
    body("couponCode").optional().isString(),
    body("shippingAddress").optional().isObject(),
    body("shippingAddress.fullName").optional().isString(),
    body("shippingAddress.phone").optional().isString(),
    body("shippingAddress.line1").optional().isString(),
    body("shippingAddress.line2").optional().isString(),
    body("shippingAddress.city").optional().isString(),
    body("shippingAddress.state").optional().isString(),
    body("shippingAddress.postalCode").optional().isString(),
    body("shippingAddress.country").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const stockErrors = [];
    const items = [];
    const stockAdjustments = [];
    const couponCode = String(req.body.couponCode || "").trim().toUpperCase();
    const storeOwnerById = new Map();

    for (const rawItem of req.body.items) {
      const quantity = Number(rawItem.quantity);
      const fallbackPrice = Number(rawItem.price);
      const variantSku = String(rawItem.variantSku || "").trim();
      let resolvedProduct = null;

      if (rawItem.productId && mongoose.Types.ObjectId.isValid(rawItem.productId)) {
        resolvedProduct = await Product.findById(rawItem.productId);
      }
      if (!resolvedProduct && rawItem.title) {
        resolvedProduct = await Product.findOne({ title: String(rawItem.title).trim() });
      }
      if (!resolvedProduct) {
        stockErrors.push(`Product not found: ${rawItem.title}`);
        continue;
      }

      let resolvedPrice = Number(resolvedProduct.price || 0);
      let remainingStock = Number(resolvedProduct.stockQty || 0);

      if (variantSku) {
        const variant = (resolvedProduct.variants || []).find((entry) => entry.sku === variantSku);
        if (!variant) {
          stockErrors.push(`Variant not found for ${resolvedProduct.title}`);
          continue;
        }
        resolvedPrice = Number(variant.price || resolvedProduct.price || fallbackPrice || 0);
        remainingStock = Number(variant.stockQty || 0);
      }

      if (remainingStock < quantity) {
        stockErrors.push(`Insufficient stock for ${resolvedProduct.title}. Available: ${remainingStock}`);
        continue;
      }

      const productStoreId = resolvedProduct.storeId ? String(resolvedProduct.storeId) : null;
      let merchantUserId = null;
      if (productStoreId) {
        if (!storeOwnerById.has(productStoreId)) {
          const store = await Store.findById(productStoreId).select("ownerUserId");
          storeOwnerById.set(productStoreId, store?.ownerUserId ? String(store.ownerUserId) : null);
        }
        merchantUserId = storeOwnerById.get(productStoreId) || null;
      }

      items.push({
        productId: resolvedProduct._id,
        storeId: productStoreId,
        merchantUserId,
        variantSku: variantSku || "",
        title: resolvedProduct.title,
        imageUrl: resolvedProduct.imageUrl || rawItem.imageUrl || "",
        price: resolvedPrice > 0 ? resolvedPrice : fallbackPrice,
        quantity,
        lineTotal: (resolvedPrice > 0 ? resolvedPrice : fallbackPrice) * quantity,
      });

      stockAdjustments.push({
        productId: resolvedProduct._id,
        variantSku: variantSku || "",
        quantity,
      });
    }

    if (stockErrors.length > 0) {
      return res.status(409).json({ message: "Stock check failed", errors: stockErrors });
    }

    const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
    const shipping = subtotal > 0 ? 6.99 : 0;
    const tax = subtotal * 0.08;
    let discount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon || !coupon.isActive) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }
      const now = new Date();
      if (coupon.startsAt && now < coupon.startsAt) return res.status(400).json({ message: "Coupon not started" });
      if (coupon.endsAt && now > coupon.endsAt) return res.status(400).json({ message: "Coupon expired" });
      if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }
      if (subtotal < Number(coupon.minOrderValue || 0)) {
        return res.status(400).json({ message: "Order value is below coupon minimum" });
      }

      discount =
        coupon.discountType === "percent"
          ? Math.min(subtotal, subtotal * (Number(coupon.discountValue || 0) / 100))
          : Math.min(subtotal, Number(coupon.discountValue || 0));
    }

    const total = Math.max(0, subtotal + shipping + tax - discount);

    for (const adjust of stockAdjustments) {
      const product = await Product.findById(adjust.productId);
      if (!product) continue;
      if (adjust.variantSku) {
        const idx = (product.variants || []).findIndex((variant) => variant.sku === adjust.variantSku);
        if (idx >= 0) {
          const existing = Number(product.variants[idx].stockQty || 0);
          product.variants[idx].stockQty = Math.max(0, existing - adjust.quantity);
        }
      } else {
        product.stockQty = Math.max(0, Number(product.stockQty || 0) - adjust.quantity);
      }
      await product.save();
    }

    if (coupon) {
      coupon.usesCount = Number(coupon.usesCount || 0) + 1;
      await coupon.save();
    }

    const groupedByStore = new Map();
    items.forEach((item) => {
      const key = String(item.storeId || "platform");
      const bucket = groupedByStore.get(key) || [];
      bucket.push(item);
      groupedByStore.set(key, bucket);
    });

    const createdOrders = [];
    for (const [storeKey, itemsByStore] of groupedByStore.entries()) {
      const subtotalByStore = itemsByStore.reduce((acc, item) => acc + item.lineTotal, 0);
      const shippingByStore = subtotalByStore > 0 ? 6.99 : 0;
      const taxByStore = subtotalByStore * 0.08;
      const discountByStore = subtotal > 0 ? (discount * subtotalByStore) / subtotal : 0;
      const totalByStore = Math.max(0, subtotalByStore + shippingByStore + taxByStore - discountByStore);

      const order = await Order.create({
        userId: req.user.id,
        storeId: storeKey === "platform" ? null : storeKey,
        merchantUserId: storeKey === "platform" ? null : storeOwnerById.get(String(storeKey)) || null,
        items: itemsByStore,
        subtotal: subtotalByStore,
        shipping: shippingByStore,
        tax: taxByStore,
        discount: discountByStore,
        total: totalByStore,
        couponCode: couponCode || "",
        shippingAddress: req.body.shippingAddress || {},
        shippingDetails: {
          courier: "",
          trackingNumber: "",
          timeline: [{ label: "Order placed", note: "Order created successfully", at: new Date() }],
        },
      });
      createdOrders.push(order);
    }

    const grandSummary = createdOrders.reduce(
      (acc, order) => ({
        subtotal: acc.subtotal + Number(order.subtotal || 0),
        shipping: acc.shipping + Number(order.shipping || 0),
        tax: acc.tax + Number(order.tax || 0),
        discount: acc.discount + Number(order.discount || 0),
        total: acc.total + Number(order.total || 0),
      }),
      { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }
    );

    return res.status(201).json({
      message: "Checkout complete",
      orderIds: createdOrders.map((order) => String(order._id)),
      summary: grandSummary,
    });
  }
);

export default router;
