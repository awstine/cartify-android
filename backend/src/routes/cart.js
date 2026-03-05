import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Cart } from "../models/Cart.js";
import { Coupon } from "../models/Coupon.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Store } from "../models/Store.js";

const router = Router();
router.use(requireAuth);

const FALLBACK_COUPONS = {
  SAVE10: { discountType: "percent", discountValue: 10, minOrderValue: 0 },
  WELCOME5: { discountType: "fixed", discountValue: 5, minOrderValue: 0 },
  FREESHIP: { discountType: "shipping", discountValue: 0, minOrderValue: 0 },
};

const mapCartResponse = (cart, productsById) =>
  cart.items.map((item) => {
    const product = productsById.get(String(item.productId));
    return {
      productId: String(item.productId),
      quantity: item.quantity,
      product: product
        ? {
            id: String(product._id),
            title: product.title,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            price: product.price,
            storeId: product.storeId?._id ? String(product.storeId._id) : null,
            storeName: product.storeId?.name || "Marketplace",
            storeSlug: product.storeId?.slug || "",
          }
        : null,
    };
  });

router.get("/", async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) return res.json({ items: [] });

  const productIds = cart.items.map((it) => it.productId);
  const products = await Product.find({ _id: { $in: productIds } }).populate("storeId", "name slug");
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  res.json({ items: mapCartResponse(cart, productsById) });
});

router.post(
  "/items",
  [body("productId").isString().notEmpty(), body("quantity").optional().isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const { productId } = req.body;
    const quantity = Number(req.body.quantity || 1);
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "Invalid productId" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cart = (await Cart.findOne({ userId: req.user.id })) || (await Cart.create({ userId: req.user.id, items: [] }));
    const existing = cart.items.find((it) => String(it.productId) === productId);
    if (existing) existing.quantity += quantity;
    else cart.items.push({ productId, quantity });
    await cart.save();

    return res.status(201).json({ message: "Added to cart" });
  }
);

router.patch(
  "/items/:productId",
  [param("productId").isString().notEmpty(), body("quantityDelta").isInt({ min: -99, max: 99 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const { productId } = req.params;
    const { quantityDelta } = req.body;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((it) => String(it.productId) === productId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity += Number(quantityDelta);
    if (item.quantity <= 0) {
      cart.items = cart.items.filter((it) => String(it.productId) !== productId);
    }
    await cart.save();
    return res.json({ message: "Cart updated" });
  }
);

router.delete("/items/:productId", async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  cart.items = cart.items.filter((it) => String(it.productId) !== productId);
  await cart.save();
  return res.json({ message: "Item removed" });
});

router.post("/checkout", async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });
  const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();
  const shippingAddress = req.body?.shippingAddress && typeof req.body.shippingAddress === "object" ? req.body.shippingAddress : {};

  const productIds = cart.items.map((it) => it.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((p) => [String(p._id), p]));
  const storeOwnerById = new Map();
  const orderItems = cart.items
    .map((item) => {
      const product = productsById.get(String(item.productId));
      if (!product) return null;

      return {
        productId: item.productId,
        storeId: product.storeId || null,
        merchantUserId: null,
        title: product.title,
        imageUrl: product.imageUrl,
        price: product.price,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean);
  const groupedByStore = new Map();
  orderItems.forEach((item) => {
    const key = String(item.storeId || "platform");
    const bucket = groupedByStore.get(key) || [];
    bucket.push(item);
    groupedByStore.set(key, bucket);
  });

  const orders = [];
  let coupon = null;
  let globalDiscount = 0;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode });
    const fallbackCoupon = FALLBACK_COUPONS[couponCode];
    const activeCoupon = coupon || fallbackCoupon;
    if (!activeCoupon || (coupon && !coupon.isActive)) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }
    const subtotal = orderItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    if (subtotal < Number(activeCoupon.minOrderValue || 0)) {
      return res.status(400).json({ message: "Order value is below coupon minimum" });
    }
    if (activeCoupon.discountType === "shipping") {
      const shipping = subtotal > 0 ? 6.99 : 0;
      globalDiscount = shipping;
    } else if (activeCoupon.discountType === "percent") {
      globalDiscount = Math.min(subtotal, subtotal * (Number(activeCoupon.discountValue || 0) / 100));
    } else {
      globalDiscount = Math.min(subtotal, Number(activeCoupon.discountValue || 0));
    }
  }

  for (const [storeKey, itemsByStore] of groupedByStore.entries()) {
    const subtotal = itemsByStore.reduce((acc, item) => acc + item.lineTotal, 0);
    const shipping = subtotal > 0 ? 6.99 : 0;
    const tax = subtotal * 0.08;
    const grandSubtotal = orderItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const discount = grandSubtotal > 0 ? (globalDiscount * subtotal) / grandSubtotal : 0;
    const total = Math.max(0, subtotal + shipping + tax - discount);
    let merchantUserId = null;
    if (storeKey !== "platform") {
      if (!storeOwnerById.has(String(storeKey))) {
        const store = await Store.findById(storeKey).select("ownerUserId");
        storeOwnerById.set(String(storeKey), store?.ownerUserId || null);
      }
      merchantUserId = storeOwnerById.get(String(storeKey)) || null;
    }
    const createdOrder = await Order.create({
      userId: req.user.id,
      storeId: storeKey === "platform" ? null : storeKey,
      merchantUserId,
      items: itemsByStore.map((item) => ({ ...item, merchantUserId })),
      subtotal,
      shipping,
      tax,
      discount,
      total,
      couponCode,
      shippingAddress,
      shippingDetails: {
        courier: "",
        trackingNumber: "",
        timeline: [{ label: "Order placed", note: "Order created successfully", at: new Date() }],
      },
    });
    orders.push(createdOrder);
  }

  if (coupon) {
    coupon.usesCount = Number(coupon.usesCount || 0) + 1;
    await coupon.save();
  }

  cart.items = [];
  await cart.save();
  const grandSubtotal = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const grandShipping = orders.reduce((sum, order) => sum + Number(order.shipping || 0), 0);
  const grandTax = orders.reduce((sum, order) => sum + Number(order.tax || 0), 0);
  const grandDiscount = orders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const grandTotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return res.json({
    message: "Checkout complete",
    orderIds: orders.map((order) => String(order._id)),
    summary: { subtotal: grandSubtotal, shipping: grandShipping, tax: grandTax, discount: grandDiscount, total: grandTotal },
  });
});

export default router;
