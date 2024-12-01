import LoginAttempt from "../models/loginAttempt.model.js";

export class LoginService {
  static async checkLoginAttempts(userId) {
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
}
