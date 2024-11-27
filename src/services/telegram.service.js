import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import Account from "../models/account.model.js";
import { encrypt } from "./encryption.service.js";

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
/login <email> <password> - Login with your credentials
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
/login <email> <password> - Login with your credentials

Example: /login example@email.com yourpassword

❓ Need help? Contact the administrator for support.
      `;

      this.bot.sendMessage(chatId, helpMessage);
    });

    this.bot.onText(/\/login (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      const userName = msg.from.username || msg.from.first_name;

      try {
        const params = match[1].split(" ");
        if (params.length !== 2) {
          throw new Error("Invalid format. Use: /login email password");
        }

        const [email, password] = params;

        const encryptedPassword = encrypt(password);

        const existingAccount = await Account.findOne({ userId });

        if (existingAccount) {
          await Account.updateOne(
            { userId },
            {
              $set: {
                email,
                password: JSON.stringify(encryptedPassword),
                userName,
              },
            }
          );
          await this.bot.sendMessage(
            chatId,
            "Account updated successfully! ✅"
          );
        } else {
          await Account.create({
            userId,
            email,
            password: JSON.stringify(encryptedPassword),
            userName,
          });
          await this.bot.sendMessage(
            chatId,
            "Account created successfully! ✅"
          );
        }
      } catch (error) {
        console.error("Login error:", error);
        await this.bot.sendMessage(
          chatId,
          `❌ Error: ${error.message}\n\nUse format: /login email password`
        );
      }
    });
  }
}

export default new TelegramService();
