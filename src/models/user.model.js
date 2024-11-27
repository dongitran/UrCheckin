import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: true,
      default: "activated",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
