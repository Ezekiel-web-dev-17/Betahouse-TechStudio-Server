import axios from "axios";
import { PAYSTACK_SECRET_KEY } from "./env.config.js";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error(
    "[Paystack] PAYSTACK_SECRET_KEY is not set. " +
      "Add it to your .env.development.local file."
  );
}

/**
 * Pre-configured Axios instance for all Paystack REST API calls.
 * Automatically attaches Authorization header and base URL.
 */
const paystackClient = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 15_000, // 15-second timeout
});

export default paystackClient;
