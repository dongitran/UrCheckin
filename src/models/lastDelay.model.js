import mongoose from "mongoose";

const lastDelaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    checkTime: {
      type: String,
      required: true,
      enum: ["9:15", "11:55", "13:10", "18:10"],
    },
    delay: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

lastDelaySchema.index({ date: 1, checkTime: 1 });

export default mongoose.model("LastDelay", lastDelaySchema);
