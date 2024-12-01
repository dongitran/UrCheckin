import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import { encrypt } from "../services/encryption.service.js";
import { getRecaptcha, login } from "../services/auth.service.js";

export class LoginHandler {
  static async handle(ctx, telegramService) {
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
      const canLogin = await telegramService.checkLoginAttempts(userId);
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

      const existingUser = await User.findOne({ email, status: "activated" });
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
Check-in: ~9:15 AM
Check-out: ~6:15 PM

🔒 Security Information:
• Your password has been securely encrypted
• All data is stored using AES-256 encryption

✨ You're all set! Just relax and let the bot handle your daily check-ins.`);
    } catch (error) {
      console.error("Login error:", error);
      return ctx.reply(`❌ Error: ${error.message || error}`);
    }
  }
}
