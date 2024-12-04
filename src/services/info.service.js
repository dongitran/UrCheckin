import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function getInfo(accessToken) {
  try {
    const response = await axios.get(
      `${process.env.GET_INFO_URL}/ajax/api/v1/profile`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Host: String(process.env.GET_INFO_URL).substring(8),
          "User-Agent": "hrm/2 CFNetwork/1496.0.7 Darwin/23.5.0",
        },
      }
    );

    if (
      response?.data?.code === 1 &&
      response?.data?.httpCode === "200" &&
      response?.data?.profile
    ) {
      return response.data.profile;
    }
    throw { message: "Failed to get info", response };
  } catch (error) {
    console.log(error, "Get info error");
    throw new Error(`Get info error: ${error}`);
  }
}
