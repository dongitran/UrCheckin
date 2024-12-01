import mongoose from "mongoose";

const requestOffSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    dateOff: {
      type: Date,
      required: true,
    },
    timeOffType: {
      type: String,
      enum: ["MORNING", "AFTERNOON", "FULL_DAY"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RequestOff", requestOffSchema);
