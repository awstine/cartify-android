import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { Store } from "../models/Store.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", async (req, res) => {
  const query = {};
  const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
  if (!includeInactive) {
    query.isActive = true;
  }

  const keyword = String(req.query.q || "").trim();
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { slug: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  const stores = await Store.find(query)
    .select("name slug description logoUrl isActive ownerUserId")
    .sort({ createdAt: -1 });
  res.json(stores);
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("storeId role");
  if (!user?.storeId) return res.status(404).json({ message: "Store not found for this user" });
  const store = await Store.findById(user.storeId);
  if (!store) return res.status(404).json({ message: "Store not found" });
  res.json(store);
});

router.patch(
  "/me",
  requireAuth,
  [
    body("name").optional().isString().trim().isLength({ min: 2 }),
    body("description").optional().isString(),
    body("logoUrl").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const user = await User.findById(req.user.id).select("storeId");
    if (!user?.storeId) return res.status(404).json({ message: "Store not found for this user" });
    const store = await Store.findById(user.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    if (typeof req.body.name === "string") store.name = req.body.name.trim();
    if (typeof req.body.description === "string") store.description = req.body.description;
    if (typeof req.body.logoUrl === "string") store.logoUrl = req.body.logoUrl;

    await store.save();
    res.json(store);
  }
);

export default router;
