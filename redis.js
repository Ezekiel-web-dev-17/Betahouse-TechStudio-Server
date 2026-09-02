import { createClient } from "redis";
import {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USERNAME,
} from "./config/env.config.js";

let redisConfig = {};

if (REDIS_URL) {
  redisConfig = { url: REDIS_URL };
} else if (REDIS_HOST) {
  redisConfig = {
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT ? parseInt(REDIS_PORT, 10) : 6379,
    },
  };
} else {
  // Default to localhost for development
  redisConfig = {
    socket: {
      host: "127.0.0.1",
      port: 6379,
    },
  };
}

// Add a limited reconnect strategy to prevent log flooding on cloud hosts without Redis
redisConfig.socket = {
  ...(redisConfig.socket || {}),
  reconnectStrategy: (retries) => {
    if (retries > 3) {
      return new Error("Redis connection retries exhausted");
    }
    return Math.min(retries * 500, 2000);
  },
};

const client = createClient(redisConfig);

client.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") {
    console.error("[Redis Error]", err.message);
  }
});

try {
  await client.connect();
  console.log("[Redis] Connected successfully.");
} catch (err) {
  console.warn("[Redis Warning] Could not connect to Redis server:", err.message);
  console.warn("[Redis Warning] Server will run with database fallback.");
}

export default client;