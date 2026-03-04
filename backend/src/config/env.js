import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminEmails: parseCsv(process.env.ADMIN_EMAILS),
  superAdminEmails: parseCsv(process.env.SUPER_ADMIN_EMAILS),
  managerEmails: parseCsv(process.env.MANAGER_EMAILS),
  supportEmails: parseCsv(process.env.SUPPORT_EMAILS),
};
