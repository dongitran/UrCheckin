import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

export async function getAccessToken(refreshToken) {
  const formData = new FormData();
  formData.append("__code", "mobile");
  formData.append("refresh_token", refreshToken);

  try {
    const response = await axios.post(
      `${process.env.API_GET_REFRESH_TOKEN_BASE_URL}/ajax/mobile/auth/refresh`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "vi-VN,vi;q=0.9",
          "Cache-Control": "no-cache",
          "User-Agent": "hrm/2 CFNetwork/1498.700.2 Darwin/23.6.0",
        },
      }
    );

    if (
      response?.data?.code === 1 &&
      response?.data?.httpCode === "200" &&
      response?.data?.access_token &&
      response?.data?.refresh_token
    ) {
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    }
    throw new Error("Failed to get access token");
  } catch (error) {
    throw new Error(`Token refresh failed: ${error}`);
  }
}
