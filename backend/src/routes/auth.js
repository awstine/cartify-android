import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Store } from "../models/Store.js";
import { env } from "../config/env.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";

const router = Router();

const resolveRoleForEmail = (email, currentRole = "customer") => {
  const normalized = String(email || "").trim().toLowerCase();
  if (env.superAdminEmails.includes(normalized)) return "super_admin";
  if (env.adminEmails.includes(normalized)) return "admin";
  if (env.managerEmails.includes(normalized)) return "manager";
  if (env.supportEmails.includes(normalized)) return "support";
  if (["super_admin", "admin", "manager", "support", "merchant"].includes(currentRole)) return currentRole;
  return "customer";
};

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const generateUniqueStoreSlug = async (name) => {
  const base = toSlug(name) || "store";
  let attempt = base;
  let suffix = 2;
  while (true) {
    const exists = await Store.exists({ slug: attempt });
    if (!exists) return attempt;
    attempt = `${base}-${suffix}`;
    suffix += 1;
  }
};

const issueToken = (user) =>
  jwt.sign({ email: user.email, role: user.role, storeId: user.storeId ? String(user.storeId) : null }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn,
  });

const createMerchantSignupHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const { name, email, password, storeName } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  let createdUser = null;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    createdUser = await User.create({
      name,
      email,
      passwordHash,
      role: "merchant",
      phoneNumber: String(req.body.phoneNumber || "").trim(),
    });

    const store = await Store.create({
      name: String(storeName).trim(),
      slug: await generateUniqueStoreSlug(storeName),
      ownerUserId: createdUser._id,
    });

    createdUser.storeId = store._id;
    await createdUser.save();

    const token = issueToken(createdUser);
    return res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        storeId: String(store._id),
        phoneNumber: createdUser.phoneNumber || "",
        profileImageUrl: createdUser.profileImageUrl || "",
      },
      store: {
        id: String(store._id),
        name: store.name,
        slug: store.slug,
      },
    });
  } catch (error) {
    if (createdUser?._id) {
      await User.deleteOne({ _id: createdUser._id });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Merchant or store already exists with same unique value" });
    }
    throw error;
  }
};

router.post(
  "/signup",
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("phoneNumber").optional().isString().trim().isLength({ min: 7, max: 30 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "customer",
      phoneNumber: String(req.body.phoneNumber || "").trim(),
    });
    await Cart.create({ userId: user._id, items: [] });
    await Wishlist.create({ userId: user._id, items: [] });

    const token = issueToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId ? String(user.storeId) : null,
        phoneNumber: user.phoneNumber || "",
        profileImageUrl: user.profileImageUrl || "",
      },
    });
  }
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").isString().isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const expectedRole = resolveRoleForEmail(user.email, user.role);
    if (user.role !== expectedRole) {
      user.role = expectedRole;
      await user.save();
    }

    const token = issueToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId ? String(user.storeId) : null,
        phoneNumber: user.phoneNumber || "",
        profileImageUrl: user.profileImageUrl || "",
      },
    });
  }
);

router.post(
  "/signup-merchant",
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("storeName").isString().trim().isLength({ min: 2 }),
    body("phoneNumber").optional().isString().trim().isLength({ min: 7, max: 30 }),
  ],
  createMerchantSignupHandler
);

// Route aliases for compatibility with older/frontdoor paths.
router.post(
  "/merchant-signup",
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("storeName").isString().trim().isLength({ min: 2 }),
    body("phoneNumber").optional().isString().trim().isLength({ min: 7, max: 30 }),
  ],
  createMerchantSignupHandler
);

router.post(
  "/signup/merchant",
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("storeName").isString().trim().isLength({ min: 2 }),
    body("phoneNumber").optional().isString().trim().isLength({ min: 7, max: 30 }),
  ],
  createMerchantSignupHandler
);

export default router;
