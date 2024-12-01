import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import Account from "../models/account.model.js";
import User from "../models/user.model.js";
import LoginAttempt from "../models/loginAttempt.model.js";
import RequestOff from "../models/requestOff.model.js";
import { encrypt } from "./encryption.service.js";
import { getRecaptcha, login } from "./auth.service.js";

dotenv.config();

class TelegramService {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }

    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.initializeCommands();
    this.bot.launch();

    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }

  async generateDateButtons(startDate = new Date()) {
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

      const existingRequest = await this.getExistingRequest(
        this.currentUserId,
        date
      );

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
          `date_${date.toISOString().split("T")[0]}`
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

  generateTimeOptions(selectedDate) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "🌅 Morning (9:00 AM - 12:00 PM)",
          `time_morning_${selectedDate}`
        ),
      ],
      [
        Markup.button.callback(
          "🌇 Afternoon (1:00 PM - 6:00 PM)",
          `time_afternoon_${selectedDate}`
        ),
      ],
      [Markup.button.callback("📅 Full Day", `time_fullday_${selectedDate}`)],
    ]);
  }

  async getUpcomingRequests(userId) {
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

  async generateCancelButtons(userId) {
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

  async checkLoginAttempts(userId) {
    const today = new Date().toISOString().split("T")[0];

    try {
      const loginAttempt = await LoginAttempt.findOne({
        userId,
        date: today,
      });

      if (!loginAttempt) {
        await LoginAttempt.create({
          userId,
          date: today,
          count: 1,
        });
        return true;
      }

      if (loginAttempt.count >= 5) {
        return false;
      }

      await LoginAttempt.updateOne(
        { userId, date: today },
        { $inc: { count: 1 } }
      );
      return true;
    } catch (error) {
      console.error("Error checking login attempts:", error);
      throw error;
    }
  }

  initializeCommands() {
    this.bot.command("start", (ctx) => {
      const username = ctx.from.username || ctx.from.first_name;
      const welcomeMessage = `
Hello ${username}! 👋
I'm a Checkin Management Bot. Use the following commands to interact:

/help - View all commands
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off

🔒 Security Notice:
• Your information is securely encrypted and protected
• We use industry-standard encryption to safeguard your data
• Your credentials are stored in encrypted format only

⚠️ Disclaimer:
• This is a research project
• We are not responsible for any issues that may arise from using this bot
• Use at your own discretion
      `;

      return ctx.reply(welcomeMessage);
    });

    this.bot.command("help", (ctx) => {
      const helpMessage = `
📌 Available Commands:

/start - Start using the bot
/help - View command list
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off

Example: /login example@email.com yourpassword

🔒 Security Information:
• All user data is encrypted using AES-256 encryption
• Your credentials are never stored in plain text
• We prioritize the security of your information

⚠️ Important Notice:
• This bot is created for research purposes only
• We assume no liability for any issues or damages
• By using this bot, you acknowledge these terms

❓ Need help? Contact the administrator for support.
      `;

      return ctx.reply(helpMessage);
    });

    this.bot.command("request_off", async (ctx) => {
      try {
        this.currentUserId = ctx.from.id.toString();
        const dateButtons = await this.generateDateButtons();
        const upcomingDaysOff = await this.getUpcomingDaysOff(
          this.currentUserId
        );

        return ctx.reply(
          `${upcomingDaysOff}\nPlease select a date for your day off request:`,
          Markup.inlineKeyboard(dateButtons)
        );
      } catch (error) {
        console.error("Error sending calendar:", error);
        return ctx.reply("Sorry, there was an error processing your request.");
      }
    });

    this.bot.action(/date_(\d{4}-\d{2}-\d{2})/, async (ctx) => {
      try {
        const selectedDate = ctx.match[1];
        const userId = ctx.from.id.toString();
        const existingRequest = await this.getExistingRequest(
          userId,
          selectedDate
        );

        const formattedDate = new Date(selectedDate).toLocaleDateString(
          "en-GB",
          {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        );

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

        await ctx.editMessageText(
          message,
          this.generateTimeOptions(selectedDate)
        );

        await ctx.answerCbQuery();
      } catch (error) {
        console.error("Error handling date selection:", error);
        return ctx.reply(
          "Sorry, there was an error processing your selection."
        );
      }
    });

    this.bot.action(
      /time_(morning|afternoon|fullday)_(\d{4}-\d{2}-\d{2})/,
      async (ctx) => {
        try {
          const [_, timeOption, selectedDate] = ctx.match;
          const userId = ctx.from.id.toString();

          const timeOffTypeMap = {
            morning: "MORNING",
            afternoon: "AFTERNOON",
            fullday: "FULL_DAY",
          };

          const existingRequest = await this.getExistingRequest(
            userId,
            selectedDate
          );

          if (existingRequest) {
            await RequestOff.findByIdAndUpdate(existingRequest._id, {
              timeOffType: timeOffTypeMap[timeOption],
            });
          } else {
            await RequestOff.create({
              userId,
              dateOff: new Date(selectedDate),
              timeOffType: timeOffTypeMap[timeOption],
            });
          }

          const formattedDate = new Date(selectedDate).toLocaleDateString(
            "en-GB",
            {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            }
          );

          const timeOptionText = {
            morning: "Morning (9:00 AM - 12:00 PM)",
            afternoon: "Afternoon (1:00 PM - 6:00 PM)",
            fullday: "Full Day",
          }[timeOption];

          const upcomingRequestsMessage = await this.getUpcomingRequests(
            userId
          );

          await ctx.editMessageText(
            `✅ Your day off request has been ${
              existingRequest ? "updated" : "submitted"
            } and saved:\n\n` +
              `📅 Date: ${formattedDate}\n` +
              `⏰ Time: ${timeOptionText}\n` +
              `━━━━━━━━━━━━━━━━\n\n` +
              upcomingRequestsMessage,
            { reply_markup: { inline_keyboard: [] } }
          );

          await ctx.answerCbQuery();
        } catch (error) {
          console.error("Error handling time selection:", error);
          return ctx.reply(
            "Sorry, there was an error processing your selection."
          );
        }
      }
    );

    this.bot.command("login", async (ctx) => {
      const message = ctx.message.text;
      const parts = message.split(" ");

      if (parts.length !== 3) {
        return ctx.reply(`❌ Invalid format!

Please use the format: /login email password
Example: /login dongtran@test.com yourpassword`);
      }

      const [_, email, password] = parts;
      const userId = ctx.from.id.toString();
      const userName = ctx.from.username || ctx.from.first_name;

      await ctx.reply(`⏳ Processing your request...

Your login information is being securely processed. Please wait a moment.`);

      try {
        const canLogin = await this.checkLoginAttempts(userId);
        if (!canLogin) {
          throw "You have exceeded the maximum login attempts (5) for today. Please try again tomorrow.";
        }

        const encryptedPassword = encrypt(password);
        const existingAccount = await Account.findOne({ userId });

        if (existingAccount) {
          await Account.updateOne(
            { userId },
            {
              $set: {
                email,
                password: encryptedPassword,
                userName,
              },
            }
          );
        } else {
          await Account.create({
            userId,
            email,
            password: encryptedPassword,
            userName,
          });
        }

        const captchaToken = await getRecaptcha();
        const loginResponse = await login(email, password, captchaToken);

        if (!loginResponse?.refresh_token) {
          throw new Error(
            "The email or password might be incorrect, please check again. If you're sure the information is correct, please contact @dongtranthien"
          );
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          if (existingUser.userId !== userId) {
            throw "This email is already registered with a different user";
          }
          await User.updateOne(
            { email },
            {
              $set: {
                refreshToken: loginResponse.refresh_token,
                status: "activated",
              },
            }
          );
        } else {
          await User.create({
            email,
            userId,
            refreshToken: loginResponse.refresh_token,
            status: "activated",
          });
        }

        return ctx.reply(`✅ Account ${
          existingAccount ? "updated" : "created"
        } successfully!

🕒 Automatic Schedule:
Check-in: 9:15 AM
Check-out: 6:15 PM

🔒 Security Information:
• Your password has been securely encrypted
• All data is stored using AES-256 encryption

✨ You're all set! Just relax and let the bot handle your daily check-ins.`);
      } catch (error) {
        console.error("Login error:", error);
        return ctx.reply(`❌ Error: ${error.message || error}`);
      }
    });

    this.bot.command("cancel_request_off", async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const buttons = await this.generateCancelButtons(userId);

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
    });

    this.bot.action(/cancel_(.+)/, async (ctx) => {
      try {
        const requestId = ctx.match[1];
        const request = await RequestOff.findById(requestId);

        if (!request) {
          return ctx.reply("Sorry, this request was not found.");
        }

        if (request.deletedAt) {
          return ctx.reply("This request has already been cancelled.");
        }

        await RequestOff.findByIdAndUpdate(requestId, {
          deletedAt: new Date(),
        });

        const date = new Date(request.dateOff).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
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
    });
  }

  async getExistingRequest(userId, date) {
    return await RequestOff.findOne({
      userId,
      dateOff: new Date(date),
      deletedAt: null,
    });
  }

  getTimeOffEmoji(timeOffType) {
    const emojis = {
      MORNING: "🌅",
      AFTERNOON: "🌇",
      FULL_DAY: "📅",
    };
    return emojis[timeOffType] || "";
  }
  async getUpcomingDaysOff(userId) {
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

export default new TelegramService();
