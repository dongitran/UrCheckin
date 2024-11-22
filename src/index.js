import cron from "node-cron";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { parse, stringify } from "flatted";
import connectDB from "./config/database.js";
import User from "./models/user.model.js";
import Log from "./models/log.model.js";
import { getAccessToken } from "./services/token.service.js";
import { performCheckin } from "./services/checkin.service.js";

dotenv.config();

async function processCheckin() {
  try {
    const users = await User.find({ status: "activated" });

    for (const user of users) {
      await Log.create({
        userId: user._id,
        action: "CHECKIN_START",
        status: "INFO",
        message: "Starting checkin process",
      });

      try {
        const { accessToken, refreshToken } = await getAccessToken(
          user.refreshToken
        );
        const checkinResponse = await performCheckin(accessToken);

        await User.updateOne(
          { _id: new mongoose.Types.ObjectId(user._id) },
          { $set: { refreshToken } }
        );

        await Log.create({
          userId: user._id,
          action: "CHECKIN_COMPLETE",
          status: "SUCCESS",
          message: "Checkin completed successfully",
          extra: {
            checkinResponse,
          },
        });
      } catch (error) {
        console.log(error, "errorerror");
        await Log.create({
          userId: user._id,
          action: "CHECKIN_ERROR",
          status: "ERROR",
          message: error?.message,
          extra: {
            error: parse(stringify(error)),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error in checkin process:", error);
  }
}

connectDB();

cron.schedule("0 45 9,18 * * *", processCheckin, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

console.log("UrCheckin started");
