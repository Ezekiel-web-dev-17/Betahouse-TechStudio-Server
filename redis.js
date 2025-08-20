import { createClient } from "redis";
import { REDIS_SECRET } from "./config/env.config.js";

const redisClient = createClient({
  url: REDIS_SECRET,
});

redisClient.on("connect", () => console.log("✅ Connected to Redis"));
redisClient.on("error", (err) => console.error("Redis Error:", err));

await redisClient.connect();

export default redisClient;
