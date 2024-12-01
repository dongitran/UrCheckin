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
    this.bot.command("start", startHandler);
    this.bot.command("help", helpHandler);
    this.bot.command("login", (ctx) => LoginHandler.handle(ctx, this));

    this.bot.command("request_off", checkAuth, (ctx) =>
      RequestOffHandler.handleRequestOff(ctx, this)
    );

    this.bot.command("my_days_off", checkAuth, (ctx) =>
      listRequestsHandler(ctx, this)
    );
    this.bot.command("cancel_request_off", checkAuth, (ctx) =>
      RequestOffHandler.handleCancelRequest(ctx, this)
    );

    this.bot.action(/date_(.+)_(\d{4}-\d{2}-\d{2})/, checkAuth, (ctx) =>
      RequestOffHandler.handleDateSelection(ctx, this)
    );

    this.bot.action(
      /time_(.+)_(morning|afternoon|fullday)_(\d{4}-\d{2}-\d{2})/,
      checkAuth,
      (ctx) => RequestOffHandler.handleTimeSelection(ctx, this)
    );

    this.bot.action(/cancel_(.+)/, checkAuth, (ctx) =>
      RequestOffHandler.handleCancelAction(ctx, this)
    );
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
