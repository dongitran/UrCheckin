import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

export async function removeTimeOff(accessToken, id) {
  const formData = new FormData();
  formData.append("__code", "mobile");
  formData.append("id", id);

  const response = await axios.post(process.env.URL_REMOVE_REQUEST, formData, {
    headers: {
      ...formData.getHeaders(),
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "hrm/2 CFNetwork/1496.0.7 Darwin/23.5.0",
    },
  });

  if (response?.data?.code === 1) {
    return response.data;
  }
  throw {
    message: response.data.message || "Remove timeoff failed",
    response: response?.data,
  };
}
