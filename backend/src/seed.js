import { connectMongo } from "./config/mongo.js";
import { Product } from "./models/Product.js";

const sampleProducts = [
  {
    title: "Classic White Sneakers",
    description: "Minimal premium sneakers for everyday wear.",
    category: "mens-shoes",
    imageUrl: "https://picsum.photos/seed/cartify1/480/480",
    price: 49.99,
  },
  {
    title: "Lavender Hoodie",
    description: "Soft unisex hoodie with a modern cut.",
    category: "tops",
    imageUrl: "https://picsum.photos/seed/cartify2/480/480",
    price: 39.5,
  },
  {
    title: "Smart Watch Pro",
    description: "Lightweight smartwatch with health tracking.",
    category: "smartphones",
    imageUrl: "https://picsum.photos/seed/cartify3/480/480",
    price: 129.0,
  },
];

async function run() {
  await connectMongo();
  await Product.deleteMany({});
  await Product.insertMany(sampleProducts);
  console.log("Seed complete");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
