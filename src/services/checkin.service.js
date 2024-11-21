import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

export async function performCheckin(accessToken) {
  const formData = new FormData();
  formData.append("__code", "mobile");
  formData.append("client_id", process.env.CLIENT_ID);
  formData.append("lat", process.env.LAT);
  formData.append("lng", process.env.LNG);
  formData.append("device_id", process.env.DEVICE_ID);
  formData.append("ts", Math.floor(Date.now() / 1000));
  formData.append("face_detected", "false");

  const response = await axios.post(
    `${process.env.API_GET_CHECKIN_BASE_URL}/ajax/api/me/checkin/mobile`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "vi-VN,vi;q=0.9",
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "hrm/2 CFNetwork/1498.700.2 Darwin/23.6.0",
      },
    }
  );
  console.log(response, "responseresponse");

  if (response.data.code === 1) {
    return true;
  }
  throw {
    message: response.data.message || "Checkin failed",
    response: response?.data,
  };
}
