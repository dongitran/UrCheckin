import User from "../models/user.model.js";
import { logCommand } from "../services/commandLog.service.js";

export const checkAuth = async (ctx, next) => {
  try {
    const userId = ctx.from.id.toString();
    const user = await User.findOne({ userId, status: "activated" });

    if (!user) {
      await logCommand(
        ctx,
        "AUTH_CHECK",
        "ERROR",
        "Authentication failed - user not found or not activated"
      );
      return ctx.reply(
        `❌ Authentication required\n\nPlease login first using the /login command.\n\nFormat: /login email password\nExample: /login dongtran@email.com yourpassword`
      );
    }

    ctx.user = user;
    return next();
  } catch (error) {
    console.error("Auth check error:", error);
    await logCommand(
      ctx,
      "AUTH_CHECK",
      "ERROR",
      `Authentication error: ${error.message}`
    );
    return ctx.reply("❌ An error occurred while checking authentication.");
  }
};
