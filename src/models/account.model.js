import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      iv: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
    },
    userName: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Account", accountSchema);
