import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

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

    await delay(3000);

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
    console.log(tokenResponse, "tokenResponsetokenResponse");

    return tokenResponse.data.solution.gRecaptchaResponse;
  } catch (error) {
    throw new Error(`Auth token generation failed: ${error.message}`);
  }
}

export async function login(email, password, captchaToken) {
  const formData = new FormData();
  formData.append("__code", process.env.CODE);
  formData.append("client_id", process.env.CLIENT_ID);
  formData.append("device_id", process.env.DEVICE_ID);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("access", "");
  formData.append("recaptcha_response", captchaToken);

  try {
    const response = await axios.post(String(process.env.URL_LOGIN), formData, {
      headers: {
        ...formData.getHeaders(),
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "vi-VN,vi;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}
