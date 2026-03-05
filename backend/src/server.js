import cors from "cors";
import express from "express";
import { connectMongo } from "./config/mongo.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import wishlistRoutes from "./routes/wishlist.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import storeRoutes from "./routes/stores.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cartify-backend" });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "cartify-backend",
    message: "Backend is running",
    health: "/health",
    apiBase: "/api",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stores", storeRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

connectMongo()
  .then(() => {
    const maxPortTries = env.nodeEnv === "development" ? 10 : 1;
    const startServer = (port, triesLeft) => {
      const server = app.listen(port, () => {
        console.log(`Cartify backend listening on http://localhost:${port}`);
      });

      server.on("error", (error) => {
        if (error.code === "EADDRINUSE" && triesLeft > 1) {
          const nextPort = port + 1;
          console.warn(
            `Port ${port} is already in use. Retrying on port ${nextPort}...`,
          );
          startServer(nextPort, triesLeft - 1);
          return;
        }

        console.error(`Failed to start server on port ${port}`, error);
        process.exit(1);
      });
    };

    startServer(env.port, maxPortTries);
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
