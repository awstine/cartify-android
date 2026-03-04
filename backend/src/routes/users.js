import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Wishlist } from "../models/Wishlist.js";

const router = Router();
router.use(requireAuth);

const mapUserProfile = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber || "",
  profileImageUrl: user.profileImageUrl || "",
  preferences: {
    notificationsEnabled: user.preferences?.notificationsEnabled ?? true,
    darkModeEnabled: user.preferences?.darkModeEnabled ?? false,
  },
  createdAt: user.createdAt,
});

router.get("/me", async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json(mapUserProfile(user));
});

router.patch(
  "/me",
  [
    body("name").optional().isString().trim().isLength({ min: 2, max: 80 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("phoneNumber").optional().isString().trim().isLength({ min: 7, max: 30 }),
    body("profileImageUrl").optional().isString(),
    body("preferences").optional().isObject(),
    body("preferences.notificationsEnabled").optional().isBoolean(),
    body("preferences.darkModeEnabled").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, phoneNumber, profileImageUrl, preferences } = req.body;
    if (typeof name === "string") user.name = name.trim();
    if (typeof phoneNumber === "string") user.phoneNumber = phoneNumber.trim();
    if (typeof profileImageUrl === "string") user.profileImageUrl = profileImageUrl.trim();

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) return res.status(409).json({ message: "Email already in use" });
      user.email = normalizedEmail;
    }

    if (preferences && typeof preferences === "object") {
      user.preferences = {
        notificationsEnabled: preferences.notificationsEnabled ?? user.preferences?.notificationsEnabled ?? true,
        darkModeEnabled: preferences.darkModeEnabled ?? user.preferences?.darkModeEnabled ?? false,
      };
    }

    await user.save();
    return res.json(mapUserProfile(user));
  }
);

router.delete("/me", async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  await Promise.all([
    Cart.deleteOne({ userId }),
    Wishlist.deleteOne({ userId }),
    Order.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);

  return res.json({ message: "Account deleted" });
});

export default router;
