import User from "../models/user.model.js";

export const checkAuth = async (ctx, next) => {
  try {
    const userId = ctx.from.id.toString();
    const user = await User.findOne({ userId, status: "activated" });

    if (!user) {
      return ctx.reply(`❌ Authentication required

Please login first using the /login command.

Format: /login email password
Example: /login dongtran@email.com yourpassword`);
    }

    ctx.user = user;
    return next();
  } catch (error) {
    console.error("Auth check error:", error);
    return ctx.reply("❌ An error occurred while checking authentication.");
  }
};
