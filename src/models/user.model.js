import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    refreshToken: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
