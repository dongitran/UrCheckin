import RequestOff from "../models/requestOff.model.js";

export const startHandler = (ctx) => {
  const username = ctx.from.username || ctx.from.first_name;
  const welcomeMessage = `
Hello ${username}! 👋

🤖 I'm UrCheckin Bot - your automated check-in/out assistant for work. I help you:
• Automatically handle daily check-in (9:15 AM) and check-out (6:15 PM)
• Manage your time-off requests easily

📌 Available Commands:
/start - Start using the bot
/help - View all commands
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off
/my_days_off - View your days off schedule
/cancel_request_off - Cancel an upcoming time-off request

🔒 Security Notice:
• All user data is encrypted using AES-256 encryption

⚠️ Disclaimer:
• This is a research project
• We are not responsible for any issues that may arise from using this bot
• By using this bot, you acknowledge these terms

❓ Need help? Contact @dongtranthien for support.
  `;

  return ctx.reply(welcomeMessage);
};

export const helpHandler = (ctx) => {
  const helpMessage = `
📌 Available Commands:

/start - Start using the bot
/help - View command list
/login <email> <password> - Login with your credentials
/request_off - Select a date to request off
/my_days_off - View your days off schedule
/cancel_request_off - Cancel an upcoming time-off request

Example: /login example@email.com yourpassword

⏰ Automatic Check-in Schedule:
• Check-in: ~9:15 AM
• Check-out: ~6:15 PM

🔒 Security Information:
• All user data is encrypted using AES-256 encryption

⚠️ Disclaimer:
• This is a research project
• We are not responsible for any issues that may arise from using this bot
• By using this bot, you acknowledge these terms

❓ Need help? Contact @dongtranthien for support.
  `;

  return ctx.reply(helpMessage);
};

export const listRequestsHandler = async (ctx, telegramService) => {
  try {
    const userId = ctx.from.id.toString();
    const requests = await RequestOff.find({
      userId,
      deletedAt: null,
    }).sort({ dateOff: 1 });

    if (requests.length === 0) {
      return ctx.reply("📅 You don't have any days off scheduled.");
    }

    const formatRequest = (request) => {
      const weekday = new Date(request.dateOff).toLocaleDateString("en-GB", {
        weekday: "long",
      });

      const day = new Date(request.dateOff)
        .getDate()
        .toString()
        .padStart(2, "0");
      const month = (new Date(request.dateOff).getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const year = new Date(request.dateOff).getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      const timeText = {
        MORNING: "Morning (9:00 AM - 12:00 PM)",
        AFTERNOON: "Afternoon (1:00 PM - 6:00 PM)",
        FULL_DAY: "Full Day",
      }[request.timeOffType];

      const icon = {
        MORNING: "🌅",
        AFTERNOON: "🌇",
        FULL_DAY: "📅",
      }[request.timeOffType];

      return (
        `${icon} Date: ${weekday}, ${formattedDate}\n` +
        `⏰ Time: ${timeText}\n` +
        `━━━━━━━━━━━━━━━━`
      );
    };

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const upcomingRequests = requests.filter((r) => r.dateOff >= currentDate);
    const pastRequests = requests.filter((r) => r.dateOff < currentDate);

    let message = "🗓️ Your Days Off Schedule\n" + "━━━━━━━━━━━━━━━━━━━━━\n\n";

    if (upcomingRequests.length > 0) {
      message += "📌 UPCOMING DAYS OFF\n\n";
      message += upcomingRequests.map(formatRequest).join("\n\n");
    }

    if (pastRequests.length > 0) {
      if (upcomingRequests.length > 0) {
        message += "\n\n";
      }
      message += "📜 PAST DAYS OFF\n\n";
      message += pastRequests.map(formatRequest).join("\n\n");
    }

    return ctx.reply(message);
  } catch (error) {
    console.error("Error listing requests:", error);
    return ctx.reply(
      "❌ Sorry, there was an error retrieving your days off schedule."
    );
  }
};
