import mongoose from "mongoose";

const requestSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["SELECTING_DATE", "SELECTING_TIME"],
      default: "SELECTING_DATE",
    },
    selectedDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RequestSession", requestSessionSchema);
