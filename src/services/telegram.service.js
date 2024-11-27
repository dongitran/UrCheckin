import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

class TelegramService {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: true,
    });
    this.chatIds = new Set();
    this.initializeCommands();
  }

  initializeCommands() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.username || msg.from.first_name;
      this.chatIds.add(chatId);

      const welcomeMessage = `
Hello ${username}! 👋
I'm a Checkin Management Bot. Use the following commands to interact:

/help - View all commands
      `;

      this.bot.sendMessage(chatId, welcomeMessage);
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.chatIds.add(chatId);

      const helpMessage = `
📌 Available Commands:

/start - Start using the bot
/help - View command list

❓ Need help? Contact the administrator for support.
      `;

      this.bot.sendMessage(chatId, helpMessage);
    });
  }
}

export default new TelegramService();
