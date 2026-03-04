import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import {
  requireAdminOrAbove,
  requireManagerOrAbove,
  requireSupportOrAbove,
} from "../middleware/admin.js";
import { AuditLog } from "../models/AuditLog.js";
import { Category } from "../models/Category.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { logAudit } from "../utils/audit.js";

const router = Router();
router.use(requireSupportOrAbove);

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

router.get("/dashboard", async (_req, res) => {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 13);

  const [productCount, categoryCount, orderCount, userCount, salesAgg, products, orders, trendRows, lowStockProducts] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Order.countDocuments(),
    User.countDocuments(),
    Order.aggregate([{ $group: { _id: null, totalSales: { $sum: "$total" } } }]),
    Product.find().select("title costPrice salePrice price stockQty"),
    Order.find({ status: { $ne: "cancelled" } }).select("items total createdAt"),
    Order.aggregate([
      {
        $match: {
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
    Product.find({ stockQty: { $lte: 5 } })
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
  const query = {};

  if (req.query.category) query.category = String(req.query.category);
  if (req.query.search) {
    query.title = { $regex: String(req.query.search), $options: "i" };
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

    const images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean).slice(0, 4) : [];
    const imageUrl = req.body.imageUrl || images[0] || "";

    const product = await Product.create({
      title: req.body.title.trim(),
      description: req.body.description || "",
      category: req.body.category || "general",
      imageUrl,
      images,
      costPrice: Number(req.body.costPrice || 0),
      salePrice: Number(req.body.salePrice || 0),
      stockQty: Number(req.body.stockQty || 0),
      status: req.body.status || "active",
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
      variants,
    } =
      req.body;

    if (typeof title === "string") updates.title = title.trim();
    if (typeof description === "string") updates.description = description;
    if (typeof category === "string") updates.category = category;
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
    if (Array.isArray(variants)) updates.variants = variants;

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
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

  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Product not found" });

  await logAudit(req, "product.delete", "Product", deleted.id, { title: deleted.title });

  res.json({ message: "Product deleted" });
});

router.get("/categories", async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

router.post(
  "/categories",
  requireManagerOrAbove,
  [body("name").isString().trim().isLength({ min: 2 }), body("description").optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const name = req.body.name.trim();
    const slug = toSlug(name);
    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) return res.status(409).json({ message: "Category already exists" });

    const category = await Category.create({ name, slug, description: req.body.description || "" });
    await logAudit(req, "category.create", "Category", category.id, { name: category.name, slug: category.slug });
    res.status(201).json(category);
  }
);

router.put(
  "/categories/:id",
  requireManagerOrAbove,
  [body("name").optional().isString().trim().isLength({ min: 2 }), body("description").optional().isString()],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const updates = {};
    if (typeof req.body.description === "string") updates.description = req.body.description;
    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      const slug = toSlug(name);
      const existing = await Category.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name }, { slug }],
      });
      if (existing) return res.status(409).json({ message: "Category already exists" });

      updates.name = name;
      updates.slug = slug;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    await logAudit(req, "category.update", "Category", category.id, { name: category.name, slug: category.slug });

    res.json(category);
  }
);

router.delete("/categories/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });

  await Product.updateMany({ category: category.slug }, { $set: { category: "general" } });
  await logAudit(req, "category.delete", "Category", category.id, { name: category.name, slug: category.slug });
  res.json({ message: "Category deleted" });
});

router.get("/orders", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.query.status) query.status = String(req.query.status);

  const [items, total] = await Promise.all([
    Order.find(query).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
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

    const order = await Order.findByIdAndUpdate(
      req.params.id,
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

    const order = await Order.findById(req.params.id).populate("userId", "name email");
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
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (req.query.search) {
    const pattern = String(req.query.search);
    query.$or = [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }];
  }

  const [items, total] = await Promise.all([
    User.find(query).select("name email role createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

router.get("/sales", async (req, res) => {
  const match = {};
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
  const match = {};
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
  const match = {};
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
  const coupons = await Coupon.find().sort({ createdAt: -1 });
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

    const code = String(req.body.code).trim().toUpperCase();
    const exists = await Coupon.findOne({ code });
    if (exists) return res.status(409).json({ message: "Coupon code already exists" });

    const coupon = await Coupon.create({
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

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    await logAudit(req, "coupon.update", "Coupon", coupon.id, { code: coupon.code });
    res.json(coupon);
  }
);

router.delete("/coupons/:id", requireAdminOrAbove, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid coupon id" });
  }
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
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
