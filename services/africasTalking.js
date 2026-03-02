import africastalking from "africastalking";
import dotenv from "dotenv";

dotenv.config();
const africasTalking = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

export const sms = africasTalking.SMS;
