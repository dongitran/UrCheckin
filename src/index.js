import cron from "node-cron";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { parse, stringify } from "flatted";
import connectDB from "./config/database.js";
import User from "./models/user.model.js";
import Log from "./models/log.model.js";
import RequestOff from "./models/requestOff.model.js";
import { getAccessToken } from "./services/token.service.js";
import { performCheckin } from "./services/checkin.service.js";
import telegramService from "./services/telegram.service.js";

dotenv.config();

try {
  telegramService;
} catch (error) {
  console.error("errorInitTelegram", error);
}

async function shouldProcessUser(user, timeOffRequests, checkTime) {
  const userTimeOff = timeOffRequests.find(
    (request) => request.userId === user.userId
  );

  if (!userTimeOff) {
    switch (checkTime) {
      case "9:15":
      case "18:10":
        return true;
      default:
        return false;
    }
  }

  switch (checkTime) {
    case "9:15":
      return userTimeOff.timeOffType === "AFTERNOON";
    case "11:55":
      return userTimeOff.timeOffType === "AFTERNOON";
    case "13:10":
      return userTimeOff.timeOffType === "MORNING";
    case "18:10":
      return userTimeOff.timeOffType === "MORNING";
    default:
      return false;
  }
}

async function processCheckin(checkTime) {
  try {
    const users = await User.find({ status: "activated" });

    const today = new Date().toISOString().split("T")[0];

    const timeOffRequests = await RequestOff.find({
      dateOff: new Date(today),
      deletedAt: null,
    });

    for (const user of users) {
      if (!(await shouldProcessUser(user, timeOffRequests, checkTime))) {
        await Log.create({
          userId: user._id,
          action: "CHECKIN_SKIP",
          status: "INFO",
          message: `Skipping checkin for user at ${checkTime} due to time off schedule`,
        });
        continue;
      }

      await Log.create({
        userId: user._id,
        action: "CHECKIN_START",
        status: "INFO",
        message: `Starting checkin process at ${checkTime}`,
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
          message: `Checkin completed successfully at ${checkTime}`,
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

cron.schedule("0 15 9 * * 1-5", () => processCheckin("9:15"), {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("0 55 11 * * 1-5", () => processCheckin("11:55"), {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("0 10 13 * * 1-5", () => processCheckin("13:10"), {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

cron.schedule("0 10 18 * * 1-5", () => processCheckin("18:10"), {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

console.log("UrCheckin started");
