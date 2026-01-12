import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  DB_URI,
  ARCJET_KEY,
  ARCJET_ENV,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REDIS_USERNAME,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  CLIENT_ID,
} = process.env;
