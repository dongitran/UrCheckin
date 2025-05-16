import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Account from "../models/account.model.js";
import User from "../models/user.model.js";
import Log from "../models/log.model.js";
import { performCheckin } from "../services/checkin.service.js";
import { getAccessToken } from "../services/token.service.js";
import { parse, stringify } from "flatted";

dayjs.extend(utc);
dayjs.extend(timezone);

export const handleCheckin = async (req, res) => {
  try {
    const { email, key } = req.body;

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and key are required",
      });
    }

    const account = await Account.findOne({ email });

    if (!account || account.key !== key) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = await User.findOne({
      userId: account.userId,
      status: "activated",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not activated",
      });
    }

    const nowInVietnam = dayjs().tz("Asia/Ho_Chi_Minh");
    const startTime = nowInVietnam.hour(8).minute(30).second(0);
    const endTime = nowInVietnam.hour(13).minute(45).second(0);

    console.log(`Time now: ${nowInVietnam.format('HH:mm')}`);
    console.log(`Valid time range: ${startTime.format('HH:mm')} - ${endTime.format('HH:mm')}`);

    if (!nowInVietnam.isAfter(startTime) || !nowInVietnam.isBefore(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Checkin is only available between 8:30-13:45 (UTC+7)",
      });
    }

    const todayStart = dayjs().tz("Asia/Ho_Chi_Minh").startOf('day').toDate();

    const existingCheckin = await Log.findOne({
      userId: user._id,
      action: "CHECKIN_COMPLETE",
      status: "SUCCESS",
      timestamp: { $gte: todayStart },
    });

    if (existingCheckin) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today",
      });
    }

    try {
      await Log.create({
        userId: user._id,
        email: user.email,
        action: "CHECKIN_START",
        status: "INFO",
        message: "Starting manual checkin process",
      });

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
        email: user.email,
        action: "CHECKIN_COMPLETE",
        status: "SUCCESS",
        message: "Manual checkin completed successfully",
        extra: {
          checkinResponse,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Checkin successful",
        data: checkinResponse,
      });
    } catch (error) {
      console.error("Checkin error:", error);
      await Log.create({
        userId: user._id,
        email: user.email,
        action: "CHECKIN_ERROR",
        status: "ERROR",
        message: error?.message,
        extra: {
          error: parse(stringify(error)),
        },
      });

      return res.status(500).json({
        success: false,
        message: "Failed to perform checkin",
        error: error?.message,
      });
    }
  } catch (error) {
    console.error("Manual checkin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error?.message,
    });
  }
};