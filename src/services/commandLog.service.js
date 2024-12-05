import CommandLog from "../models/commandLog.model.js";

export async function logCommand(
  ctx,
  action,
  status = "INFO",
  message = "",
  extra = {}
) {
  try {
    const userId = ctx.from.id.toString();

    await CommandLog.create({
      userId,
      command: ctx.message?.text || "callback_query",
      action,
      status,
      metadata: {
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        extra,
      },
    });
  } catch (error) {
    console.error("Error logging command:", error);
  }
}
