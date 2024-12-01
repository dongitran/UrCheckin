import { Markup } from "telegraf";
import RequestOff from "../models/requestOff.model.js";

export class RequestService {
  static async getExistingRequest(userId, date) {
    return await RequestOff.findOne({
      userId,
      dateOff: new Date(date),
      deletedAt: null,
    });
  }

  static async generateDateButtons(userId, sessionId, startDate = new Date()) {
    const buttons = [];
    const dateRow = [];

    for (let i = 0; i < 15; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const formattedDate = date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });

      const existingRequest = await this.getExistingRequest(userId, date);

      let displayText = formattedDate;
      if (existingRequest) {
        const timeOffText = {
          MORNING: "(Morning)",
          AFTERNOON: "(Afternoon)",
          FULL_DAY: "(Full Day)",
        }[existingRequest.timeOffType];
        displayText = `${formattedDate} ${timeOffText}`;
      }

      dateRow.push(
        Markup.button.callback(
          displayText,
          `date_${sessionId}_${date.toISOString().split("T")[0]}`
        )
      );

      if (dateRow.length === 3 || i === 14) {
        buttons.push([...dateRow]);
        dateRow.length = 0;
      }
    }
    buttons.push([...dateRow]);
    return buttons;
  }

  static generateTimeOptions(sessionId, selectedDate) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "🌅 Morning (9:00 AM - 12:00 PM)",
          `time_${sessionId}_morning_${selectedDate}`
        ),
      ],
      [
        Markup.button.callback(
          "🌇 Afternoon (1:00 PM - 6:00 PM)",
          `time_${sessionId}_afternoon_${selectedDate}`
        ),
      ],
      [
        Markup.button.callback(
          "📅 Full Day",
          `time_${sessionId}_fullday_${selectedDate}`
        ),
      ],
    ]);
  }

  static async getUpcomingRequests(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRequests = await RequestOff.find({
      userId,
      dateOff: { $gte: today },
      deletedAt: null,
    }).sort({ dateOff: 1 });

    if (upcomingRequests.length === 0) {
      return "You have no upcoming time-off requests.";
    }

    const formatRequest = (request) => {
      const date = new Date(request.dateOff).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const timeText = {
        MORNING: "Morning (9:00 AM - 12:00 PM)",
        AFTERNOON: "Afternoon (1:00 PM - 6:00 PM)",
        FULL_DAY: "Full Day",
      }[request.timeOffType];

      return `📅 ${date} - ${timeText}`;
    };

    return (
      "📋 Your upcoming time-off requests:\n\n" +
      upcomingRequests.map(formatRequest).join("\n\n")
    );
  }

  static async generateCancelButtons(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requests = await RequestOff.find({
      userId,
      dateOff: { $gte: today },
      deletedAt: null,
    }).sort({ dateOff: 1 });

    const buttons = [];
    for (const request of requests) {
      const date = new Date(request.dateOff).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });

      const timeText = {
        MORNING: "Morning",
        AFTERNOON: "Afternoon",
        FULL_DAY: "Full Day",
      }[request.timeOffType];

      buttons.push([
        Markup.button.callback(
          `${date} - ${timeText}`,
          `cancel_${request._id}`
        ),
      ]);
    }

    return buttons;
  }

  static async getUpcomingDaysOff(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRequests = await RequestOff.find({
      userId,
      dateOff: { $gte: today },
      deletedAt: null,
    }).sort({ dateOff: 1 });

    if (upcomingRequests.length === 0) {
      return "You have no upcoming days off.";
    }

    const timeOffTexts = {
      MORNING: "Morning (9:00 AM - 12:00 PM)",
      AFTERNOON: "Afternoon (1:00 PM - 6:00 PM)",
      FULL_DAY: "Full Day",
    };

    const upcomingText = upcomingRequests
      .map((request) => {
        const date = new Date(request.dateOff).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        });
        return `• ${date}: ${timeOffTexts[request.timeOffType]}`;
      })
      .join("\n");

    return `📋 Your upcoming days off:\n${upcomingText}\n`;
  }
}
