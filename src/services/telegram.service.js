import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import Account from "../models/account.model.js";
import User from "../models/user.model.js";
import LoginAttempt from "../models/loginAttempt.model.js";
import { encrypt } from "./encryption.service.js";
import { getRecaptcha, login } from "./auth.service.js";

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

      await this.bot.sendMessage(
        chatId,
        `⏳ Processing your request...

Your login information is being securely processed. Please wait a moment.`
      );

      try {
        const canLogin = await this.checkLoginAttempts(userId);
        if (!canLogin) {
          throw "You have exceeded the maximum login attempts (5) for today. Please try again tomorrow.";
        }

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
        } else {
          await Account.create({
            userId,
            email,
            password: encryptedPassword,
            userName,
          });
        }

        const captchaToken = await getRecaptcha();
        console.log(captchaToken, "captchaTokencaptchaToken");
        const loginResponse = await login(email, password, captchaToken);
        console.log(loginResponse, "loginResponseloginResponse");

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

        await this.bot.sendMessage(
          chatId,
          `✅ Account ${existingAccount ? "updated" : "created"} successfully!

🕒 Automatic Schedule:
Check-in: 9:15 AM
Check-out: 6:15 PM

🔒 Security Information:
• Your password has been securely encrypted
• All data is stored using AES-256 encryption

✨ You're all set! Just relax and let the bot handle your daily check-ins.`
        );
      } catch (error) {
        console.error("Login error:", error);
        await this.bot.sendMessage(
          chatId,
          `❌ Error: ${error.message || error}`
        );
      }
    });
  }
}

export default new TelegramService();
