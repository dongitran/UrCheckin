import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import {
  startHandler,
  helpHandler,
  listRequestsHandler,
} from "../handlers/commandHandlers.js";
import { RequestOffHandler } from "../handlers/requestOffHandlers.js";
import { LoginHandler } from "../handlers/loginHandler.js";
import { RequestService } from "./requestService.js";
import { LoginService } from "./loginService.js";
import { logCommand } from "./commandLog.service.js";
import { checkAuth } from "../middleware/authMiddleware.js";

dotenv.config();

class TelegramService {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }

    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.requestService = RequestService;
    this.loginService = LoginService;
    this.initializeCommands();
    this.bot.launch();

    process.once("SIGINT", () => this.bot.stop("SIGINT"));
    process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
  }

  initializeCommands() {
    this.bot.command("start", async (ctx) => {
      await logCommand(ctx, "START_COMMAND", "INFO", "User started the bot");
      return startHandler(ctx);
    });

    this.bot.command("help", async (ctx) => {
      await logCommand(ctx, "HELP_COMMAND", "INFO", "User requested help");
      return helpHandler(ctx);
    });

    this.bot.command("login", async (ctx) => {
      await logCommand(
        ctx,
        "LOGIN_COMMAND",
        "INFO",
        "User attempting to login"
      );
      return LoginHandler.handle(ctx, this);
    });

    this.bot.command("request_off", checkAuth, async (ctx) => {
      await logCommand(
        ctx,
        "REQUEST_OFF_COMMAND",
        "INFO",
        "User initiated time off request"
      );
      return RequestOffHandler.handleRequestOff(ctx, this);
    });

    this.bot.command("my_days_off", checkAuth, async (ctx) => {
      await logCommand(
        ctx,
        "LIST_DAYS_OFF_COMMAND",
        "INFO",
        "User requested days off list"
      );
      return listRequestsHandler(ctx, this);
    });

    this.bot.command("cancel_request_off", checkAuth, async (ctx) => {
      await logCommand(
        ctx,
        "CANCEL_REQUEST_COMMAND",
        "INFO",
        "User initiated request cancellation"
      );
      return RequestOffHandler.handleCancelRequest(ctx, this);
    });

    this.bot.action(/date_(.+)_(\d{4}-\d{2}-\d{2})/, checkAuth, async (ctx) => {
      const selectedDate = ctx.match[2];
      await logCommand(ctx, "DATE_SELECTION", "INFO", "User selected date", {
        selectedDate,
      });
      return RequestOffHandler.handleDateSelection(ctx, this);
    });

    this.bot.action(
      /time_(.+)_(morning|afternoon|fullday)_(\d{4}-\d{2}-\d{2})/,
      checkAuth,
      async (ctx) => {
        const [_, __, timeOption, selectedDate] = ctx.match;
        await logCommand(
          ctx,
          "TIME_SELECTION",
          "INFO",
          "User selected time option",
          { timeOption, selectedDate }
        );
        return RequestOffHandler.handleTimeSelection(ctx, this);
      }
    );

    this.bot.action(/cancel_(.+)/, checkAuth, async (ctx) => {
      const requestId = ctx.match[1];
      await logCommand(
        ctx,
        "CANCEL_ACTION",
        "INFO",
        "User confirmed cancellation",
        { requestId }
      );
      return RequestOffHandler.handleCancelAction(ctx, this);
    });
  }

  async getExistingRequest(...args) {
    return await this.requestService.getExistingRequest(...args);
  }

  async getUpcomingRequests(...args) {
    return await this.requestService.getUpcomingRequests(...args);
  }

  async getUpcomingDaysOff(...args) {
    return await this.requestService.getUpcomingDaysOff(...args);
  }

  generateTimeOptions(...args) {
    return this.requestService.generateTimeOptions(...args);
  }

  async generateDateButtons(...args) {
    return await this.requestService.generateDateButtons(...args);
  }

  async generateCancelButtons(...args) {
    return await this.requestService.generateCancelButtons(...args);
  }

  async checkLoginAttempts(...args) {
    return await this.loginService.checkLoginAttempts(...args);
  }
}

export default new TelegramService();
