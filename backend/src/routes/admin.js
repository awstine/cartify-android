import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import {
  requireAdminOrAbove,
  requireManagerOrAbove,
  requireSupportOrAbove,
  requireSuperAdmin,
} from "../middleware/admin.js";
import { AuditLog } from "../models/AuditLog.js";
import { Category } from "../models/Category.js";
import { Coupon } from "../models/Coupon.js";
import { Dispute } from "../models/Dispute.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { SearchEvent } from "../models/SearchEvent.js";
import { Store } from "../models/Store.js";
import { User } from "../models/User.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";
import { logAudit } from "../utils/audit.js";

const router = Router();
router.use(requireSupportOrAbove);

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const getStoreScope = (req, field = "storeId") => {
  const isPlatformAdmin = ["admin", "super_admin"].includes(req.user?.role || "");
  if (isPlatformAdmin) return {};
  if (req.user?.role === "merchant" && !req.user?.storeId) return { [field]: "__no_store__" };
  if (!req.user?.storeId) return {};
  return { [field]: req.user.storeId };
};

const getOrderScope = (req) => {
  const role = req.user?.role || "";
  const isPlatformAdmin = ["admin", "super_admin"].includes(role);
  if (isPlatformAdmin) return {};

  if (role === "merchant") {
    const storeId = req.user?.storeId || null;
    if (storeId) {
      return {
        $or: [
          { storeId },
          { merchantUserId: req.user.id },
        ],
      };
    }
    return { merchantUserId: req.user.id };
  }

  return {};
};

const getPlatformCategoryScope = () => ({ storeId: null });

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeCategoryImageUrl = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const toCategoryParentId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (!mongoose.Types.ObjectId.isValid(value)) return "invalid";
  return new mongoose.Types.ObjectId(value);
};

const generateUniqueCategorySlug = async (name, { excludeId = null, storeId = null } = {}) => {
  const base = toSlug(name) || "category";
  let attempt = base;
  let suffix = 2;
  // Ensure globally unique slugs so product.category (string slug) remains unambiguous.
  while (true) {
    const query = { slug: attempt, storeId: storeId || null };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Category.exists(query);
    if (!exists) return attempt;
    attempt = `${base}-${suffix}`;
    suffix += 1;
  }
};

const isDescendantCategory = async (categoryId, potentialParentId) => {
  let cursorId = potentialParentId;
  while (cursorId) {
    if (String(cursorId) === String(categoryId)) return true;
    const parent = await Category.findById(cursorId).select("parentId");
    if (!parent?.parentId) return false;
    cursorId = parent.parentId;
  }
  return false;
};

const platformOnly = (req, res) => {
  if (!["admin", "super_admin"].includes(req.user?.role || "")) {
    res.status(403).json({ message: "Platform admin access required" });
    return false;
  }
  return true;
};

router.get("/dashboard", async (_req, res) => {
  const storeScope = getStoreScope(_req);
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 13);

  const orderBaseScope = getOrderScope(_req);
  const [productCount, categoryCount, orderCount, userCount, salesAgg, products, orders, trendRows, lowStockProducts] = await Promise.all([
    Product.countDocuments({ ...storeScope }),
    Category.countDocuments({ ...storeScope }),
    Order.countDocuments({ ...orderBaseScope }),
    User.countDocuments(),
    Order.aggregate([{ $match: { ...orderBaseScope } }, { $group: { _id: null, totalSales: { $sum: "$total" } } }]),
    Product.find({ ...storeScope }).select("title costPrice salePrice price stockQty"),
    Order.find({ ...orderBaseScope, status: { $ne: "cancelled" } }).select("items total createdAt"),
    Order.aggregate([
      {
        $match: {
          ...orderBaseScope,
          status: { $ne: "cancelled" },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Product.find({ ...storeScope, stockQty: { $lte: 5 } })
      .sort({ stockQty: 1 })
      .limit(10)
      .select("title stockQty category"),
  ]);

  const costByTitle = new Map(products.map((product) => [product.title, Number(product.costPrice || 0)]));
  const stockValueAtCost = products.reduce((acc, product) => acc + Number(product.stockQty || 0) * Number(product.costPrice || 0), 0);
  const expectedProfitPotential = products.reduce((acc, product) => {
    const sell = Number(product.salePrice || 0) > 0 ? Number(product.salePrice) : Number(product.price || 0);
    return acc + Number(product.stockQty || 0) * Math.max(0, sell - Number(product.costPrice || 0));
  }, 0);

  const realizedProfitFromSales = orders.reduce((acc, order) => {
    const revenue = (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const cost = (order.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(costByTitle.get(item.title) || 0),
      0
    );
    return acc + (revenue - cost);
  }, 0);

  const trendMap = new Map(trendRows.map((row) => [row._id, Number(row.sales || 0)]));
  const salesTrend = [];
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    salesTrend.push({ date: key, sales: Number(trendMap.get(key) || 0) });
  }

  res.json({
    productCount,
    categoryCount,
    orderCount,
    userCount,
    totalSales: Number(salesAgg?.[0]?.totalSales || 0),
    stockValueAtCost: Number(stockValueAtCost || 0),
    expectedProfitPotential: Number(expectedProfitPotential || 0),
    realizedProfitFromSales: Number(realizedProfitFromSales || 0),
    salesTrend,
    lowStockProducts,
  });
});

router.get("/growth", async (req, res) => {
  const orderScope = getOrderScope(req);
  const storeScope = getStoreScope(req);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);

  const createdScope = {
    ...(storeScope.storeId ? { storeId: storeScope.storeId } : {}),
    createdAt: { $gte: start },
  };

  const [sessionEvents, orders, customers, wishlistAdds, products] = await Promise.all([
    SearchEvent.find({ createdAt: { $gte: start } }).select("createdAt"),
    Order.find({ ...orderScope, createdAt: { $gte: start } }).select("createdAt total status"),
    User.countDocuments({ role: "customer" }),
    Wishlist.find({}).select("items"),
    Product.countDocuments({ ...storeScope }),
  ]);

  const sessions = sessionEvents.length;
  const placedOrders = orders.length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;
  const conversionRate = sessions > 0 ? (placedOrders / sessions) * 100 : 0;
  const fulfillmentRate = placedOrders > 0 ? (deliveredOrders / placedOrders) * 100 : 0;
  const avgOrderValue = placedOrders > 0 ? orders.reduce((sum, item) => sum + Number(item.total || 0), 0) / placedOrders : 0;
  const wishlistIntent = wishlistAdds.reduce((sum, item) => sum + Number(item.items?.length || 0), 0);

  const dailyEngagementMap = new Map();
  for (let index = 0; index < 30; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    dailyEngagementMap.set(key, { date: key, sessions: 0, orders: 0 });
  }

  sessionEvents.forEach((event) => {
    const key = new Date(event.createdAt).toISOString().slice(0, 10);
    const current = dailyEngagementMap.get(key);
    if (current) current.sessions += 1;
  });
  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const current = dailyEngagementMap.get(key);
    if (current) current.orders += 1;
  });

  res.json({
    funnel: {
      sessions,
      productCount: products,
      wishlistIntent,
      placedOrders,
      deliveredOrders,
      conversionRate,
      fulfillmentRate,
      avgOrderValue,
    },
    engagement: [...dailyEngagementMap.values()],
    totals: {
      customers,
    },
  });
});

router.get("/profile", async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role createdAt");
  if (!user) return res.status(404).json({ message: "Admin not found" });
  res.json(user);
});

router.patch(
  "/profile",
  [
    body("name").optional().isString().trim().isLength({ min: 2, max: 80 }),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });

    if (typeof req.body.name === "string") user.name = req.body.name.trim();
    if (typeof req.body.email === "string") {
      const email = req.body.email.trim().toLowerCase();
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) return res.status(409).json({ message: "Email already in use" });
      user.email = email;
    }

    await user.save();
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  }
);

router.patch(
  "/profile/password",
  [
    body("currentPassword").isString().isLength({ min: 6 }),
    body("newPassword").isString().isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });

    const isValid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();

    res.json({ message: "Password updated successfully" });
  }
);

router.get("/products", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...getStoreScope(req) };

  if (req.query.category) query.category = String(req.query.category);
  if (req.query.search) {
    query.title = { $regex: String(req.query.search), $options: "i" };
  }
  if (req.query.stock === "out") {
    query.stockQty = 0;
  } else if (req.query.stock === "low") {
    query.stockQty = { $gt: 0, $lte: 5 };
  } else if (req.query.stock === "in") {
    query.stockQty = { $gt: 0 };
  }

  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

router.post(
  "/products",
  requireManagerOrAbove,
  [
    body("title").isString().trim().isLength({ min: 2 }),
    body("description").optional().isString(),
    body("category").optional().isString(),
    body("imageUrl").optional().isString(),
    body("images").optional().isArray({ max: 4 }),
    body("images.*").optional().isString(),
    body("costPrice").optional().isFloat({ min: 0 }),
    body("salePrice").optional().isFloat({ min: 0 }),
    body("stockQty").optional().isInt({ min: 0 }),
    body("status").optional().isString().isIn(["active", "draft"]),
    body("sizes").optional().isArray({ max: 30 }),
    body("sizes.*").optional().isString().trim().isLength({ min: 1, max: 20 }),
    body("variants").optional().isArray(),
    body("variants.*.sku").optional().isString(),
    body("variants.*.size").optional().isString(),
    body("variants.*.color").optional().isString(),
    body("variants.*.price").optional().isFloat({ min: 0 }),
    body("variants.*.stockQty").optional().isInt({ min: 0 }),
    body("price").isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const storeScope = getStoreScope(req);
    const requestedCategory = String(req.body.category || "general").trim() || "general";
    const categoryExists = await Category.exists({ slug: requestedCategory, ...getPlatformCategoryScope() });
    if (!categoryExists && requestedCategory !== "general") {
      return res.status(400).json({ message: "Invalid category. Use a platform category created by super admin." });
    }
    const images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean).slice(0, 4) : [];
    const sizes = Array.isArray(req.body.sizes)
      ? req.body.sizes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 30)
      : [];
    const imageUrl = req.body.imageUrl || images[0] || "";

    const product = await Product.create({
      storeId: storeScope.storeId || null,
      title: req.body.title.trim(),
      description: req.body.description || "",
      category: categoryExists ? requestedCategory : "general",
      imageUrl,
      images,
      costPrice: Number(req.body.costPrice || 0),
      salePrice: Number(req.body.salePrice || 0),
      stockQty: Number(req.body.stockQty || 0),
      status: req.body.status || "active",
      sizes,
      variants: Array.isArray(req.body.variants) ? req.body.variants : [],
      price: Number(req.body.price),
    });

    await logAudit(req, "product.create", "Product", product.id, {
      title: product.title,
      category: product.category,
      price: product.price,
    });

    res.status(201).json(product);
  }
);

router.put(
  "/products/:id",
  requireManagerOrAbove,
  [
    body("title").optional().isString().trim().isLength({ min: 2 }),
    body("description").optional().isString(),
    body("category").optional().isString(),
    body("imageUrl").optional().isString(),
    body("images").optional().isArray({ max: 4 }),
    body("images.*").optional().isString(),
    body("costPrice").optional().isFloat({ min: 0 }),
    body("salePrice").optional().isFloat({ min: 0 }),
    body("stockQty").optional().isInt({ min: 0 }),
    body("status").optional().isString().isIn(["active", "draft"]),
    body("sizes").optional().isArray({ max: 30 }),
    body("sizes.*").optional().isString().trim().isLength({ min: 1, max: 20 }),
    body("variants").optional().isArray(),
    body("variants.*.sku").optional().isString(),
    body("variants.*.size").optional().isString(),
    body("variants.*.color").optional().isString(),
    body("variants.*.price").optional().isFloat({ min: 0 }),
    body("variants.*.stockQty").optional().isInt({ min: 0 }),
    body("price").optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const storeScope = getStoreScope(req);
    const updates = {};
    const {
      title,
      description,
      category,
      imageUrl,
      images,
      price,
      costPrice,
      salePrice,
      stockQty,
      status,
      sizes,
      variants,
    } =
      req.body;

    if (typeof title === "string") updates.title = title.trim();
    if (typeof description === "string") updates.description = description;
    if (typeof category === "string") {
      const requestedCategory = category.trim() || "general";
      const categoryExists = await Category.exists({ slug: requestedCategory, ...getPlatformCategoryScope() });
      if (!categoryExists && requestedCategory !== "general") {
        return res.status(400).json({ message: "Invalid category. Use a platform category created by super admin." });
      }
      updates.category = categoryExists ? requestedCategory : "general";
    }
    if (typeof imageUrl === "string") updates.imageUrl = imageUrl;
    if (Array.isArray(images)) {
      const normalized = images.filter(Boolean).slice(0, 4);
      updates.images = normalized;
      if (!updates.imageUrl) updates.imageUrl = normalized[0] || "";
    }
    if (price !== undefined) updates.price = Number(price);
    if (costPrice !== undefined) updates.costPrice = Number(costPrice);
    if (salePrice !== undefined) updates.salePrice = Number(salePrice);
    if (stockQty !== undefined) updates.stockQty = Number(stockQty);
    if (typeof status === "string") updates.status = status;
    if (Array.isArray(sizes)) {
      updates.sizes = sizes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 30);
    }
    if (Array.isArray(variants)) updates.variants = variants;

    const product = await Product.findOneAndUpdate({ _id: req.params.id, ...storeScope }, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    await logAudit(req, "product.update", "Product", product.id, {
      title: product.title,
      category: product.category,
      price: product.price,
    });

    res.json(product);
  }
);

router.delete("/products/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const deleted = await Product.findOneAndDelete({ _id: req.params.id, ...getStoreScope(req) });
  if (!deleted) return res.status(404).json({ message: "Product not found" });

  await logAudit(req, "product.delete", "Product", deleted.id, { title: deleted.title });

  res.json({ message: "Product deleted" });
});

router.get("/categories", async (_req, res) => {
  const categories = await Category.find({ ...getPlatformCategoryScope() }).populate("parentId", "name slug").sort({ name: 1 });
  res.json(categories);
});

router.post(
  "/categories",
  requireAdminOrAbove,
  [
    body("name").isString().trim().isLength({ min: 2 }),
    body("description").optional().isString(),
    body("imageUrl").optional().isString(),
    body("parentId").optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const name = req.body.name.trim();
    const parentId = toCategoryParentId(req.body.parentId);
    if (parentId === "invalid") {
      return res.status(400).json({ message: "Invalid parent category id" });
    }
    if (parentId) {
      const parent = await Category.findOne({ _id: parentId, ...getPlatformCategoryScope() }).select("_id");
      if (!parent) return res.status(404).json({ message: "Parent category not found" });
    }

    const slug = await generateUniqueCategorySlug(name, { storeId: null });
    const category = await Category.create({
      name,
      slug,
      description: req.body.description || "",
      imageUrl: normalizeCategoryImageUrl(req.body.imageUrl),
      storeId: null,
      parentId: parentId || null,
    });
    await logAudit(req, "category.create", "Category", category.id, {
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ? String(category.parentId) : null,
    });
    res.status(201).json(category);
  }
);

router.put(
  "/categories/:id",
  requireAdminOrAbove,
  [
    body("name").optional().isString().trim().isLength({ min: 2 }),
    body("description").optional().isString(),
    body("imageUrl").optional().isString(),
    body("parentId").optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const existingCategory = await Category.findOne({ _id: req.params.id, ...getPlatformCategoryScope() });
    if (!existingCategory) return res.status(404).json({ message: "Category not found" });

    const updates = {};
    if (typeof req.body.description === "string") updates.description = req.body.description;
    if (typeof req.body.imageUrl === "string") updates.imageUrl = normalizeCategoryImageUrl(req.body.imageUrl);
    if (req.body.parentId !== undefined) {
      const parentId = toCategoryParentId(req.body.parentId);
      if (parentId === "invalid") {
        return res.status(400).json({ message: "Invalid parent category id" });
      }
      if (parentId && String(parentId) === String(req.params.id)) {
        return res.status(400).json({ message: "A category cannot be its own parent" });
      }
      if (parentId) {
        const parent = await Category.findOne({ _id: parentId, ...getPlatformCategoryScope() }).select("_id");
        if (!parent) return res.status(404).json({ message: "Parent category not found" });
        const wouldCreateCycle = await isDescendantCategory(req.params.id, parentId);
        if (wouldCreateCycle) {
          return res.status(400).json({ message: "Invalid parent relationship" });
        }
      }
      updates.parentId = parentId || null;
    }

    let oldSlug = existingCategory.slug;
    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      const slug = await generateUniqueCategorySlug(name, {
        excludeId: req.params.id,
        storeId: null,
      });
      updates.name = name;
      updates.slug = slug;
    }

    const category = await Category.findOneAndUpdate({ _id: req.params.id, ...getPlatformCategoryScope() }, updates, {
      new: true,
      runValidators: true,
    });
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (updates.slug && oldSlug !== updates.slug) {
      await Product.updateMany({ category: oldSlug }, { $set: { category: updates.slug } });
    }

    await logAudit(req, "category.update", "Category", category.id, {
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ? String(category.parentId) : null,
    });

    res.json(category);
  }
);

router.delete("/categories/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const category = await Category.findOneAndDelete({ _id: req.params.id, ...getPlatformCategoryScope() });
  if (!category) return res.status(404).json({ message: "Category not found" });

  await Category.updateMany({ parentId: category._id, ...getPlatformCategoryScope() }, { $set: { parentId: null } });
  await Product.updateMany({ category: category.slug }, { $set: { category: "general" } });
  await logAudit(req, "category.delete", "Category", category.id, { name: category.name, slug: category.slug });
  res.json({ message: "Category deleted" });
});

router.get("/orders", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...getOrderScope(req) };
  if (req.query.status) query.status = String(req.query.status);

  const [items, total] = await Promise.all([
    Order.find(query).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

router.get("/orders/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = await Order.findOne({ _id: req.params.id, ...getOrderScope(req) }).populate("userId", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

router.patch(
  "/orders/:id/status",
  requireManagerOrAbove,
  [
    body("status")
      .isString()
      .isIn(["placed", "processing", "shipped", "delivered", "cancelled"]),
  ],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, ...getOrderScope(req) },
      { status: req.body.status },
      { new: true, runValidators: true }
    ).populate("userId", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });
    await logAudit(req, "order.status.update", "Order", order.id, {
      status: order.status,
      customerEmail: order.userId?.email || "",
    });
    res.json(order);
  }
);

router.patch(
  "/orders/:id/shipping",
  requireManagerOrAbove,
  [
    body("courier").optional().isString(),
    body("trackingNumber").optional().isString(),
    body("eta").optional().isISO8601(),
    body("event").optional().isObject(),
    body("event.label").optional().isString(),
    body("event.note").optional().isString(),
  ],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const order = await Order.findOne({ _id: req.params.id, ...getOrderScope(req) }).populate("userId", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.shippingDetails = order.shippingDetails || {};
    if (typeof req.body.courier === "string") order.shippingDetails.courier = req.body.courier;
    if (typeof req.body.trackingNumber === "string") order.shippingDetails.trackingNumber = req.body.trackingNumber;
    if (req.body.eta) order.shippingDetails.eta = new Date(req.body.eta);
    if (req.body.event?.label) {
      order.shippingDetails.timeline = order.shippingDetails.timeline || [];
      order.shippingDetails.timeline.push({
        label: req.body.event.label,
        note: req.body.event.note || "",
        at: new Date(),
      });
    }

    await order.save();
    await logAudit(req, "order.shipping.update", "Order", order.id, {
      courier: order.shippingDetails?.courier || "",
      trackingNumber: order.shippingDetails?.trackingNumber || "",
    });
    res.json(order);
  }
);

router.get("/users", async (req, res) => {
  const storeScope = getStoreScope(req);
  if (storeScope.storeId) {
    return res.status(403).json({ message: "User directory is only available to platform admins" });
  }
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.query.search) {
    const pattern = String(req.query.search);
    query.$or = [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }];
  }
  if (req.query.scope === "customers") {
    query.role = "customer";
  } else if (req.query.scope === "system") {
    query.role = { $in: ["support", "manager", "admin", "super_admin"] };
  }
  if (req.query.role) {
    query.role = String(req.query.role);
  }

  const [items, total] = await Promise.all([
    User.find(query).select("name email role createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

router.get("/merchants", requireAdminOrAbove, async (req, res) => {
  if (!platformOnly(req, res)) return;
  const { page, limit, skip } = parsePagination(req.query);
  const query = { role: "merchant", storeId: { $ne: null } };
  if (req.query.search) {
    const pattern = String(req.query.search);
    query.$or = [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }];
  }

  const [items, total] = await Promise.all([
    User.find(query).select("name email role storeId createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  const storeIds = items.map((item) => item.storeId).filter(Boolean);
  const stores = await Store.find({ _id: { $in: storeIds } }).select("name slug description logoUrl isActive ownerUserId");
  const storeMap = new Map(stores.map((store) => [String(store._id), store]));
  const enriched = items.map((item) => ({
    ...item.toObject(),
    store: item.storeId ? storeMap.get(String(item.storeId)) || null : null,
  }));

  res.json({ items: enriched, total, page, limit });
});

router.post(
  "/merchants",
  requireAdminOrAbove,
  [
    body("name").isString().trim().isLength({ min: 2, max: 80 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 6 }),
    body("storeName").isString().trim().isLength({ min: 2, max: 120 }),
    body("storeLogoUrl").optional().isString(),
    body("storeDescription").optional().isString(),
  ],
  async (req, res) => {
    if (!platformOnly(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const email = String(req.body.email).trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    let createdUser = null;
    try {
      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const storeSlugBase = toSlug(req.body.storeName) || "store";
      let storeSlug = storeSlugBase;
      let suffix = 2;
      while (await Store.exists({ slug: storeSlug })) {
        storeSlug = `${storeSlugBase}-${suffix}`;
        suffix += 1;
      }

      createdUser = await User.create({
        name: String(req.body.name).trim(),
        email,
        passwordHash,
        role: "merchant",
      });
      const store = await Store.create({
        name: String(req.body.storeName).trim(),
        slug: storeSlug,
        ownerUserId: createdUser._id,
        logoUrl: String(req.body.storeLogoUrl || "").trim(),
        description: String(req.body.storeDescription || "").trim(),
        isActive: true,
      });
      createdUser.storeId = store._id;
      await createdUser.save();

      await logAudit(req, "merchant.create", "User", createdUser.id, { email: createdUser.email, storeId: String(store._id) });
      res.status(201).json({
        user: { id: createdUser.id, name: createdUser.name, email: createdUser.email, role: createdUser.role, storeId: String(store._id) },
        store,
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
  }
);

router.patch(
  "/merchants/:id",
  requireAdminOrAbove,
  [
    body("isActive").optional().isBoolean(),
    body("storeName").optional().isString().trim().isLength({ min: 2, max: 120 }),
    body("storeLogoUrl").optional().isString(),
    body("storeDescription").optional().isString(),
  ],
  async (req, res) => {
    if (!platformOnly(req, res)) return;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid merchant id" });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const merchant = await User.findOne({ _id: req.params.id, role: "merchant" }).select("name email role storeId");
    if (!merchant?.storeId) return res.status(404).json({ message: "Merchant not found" });

    const store = await Store.findById(merchant.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    if (req.body.isActive !== undefined) store.isActive = Boolean(req.body.isActive);
    if (typeof req.body.storeName === "string") store.name = req.body.storeName.trim();
    if (typeof req.body.storeLogoUrl === "string") store.logoUrl = req.body.storeLogoUrl.trim();
    if (typeof req.body.storeDescription === "string") store.description = req.body.storeDescription;
    await store.save();

    await logAudit(req, "merchant.update", "Store", store.id, {
      isActive: store.isActive,
      storeName: store.name,
      hasLogo: Boolean(store.logoUrl),
    });
    res.json({ merchant, store });
  }
);

router.get("/disputes", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...getStoreScope(req) };
  if (req.query.status) query.status = String(req.query.status);

  const [items, total] = await Promise.all([
    Dispute.find(query)
      .populate("orderId", "_id total status")
      .populate("customerUserId", "name email")
      .populate("merchantUserId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Dispute.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

router.patch(
  "/disputes/:id",
  [body("status").optional().isString().isIn(["open", "in_review", "resolved", "rejected"]), body("resolutionNote").optional().isString()],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid dispute id" });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const dispute = await Dispute.findOne({ _id: req.params.id, ...getStoreScope(req) });
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });

    if (typeof req.body.status === "string") dispute.status = req.body.status;
    if (typeof req.body.resolutionNote === "string") dispute.resolutionNote = req.body.resolutionNote;
    if (["resolved", "rejected"].includes(dispute.status)) {
      dispute.resolvedByUserId = req.user.id;
      dispute.resolvedAt = new Date();
    }
    await dispute.save();

    await logAudit(req, "dispute.update", "Dispute", dispute.id, { status: dispute.status });
    res.json(dispute);
  }
);

router.post(
  "/users",
  requireAdminOrAbove,
  [
    body("name").isString().trim().isLength({ min: 2, max: 80 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 6 }),
    body("role").optional().isString().isIn(["customer", "support", "manager", "admin", "super_admin"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const email = String(req.body.email).trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const role = req.body.role || "customer";
    const user = await User.create({
      name: String(req.body.name).trim(),
      email,
      passwordHash,
      role,
    });

    if (role === "customer") {
      await Cart.create({ userId: user._id, items: [] });
      await Wishlist.create({ userId: user._id, items: [] });
    }

    await logAudit(req, "user.create", "User", user.id, {
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  }
);

router.patch(
  "/users/:id/role",
  requireAdminOrAbove,
  [body("role").isString().isIn(["customer", "support", "manager", "admin", "super_admin"])],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousRole = user.role;
    user.role = req.body.role;
    await user.save();

    if (user.role === "customer") {
      await Cart.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id, items: [] } }, { upsert: true, new: true });
      await Wishlist.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id, items: [] } }, { upsert: true, new: true });
    }

    await logAudit(req, "user.role.update", "User", user.id, {
      previousRole,
      nextRole: user.role,
      email: user.email,
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  }
);

router.delete("/users/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  const targetUser = await User.findById(req.params.id).select("role");
  if (!targetUser) return res.status(404).json({ message: "User not found" });
  if (targetUser.role === "super_admin") {
    return res.status(403).json({ message: "Super admin accounts cannot be deleted." });
  }

  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "User not found" });

  await Promise.all([
    Cart.findOneAndDelete({ userId: deleted._id }),
    Wishlist.findOneAndDelete({ userId: deleted._id }),
  ]);

  await logAudit(req, "user.delete", "User", deleted.id, {
    email: deleted.email,
    role: deleted.role,
  });

  res.json({ message: "User deleted" });
});

router.get("/sales", async (req, res) => {
  const match = { ...getOrderScope(req) };
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(String(req.query.from));
    if (req.query.to) match.createdAt.$lte = new Date(String(req.query.to));
  }

  const [summaryAgg, byStatusAgg, topProductsAgg] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          grossSales: { $sum: "$total" },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: "$status", value: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.title",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const summary = summaryAgg[0] || { orderCount: 0, grossSales: 0, avgOrderValue: 0 };

  res.json({
    summary: {
      orderCount: Number(summary.orderCount || 0),
      grossSales: Number(summary.grossSales || 0),
      avgOrderValue: Number(summary.avgOrderValue || 0),
    },
    byStatus: byStatusAgg,
    topProducts: topProductsAgg.map((item) => ({
      title: item._id,
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || 0),
    })),
  });
});

router.get("/sales/export.csv", async (req, res) => {
  const match = { ...getOrderScope(req) };
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(String(req.query.from));
    if (req.query.to) match.createdAt.$lte = new Date(String(req.query.to));
  }

  const orders = await Order.find(match).sort({ createdAt: -1 }).limit(2000);
  const header = "orderId,createdAt,status,subtotal,shipping,tax,discount,total,couponCode\n";
  const rows = orders
    .map((order) =>
      [
        order.id,
        new Date(order.createdAt).toISOString(),
        order.status,
        Number(order.subtotal || 0),
        Number(order.shipping || 0),
        Number(order.tax || 0),
        Number(order.discount || 0),
        Number(order.total || 0),
        `"${String(order.couponCode || "").replace(/"/g, '""')}"`,
      ].join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"sales-report.csv\"");
  res.send(header + rows);
});

router.get("/sales/export.pdf", async (req, res) => {
  const match = { ...getOrderScope(req) };
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(String(req.query.from));
    if (req.query.to) match.createdAt.$lte = new Date(String(req.query.to));
  }

  const orders = await Order.find(match).sort({ createdAt: -1 }).limit(500);
  const grossSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalDiscount = orders.reduce((sum, order) => sum + Number(order.discount || 0), 0);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"sales-report.pdf\"");

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text("Cartify Sales Report", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
  doc.text(`Orders: ${orders.length}`);
  doc.text(`Gross Sales: ${grossSales.toFixed(2)}`);
  doc.text(`Total Discounts: ${totalDiscount.toFixed(2)}`);
  doc.moveDown();
  doc.fontSize(12).text("Recent Orders", { underline: true });
  doc.moveDown(0.5);
  orders.slice(0, 30).forEach((order) => {
    doc
      .fontSize(10)
      .text(
        `${order.id} | ${new Date(order.createdAt).toLocaleDateString()} | ${order.status} | Total: ${Number(
          order.total || 0
        ).toFixed(2)}`
      );
  });
  doc.end();
});

router.get("/coupons", async (_req, res) => {
  const coupons = await Coupon.find({ ...getStoreScope(_req) }).sort({ createdAt: -1 });
  res.json(coupons);
});

router.post(
  "/coupons",
  requireManagerOrAbove,
  [
    body("code").isString().trim().isLength({ min: 3 }),
    body("description").optional().isString(),
    body("discountType").isString().isIn(["percent", "fixed"]),
    body("discountValue").isFloat({ min: 0 }),
    body("minOrderValue").optional().isFloat({ min: 0 }),
    body("startsAt").optional().isISO8601(),
    body("endsAt").optional().isISO8601(),
    body("maxUses").optional().isInt({ min: 1 }),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const storeScope = getStoreScope(req);
    const code = String(req.body.code).trim().toUpperCase();
    const exists = await Coupon.findOne({ code, ...storeScope });
    if (exists) return res.status(409).json({ message: "Coupon code already exists" });

    const coupon = await Coupon.create({
      storeId: storeScope.storeId || null,
      code,
      description: req.body.description || "",
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue || 0),
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
      maxUses: req.body.maxUses !== undefined ? Number(req.body.maxUses) : undefined,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
    });

    await logAudit(req, "coupon.create", "Coupon", coupon.id, { code: coupon.code });
    res.status(201).json(coupon);
  }
);

router.put(
  "/coupons/:id",
  requireManagerOrAbove,
  [
    body("description").optional().isString(),
    body("discountType").optional().isString().isIn(["percent", "fixed"]),
    body("discountValue").optional().isFloat({ min: 0 }),
    body("minOrderValue").optional().isFloat({ min: 0 }),
    body("startsAt").optional().isISO8601(),
    body("endsAt").optional().isISO8601(),
    body("maxUses").optional().isInt({ min: 1 }),
    body("isActive").optional().isBoolean(),
  ],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid coupon id" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }
    const updates = {};
    const keys = [
      "description",
      "discountType",
      "discountValue",
      "minOrderValue",
      "maxUses",
      "isActive",
    ];
    keys.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    if (req.body.startsAt) updates.startsAt = new Date(req.body.startsAt);
    if (req.body.endsAt) updates.endsAt = new Date(req.body.endsAt);

    const coupon = await Coupon.findOneAndUpdate({ _id: req.params.id, ...getStoreScope(req) }, updates, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    await logAudit(req, "coupon.update", "Coupon", coupon.id, { code: coupon.code });
    res.json(coupon);
  }
);

router.delete("/coupons/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid coupon id" });
  }
  const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, ...getStoreScope(req) });
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  await logAudit(req, "coupon.delete", "Coupon", coupon.id, { code: coupon.code });
  res.json({ message: "Coupon deleted" });
});

router.get("/audit-logs", requireAdminOrAbove, async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.query.action) query.action = String(req.query.action);
  if (req.query.entityType) query.entityType = String(req.query.entityType);
  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query),
  ]);
  res.json({ items, total, page, limit });
});

export default router;
