import mongoose from "mongoose";

const commandLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  command: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  metadata: {
    username: String,
    firstName: String,
    lastName: String,
    extra: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model("CommandLog", commandLogSchema);
