import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";
import { ARCJET_KEY } from "../config/env.config.js";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      deny: [
        "CATEGORY:ADVERTISING",
        "CATEGORY:AI",
        "CATEGORY:ARCHIVE",
        "CATEGORY:OPTIMIZER",
        "CATEGORY:YAHOO",
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE",
      // Tracked by IP address by default, but this can be customized
      // See https://docs.arcjet.com/fingerprints
      characteristics: ["ip.src"],
      refillRate: 5, // Refill 5 tokens per interval
      interval: 10, // Refill every 10 seconds
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, { requested: 1 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ error: `Rate limit exceeded` });
      }
      if (decision.reason.isBot()) {
        return res.status(403).json({ error: "Bot detected" });
      }

      return res.status(403).json({ error: "Access Denied" });
    }

    next();
  } catch (error) {
    console.log(`Arcjet Middleware Error: ${error}`);
    next();
  }
};

export default arcjetMiddleware;
