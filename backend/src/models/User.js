import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "merchant", "support", "manager", "admin", "super_admin"],
      default: "customer",
      index: true,
    },
    profileImageUrl: { type: String, default: "" },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    preferences: {
      notificationsEnabled: { type: Boolean, default: true },
      darkModeEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
