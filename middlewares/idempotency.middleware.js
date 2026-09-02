import { createHash } from "crypto";

/**
 * Idempotency Middleware
 *
 * Validates the presence of the `Idempotency-Key` request header and
 * attaches a SHA-256 hash of it to `req.idempotencyKeyHash`.
 *
 * WHY SHA-256?
 *   - We never store the raw key — hashing prevents leakage of any
 *     client-generated nonces if the database is ever compromised.
 *   - SHA-256 is collision-resistant; two different keys will never
 *     produce the same hash in practice.
 *
 * The actual Redis check (returning cached responses) happens inside
 * the checkout controller so it has access to the full response object.
 */
export const requireIdempotencyKey = (req, res, next) => {
  const rawKey = req.headers["idempotency-key"];

  if (!rawKey || typeof rawKey !== "string" || rawKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required header: Idempotency-Key. " +
        "Generate a UUID on the client and include it with each request. " +
        "Retry with the same key to safely deduplicate duplicate submissions.",
    });
  }

  // Trim and hash — the hash is what gets stored in Redis / MongoDB
  req.idempotencyKeyHash = createHash("sha256")
    .update(rawKey.trim())
    .digest("hex");

  next();
};
