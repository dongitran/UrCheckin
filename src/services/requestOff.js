import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

export async function requestTimeOff(
  accessToken,
  title,
  followers,
  manager,
  date
) {
  console.log({ accessToken, title, followers, manager, date }, "adsf");
  const formData = new FormData();

  formData.append("__code", "mobile");
  formData.append("leaveFund", "annual");
  formData.append("key", "date-0");
  formData.append("value", "1");
  formData.append("shift-0-0", "on");
  formData.append("shift-0-1", "on");
  formData.append("group_id", `${process.env.OFF_REQUEST_ID}`); //TODO: using variable
  formData.append("id", "");
  formData.append("name", title);
  formData.append("content", "");
  formData.append("owners", "");
  formData.append("followers", followers);
  formData.append("leave_fund", "annual");
  formData.append("load_shifts_method", "");
  formData.append("sdate", date);
  formData.append("custom_custom_ly_do", "Bận việc riêng");
  formData.append("direct_managers", `@${manager}`);
  formData.append("mode", "");

  const response = await axios.post(process.env.URL_TIMEOFF, formData, {
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
    message: response.data.message || "TimeOff request failed",
    response: response?.data,
  };
}
