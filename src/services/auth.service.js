import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getRecaptcha() {
  try {
    const initialResponse = await axios.post(
      String(process.env.REQUEST_URL),
      {
        clientKey: process.env.CLIENT_KEY,
        task: {
          type: process.env.TYPE,
          websiteURL: process.env.URL,
          websiteKey: process.env.W_KEY,
          isInvisible: true,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { taskId } = initialResponse.data;

    await delay(10000);

    const tokenResponse = await axios.post(
      String(process.env.CHECK_URL),
      {
        clientKey: process.env.CLIENT_KEY,
        taskId,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return tokenResponse.data.solution.gRecaptchaResponse;
  } catch (error) {
    throw new Error(`Auth token generation failed: ${error.message}`);
  }
}
