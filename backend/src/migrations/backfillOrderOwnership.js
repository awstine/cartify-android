import mongoose from "mongoose";
import { connectMongo } from "../config/mongo.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Store } from "../models/Store.js";

const asKey = (value) => (value ? String(value) : "");

async function run() {
  await connectMongo();

  const stores = await Store.find({}).select("_id ownerUserId");
  const storeOwnerById = new Map(
    stores.map((store) => [asKey(store._id), store.ownerUserId ? String(store.ownerUserId) : null])
  );

  const orders = await Order.find({
    $or: [
      { merchantUserId: null },
      { merchantUserId: { $exists: false } },
      { "items.storeId": null },
      { "items.storeId": { $exists: false } },
      { "items.merchantUserId": null },
      { "items.merchantUserId": { $exists: false } },
    ],
  }).select("_id storeId merchantUserId items");

  let updatedOrders = 0;

  for (const order of orders) {
    let changed = false;
    const itemProductIds = (order.items || [])
      .map((item) => item.productId)
      .filter(Boolean)
      .map((id) => asKey(id));

    const productStoreById = new Map();
    if (itemProductIds.length > 0) {
      const products = await Product.find({ _id: { $in: itemProductIds } }).select("_id storeId");
      products.forEach((product) => {
        productStoreById.set(asKey(product._id), product.storeId ? asKey(product.storeId) : null);
      });
    }

    for (const item of order.items || []) {
      if (!item.storeId && item.productId) {
        const inferredStoreId = productStoreById.get(asKey(item.productId)) || null;
        if (inferredStoreId) {
          item.storeId = inferredStoreId;
          changed = true;
        }
      }

      if (!item.merchantUserId && item.storeId) {
        const ownerUserId = storeOwnerById.get(asKey(item.storeId)) || null;
        if (ownerUserId) {
          item.merchantUserId = ownerUserId;
          changed = true;
        }
      }
    }

    if (!order.storeId) {
      const inferredStoreId = (order.items || []).find((item) => item.storeId)?.storeId || null;
      if (inferredStoreId) {
        order.storeId = inferredStoreId;
        changed = true;
      }
    }

    if (!order.merchantUserId && order.storeId) {
      const ownerUserId = storeOwnerById.get(asKey(order.storeId)) || null;
      if (ownerUserId) {
        order.merchantUserId = ownerUserId;
        changed = true;
      }
    }

    if (changed) {
      await order.save();
      updatedOrders += 1;
    }
  }

  console.log(`Order ownership backfill complete. Updated orders: ${updatedOrders}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Order ownership backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});

