import crypto from "crypto";
import { Markup } from "telegraf";
import RequestSession from "../models/requestSession.model.js";
import RequestOff from "../models/requestOff.model.js";
import User from "../models/user.model.js";
import { getAccessToken } from "../services/token.service.js";
import { getInfo } from "../services/info.service.js";
import { getSysInfo } from "../services/getSysInfo.js";
import { getGroupsRequest } from "../services/getGroupsRequest.js";
import { requestTimeOff } from "../services/requestOff.js";
import { removeTimeOff } from "../services/removeRequest.js";
import { TIME_OFF_TYPE } from "../utils/constants.js";

export class RequestOffHandler {
  static async handleRequestOff(ctx, telegramService) {
    try {
      const userId = ctx.from.id.toString();
      const sessionId = crypto.randomUUID();

      await RequestSession.deleteMany({ userId });
      await RequestSession.create({
        userId,
        sessionId,
        status: "SELECTING_DATE",
      });

      const dateButtons = await telegramService.generateDateButtons(
        userId,
        sessionId
      );
      const upcomingDaysOff = await telegramService.getUpcomingDaysOff(userId);

      return ctx.reply(
        `${upcomingDaysOff}\nPlease select a date for your day off request:`,
        Markup.inlineKeyboard(dateButtons)
      );
    } catch (error) {
      console.error("Error sending calendar:", error);
      return ctx.reply("Sorry, there was an error processing your request.");
    }
  }

  static async handleDateSelection(ctx, telegramService) {
    try {
      const [_, sessionId, selectedDate] = ctx.match;
      const userId = ctx.from.id.toString();

      const session = await RequestSession.findOne({ userId, sessionId });
      if (!session || session.status !== "SELECTING_DATE") {
        return ctx.reply(
          "Your session has expired. Please start a new request with /request_off"
        );
      }

      const existingRequest = await telegramService.getExistingRequest(
        userId,
        selectedDate
      );

      const formattedDate = new Date(selectedDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      });

      let message = `📅 Selected date: ${formattedDate}\n\n`;
      if (existingRequest) {
        const timeText = {
          MORNING: "Morning (9:00 AM - 12:00 PM)",
          AFTERNOON: "Afternoon (1:00 PM - 6:00 PM)",
          FULL_DAY: "Full Day",
        }[existingRequest.timeOffType];

        message += `⚠️ You already have a request for ${timeText}\nSelecting a new option will update your existing request.\n\n`;
      }
      message += "Please select time option:";

      await RequestSession.findOneAndUpdate(
        { userId, sessionId },
        {
          status: "SELECTING_TIME",
          selectedDate: new Date(selectedDate),
        }
      );

      await ctx.editMessageText(
        message,
        telegramService.generateTimeOptions(sessionId, selectedDate)
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling date selection:", error);
      return ctx.reply("Sorry, there was an error processing your selection.");
    }
  }

  static async handleTimeSelection(ctx, telegramService) {
    try {
      const [_, sessionId, timeOption, selectedDate] = ctx.match;
      const userId = ctx.from.id.toString();

      const session = await RequestSession.findOne({
        userId,
        sessionId,
        status: "SELECTING_TIME",
      });

      if (!session) {
        return ctx.reply(
          "Your session has expired. Please start a new request with /request_off"
        );
      }

      const existingRequest = await telegramService.getExistingRequest(
        userId,
        selectedDate
      );

      const user = await User.findOne({ userId, status: "activated" });
      const { accessToken } = await getAccessToken(user.refreshToken);

      if (existingRequest) {
        await removeTimeOff(accessToken, existingRequest.requestId);
      }

      /*
      const sysInfo = await getSysInfo(accessToken);
      const userName = sysInfo?.viewer?.name;
      const manager = sysInfo?.viewer?.manager[0];
      if (!userName || !manager) {
        return ctx.reply(
          "❌ Error creating time-off request. Please contact @dongtranthien for assistance."
        );
      }
      
      const groupsRequest = await getGroupsRequest(accessToken);
      const group = groupsRequest?.groups.find(
        (item) => String(item.id) === process.env.OFF_REQUEST_ID
      );
      const followers = group?.followers?.map((item) => item.username);
      const [year, month, day] = selectedDate.split("-");
      const dateRequest = `${day}/${month}/${year}`;
      const requestOffResult = await requestTimeOff(
        accessToken,
        `${userName}-${dateRequest}-Xin OFF phép`,
        followers.join(" @"),
        manager,
        dateRequest,
        TIME_OFF_TYPE[timeOption],
        process.env.OFF_REQUEST_ID
      );
      const requestId = requestOffResult?.timeoff?.id;
      */

      if (existingRequest) {
        await RequestOff.findByIdAndUpdate(existingRequest._id, {
          timeOffType: TIME_OFF_TYPE[timeOption],
          //requestId,
        });
      } else {
        await RequestOff.create({
          userId,
          //requestId,
          dateOff: new Date(selectedDate),
          timeOffType: TIME_OFF_TYPE[timeOption],
        });
      }

      await RequestSession.deleteOne({ userId, sessionId });

      const timeOptionText = {
        morning: "Morning (9:00 AM - 12:00 PM)",
        afternoon: "Afternoon (1:00 PM - 6:00 PM)",
        fullday: "Full Day",
      }[timeOption];

      const upcomingRequestsMessage = await telegramService.getUpcomingRequests(
        userId
      );

      await ctx.editMessageText(
        `✅ Your day off request has been ${
          existingRequest ? "updated" : "submitted"
        } and saved:\n\n` +
          `📅 Date: ${selectedDate}\n` +
          `⏰ Time: ${timeOptionText}\n` +
          `━━━━━━━━━━━━━━━━\n\n` +
          upcomingRequestsMessage,
        { reply_markup: { inline_keyboard: [] } }
      );

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling time selection:", error);
      return ctx.reply("Sorry, there was an error processing your selection.");
    }
  }

  static async handleCancelRequest(ctx, telegramService) {
    try {
      const userId = ctx.from.id.toString();
      const buttons = await telegramService.generateCancelButtons(userId);

      if (buttons.length === 0) {
        return ctx.reply(
          "You don't have any active time-off requests to cancel."
        );
      }

      return ctx.reply(
        "Select the time-off request you want to cancel:",
        Markup.inlineKeyboard(buttons)
      );
    } catch (error) {
      console.error("Error showing cancel options:", error);
      return ctx.reply("Sorry, there was an error processing your request.");
    }
  }

  static async handleCancelAction(ctx, telegramService) {
    try {
      const requestId = ctx.match[1];
      const request = await RequestOff.findById(requestId);

      if (!request) {
        return ctx.reply("Sorry, this request was not found.");
      }

      if (request.deletedAt) {
        return ctx.reply("This request has already been cancelled.");
      }

      const user = await User.findOne({
        userId: request.userId,
        status: "activated",
      });
      const { accessToken } = await getAccessToken(user.refreshToken);
      await removeTimeOff(accessToken, request.requestId);

      await RequestOff.findByIdAndUpdate(requestId, {
        deletedAt: new Date(),
      });

      const date = new Date(request.dateOff).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      });

      const timeText = {
        MORNING: "Morning (9:00 AM - 12:00 PM)",
        AFTERNOON: "Afternoon (1:00 PM - 6:00 PM)",
        FULL_DAY: "Full Day",
      }[request.timeOffType];

      await ctx.editMessageText(
        `✅ Your time-off request has been cancelled:\n\n` +
          `📅 Date: ${date}\n` +
          `⏰ Time: ${timeText}\n\n` +
          `You can use /request_off to create a new request.`,
        { reply_markup: { inline_keyboard: [] } }
      );

      await ctx.answerCbQuery("Request cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling request:", error);
      return ctx.reply("Sorry, there was an error cancelling your request.");
    }
  }
}
