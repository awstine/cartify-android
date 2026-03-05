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
      lowDataModeEnabled: { type: Boolean, default: false },
    },
    addresses: {
      type: [
        new mongoose.Schema(
          {
            label: { type: String, default: "Home" },
            fullName: { type: String, default: "" },
            phone: { type: String, default: "" },
            line1: { type: String, default: "" },
            line2: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            postalCode: { type: String, default: "" },
            country: { type: String, default: "" },
            isDefault: { type: Boolean, default: false },
          },
          { _id: true }
        ),
      ],
      default: [],
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
