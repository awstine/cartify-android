import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";

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
  "/checkout",
  [
    body("items").isArray({ min: 1 }),
    body("items.*.title").isString().trim().notEmpty(),
    body("items.*.imageUrl").optional().isString(),
    body("items.*.price").isFloat({ min: 0 }),
    body("items.*.quantity").isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const items = req.body.items.map((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      return {
        title: item.title,
        imageUrl: item.imageUrl || "",
        price,
        quantity,
        lineTotal: price * quantity,
      };
    });

    const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
    const shipping = subtotal > 0 ? 6.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const order = await Order.create({
      userId: req.user.id,
      items,
      subtotal,
      shipping,
      tax,
      total,
    });

    return res.status(201).json({
      message: "Checkout complete",
      orderId: String(order._id),
      summary: { subtotal, shipping, tax, total },
    });
  }
);

export default router;
