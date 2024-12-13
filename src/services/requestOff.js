import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { TIME_OFF_TYPE } from "../utils/constants.js";

dotenv.config();

export async function requestTimeOff(
  accessToken,
  title,
  followers,
  manager,
  date,
  type,
  groupId
) {
  console.log({ accessToken, title, followers, manager, date }, "adsf");
  const formData = new FormData();

  let titleExtend = "";
  switch (type) {
    case TIME_OFF_TYPE.FULL_DAY: {
      formData.append("shift-0-0", "on");
      formData.append("shift-0-1", "on");
      break;
    }
    case TIME_OFF_TYPE.MORNING: {
      formData.append("shift-0-0", "on");
      formData.append("shift-0-1", "off");

      titleExtend = " sáng";
      break;
    }
    case TIME_OFF_TYPE.AFTERNOON: {
      formData.append("shift-0-0", "off");
      formData.append("shift-0-1", "on");

      titleExtend = " chiều";
      break;
    }
  }

  formData.append("__code", "mobile");
  formData.append("leaveFund", "annual");
  formData.append("key", "date-0");
  formData.append("value", "1");
  formData.append("group_id", String(groupId));
  formData.append("id", "");
  formData.append("name", title + titleExtend);
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
