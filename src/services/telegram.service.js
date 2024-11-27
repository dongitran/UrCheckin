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

🔒 Security Notice:
• Your information is securely encrypted and protected
• We use industry-standard encryption to safeguard your data
• Your credentials are stored in encrypted format only

⚠️ Disclaimer:
• This is a research project
• We are not responsible for any issues that may arise from using this bot
• Use at your own discretion
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

      this.bot.sendMessage(chatId, helpMessage);
    });

    this.bot.onText(/^\/login$/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        `❌ Missing email and password!

Please use the format: /login email password
Example: /login dongtran@test.com yourpassword`
      );
    });

    this.bot.onText(/\/login (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      const userName = msg.from.username || msg.from.first_name;

      try {
        const params = match[1].split(" ");
        if (params.length !== 2) {
          throw "Invalid format. Use: /login email password";
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
                password: encryptedPassword,
                userName,
              },
            }
          );
          await this.bot.sendMessage(
            chatId,
            `✅ Account updated successfully!

🔒 Security Information:
• Your password has been securely encrypted
• No one can access your original password
• All data is stored using AES-256 encryption

Your information is safe with us! 🛡️`
          );
        } else {
          await Account.create({
            userId,
            email,
            password: encryptedPassword,
            userName,
          });
          await this.bot.sendMessage(
            chatId,
            `✅ Account created successfully!

🔒 Security Information:
• Your password has been securely encrypted
• No one can access your original password
• All data is stored using AES-256 encryption

Your information is safe with us! 🛡️`
          );
        }
      } catch (error) {
        console.log("Login error:", error);
        await this.bot.sendMessage(chatId, `❌ Error: ${error}`);
      }
    });
  }
}

export default new TelegramService();
