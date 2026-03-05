import mongoose from "mongoose";
import { connectMongo } from "../config/mongo.js";
import { Category } from "../models/Category.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";
import { User } from "../models/User.js";

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensureUniqueStoreSlug = async (name) => {
  const base = toSlug(name) || "store";
  let slug = base;
  let suffix = 2;
  while (await Store.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
};

async function run() {
  await connectMongo();
  const platformOwner =
    (await User.findOne({ role: { $in: ["super_admin", "admin"] } }).select("_id")) ||
    (await User.findOne().select("_id"));
  if (!platformOwner?._id) {
    throw new Error("No user found in database to own the legacy marketplace store");
  }

  let defaultStore = await Store.findOne({ slug: "legacy-marketplace" });
  if (!defaultStore) {
    defaultStore = await Store.create({
      name: "Legacy Marketplace",
      slug: "legacy-marketplace",
      ownerUserId: platformOwner._id,
      description: "Default store for legacy records migrated before multi-tenant split.",
      isActive: true,
    });
  }

  const merchants = await User.find({ role: "merchant", $or: [{ storeId: null }, { storeId: { $exists: false } }] });
  for (const merchant of merchants) {
    const storeName = `${merchant.name || merchant.email || "Merchant"} Store`;
    const store = await Store.create({
      name: storeName,
      slug: await ensureUniqueStoreSlug(storeName),
      ownerUserId: merchant._id,
      isActive: true,
    });
    merchant.storeId = store._id;
    await merchant.save();
  }

  const fallbackStoreId = defaultStore._id;

  await Product.updateMany(
    { $or: [{ storeId: null }, { storeId: { $exists: false } }] },
    { $set: { storeId: fallbackStoreId } }
  );
  await Category.updateMany(
    { $or: [{ storeId: null }, { storeId: { $exists: false } }] },
    { $set: { storeId: fallbackStoreId } }
  );
  await Coupon.updateMany(
    { $or: [{ storeId: null }, { storeId: { $exists: false } }] },
    { $set: { storeId: fallbackStoreId } }
  );

  const ordersWithoutStore = await Order.find({ $or: [{ storeId: null }, { storeId: { $exists: false } }] }).select("_id items");
  for (const order of ordersWithoutStore) {
    const firstItemStoreId = order.items?.find((item) => item.storeId)?.storeId || null;
    order.storeId = firstItemStoreId || fallbackStoreId;
    await order.save();
  }

  await Product.syncIndexes();
  await Category.syncIndexes();
  await Coupon.syncIndexes();
  await Order.syncIndexes();
  await User.syncIndexes();
  await Store.syncIndexes();

  console.log("Multi-tenant migration complete");
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
