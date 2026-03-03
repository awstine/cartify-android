import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo() {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("MongoDB connected");
}
