import mongoose from "mongoose";
import { createHmac } from "crypto";
import { Property } from "../models/property.model.js";
import Order from "../models/order.model.js";
import redisClient from "../redis.js";
import paystackClient from "../config/paystack.config.js";
import { PAYSTACK_SECRET_KEY } from "../config/env.config.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const IDEMPOTENCY_TTL_SEC = 86_400;   // 24 hours
const PROPERTY_LOCK_TTL_MS = 10_000; // 10-second distributed lock
const LEGAL_FEE_NGN = 50_000;         // Fixed legal/title search fee

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Acquires a Redis SETNX lock on a property.
 *
 * SYSTEM DESIGN — Why two layers of locking?
 *
 *   Layer 1 (Redis SETNX): Fast, sub-millisecond pre-check at the application
 *   boundary. Prevents hammering MongoDB for clearly-concurrent requests on the
 *   same property.  The lock is time-bounded (10s TTL) so a crashed node can
 *   never deadlock the system.
 *
 *   Layer 2 (MongoDB atomic update): The real source of truth. Even if two
 *   requests slip past the Redis lock simultaneously (e.g., after a Redis
 *   restart), MongoDB's atomic findOneAndUpdate with `{ status: "For Sale" }`
 *   as a filter guarantees only one write wins.  This is the "belt" to Redis's
 *   "suspenders".
 *
 * @param {string} propertyId
 * @returns {Promise<boolean>} true if lock acquired, false if already locked
 */
async function acquirePropertyLock(propertyId) {
  const lockKey = `property-lock:${propertyId}`;
  const result = await redisClient.set(lockKey, "1", {
    NX: true,      // Only set if Not eXists
    PX: PROPERTY_LOCK_TTL_MS, // Auto-expire — prevents deadlocks
  });
  return result === "OK";
}

/**
 * Releases a Redis property lock.
 * Called on both success and failure paths to keep the lock window minimal.
 */
async function releasePropertyLock(propertyId) {
  await redisClient.del(`property-lock:${propertyId}`);
}

/**
 * Invalidates all Redis property listing cache keys.
 * Called whenever a property status changes so listing endpoints
 * don't serve stale "For Sale" data for a sold property.
 */
async function invalidatePropertyCache() {
  try {
    // SCAN is non-blocking; KEYS would block Redis on large datasets
    for await (const key of redisClient.scanIterator({
      MATCH: "properties:*",
      COUNT: 100,
    })) {
      await redisClient.del(key);
    }
  } catch (err) {
    // Cache invalidation failure is non-fatal — log and continue
    console.error("[Cache] Failed to invalidate properties cache:", err.message);
  }
}

// ─── Controller: POST /api/v1/checkout/initiate ──────────────────────────────

/**
 * initiateCheckout
 *
 * Full checkout flow with idempotency, distributed locking, and MongoDB
 * session transactions:
 *
 * 1. Validate request body
 * 2. Check Redis for cached idempotency response → return early if hit
 * 3. Acquire Redis SETNX lock per property (fast concurrency pre-check)
 * 4. Open MongoDB session + withTransaction:
 *    a. Atomically reserve each property (findOneAndUpdate with status filter)
 *    b. Initialize Paystack transaction → get authorizationUrl + reference
 *    c. Create Order document inside the transaction
 * 5. Release locks, cache idempotency result, invalidate property cache
 * 6. Return { authorizationUrl, reference, orderId, orderRef }
 */
export const initiateCheckout = async (req, res, next) => {
  const body = req.body || {};
  const { cart, buyerInfo } = body;
  const { idempotencyKeyHash } = req;
  const userId = req.user._id;

  // Normalize paymentMethod string from frontend UI values ("Bank Transfer", "Debit Card", etc.)
  let rawMethod = body.paymentMethod || "bank_transfer";
  let paymentMethod = "bank_transfer";
  if (typeof rawMethod === "string") {
    const lower = rawMethod.toLowerCase();
    if (lower.includes("bank") || lower.includes("transfer") || lower.includes("wire")) {
      paymentMethod = "bank_transfer";
    } else if (lower.includes("installment") || lower.includes("plan")) {
      paymentMethod = "installment";
    } else if (lower.includes("card") || lower.includes("debit") || lower.includes("credit") || lower.includes("paystack")) {
      paymentMethod = "card";
    }
  }

  // ── 1. Basic validation ────────────────────────────────────────────────
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart must be a non-empty array of property IDs.",
    });
  }

  if (!buyerInfo?.fullName || !buyerInfo?.email || !buyerInfo?.phone) {
    return res.status(400).json({
      success: false,
      message: "buyerInfo must include fullName, email, and phone.",
    });
  }

  const validMethods = ["card", "bank_transfer", "installment"];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `paymentMethod must be one of: ${validMethods.join(", ")}.`,
    });
  }

  // ── 2. Idempotency check ───────────────────────────────────────────────
  // SYSTEM DESIGN: Redis is our idempotency store because:
  //  - Sub-millisecond reads vs MongoDB's ~1-5ms
  //  - Built-in TTL expiry (24h) so the cache is self-cleaning
  //  - If Redis is down, we fall through and process normally (fail-open
  //    strategy) — a duplicate charge is safer than a rejected legitimate one,
  //    and Paystack's own reference deduplication is the backstop.
  const idempotencyCacheKey = `idempotency:checkout:${idempotencyKeyHash}`;
  try {
    const cached = await redisClient.get(idempotencyCacheKey);
    if (cached) {
      // Return the original response — no new charge, no DB write
      return res.status(200).json({
        ...JSON.parse(cached),
        fromCache: true, // signal to client that this was a deduplicated response
      });
    }
  } catch (redisErr) {
    // Log and continue — idempotency cache miss is recoverable
    console.error("[Idempotency] Redis read failed:", redisErr.message);
  }

  // ── 3. Acquire distributed locks ──────────────────────────────────────
  // SYSTEM DESIGN: SETNX locks let us fast-reject clearly concurrent requests
  // before touching MongoDB.  If we can't lock any property, another request
  // is already in the critical section — return 409 immediately.
  const lockedPropertyIds = [];
  try {
    for (const propertyId of cart) {
      const locked = await acquirePropertyLock(propertyId);
      if (!locked) {
        // Release all locks already acquired (clean up partial state)
        for (const id of lockedPropertyIds) await releasePropertyLock(id);
        return res.status(409).json({
          success: false,
          message:
            "One or more properties are currently being reserved by another transaction. " +
            "Please try again in a few seconds.",
        });
      }
      lockedPropertyIds.push(propertyId);
    }
  } catch (lockErr) {
    // If Redis is unavailable, release anything we've locked and continue
    // — MongoDB transaction is the authoritative safety net
    for (const id of lockedPropertyIds) {
      await releasePropertyLock(id).catch(() => {});
    }
    console.error("[Lock] Redis lock acquisition failed:", lockErr.message);
  }

  // ── 4. MongoDB session transaction ────────────────────────────────────
  // SYSTEM DESIGN: withTransaction() gives us ACID guarantees:
  //  - ATOMICITY: either all properties are reserved and the order is created,
  //    or NOTHING is written. No partial state.
  //  - ISOLATION: other sessions cannot see our reserved properties until
  //    the transaction commits (default snapshot isolation).
  // Requires a MongoDB replica set (Atlas provides this by default).
  const session = await mongoose.startSession();
  let transactionResult;

  try {
    await session.withTransaction(async () => {
      // ── 4a. Atomically reserve each property ────────────────────────
      const reservedProperties = [];
      for (const propertyId of cart) {
        // KEY PATTERN: filter includes `status: "For Sale"` so this update
        // is a no-op (returns null) if the property is already Reserved/Sold.
        // This is the MongoDB atomic concurrency guarantee — no two sessions
        // can both successfully update the same document from "For Sale".
        const prop = await Property.findOneAndUpdate(
          {
            _id: propertyId,
            status: { $in: ["For Sale", "For Rent"] },
          },
          { $set: { status: "Reserved" } },
          { session, new: true }
        );

        if (!prop) {
          // Property is already sold, rented, or doesn't exist.
          // Throwing inside withTransaction auto-triggers rollback.
          const err = new Error(
            `Property "${propertyId}" is no longer available for reservation.`
          );
          err.statusCode = 409;
          throw err;
        }

        reservedProperties.push(prop);
      }

      // ── 4b. Calculate totals ─────────────────────────────────────────
      const propertiesTotal = reservedProperties.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const totalAmountNgn = propertiesTotal + LEGAL_FEE_NGN;
      // Paystack expects amounts in kobo (1 NGN = 100 kobo)
      const totalAmountKobo = totalAmountNgn * 100;

      // ── 4c. Initialize Paystack transaction ──────────────────────────
      // SYSTEM DESIGN: We call Paystack INSIDE the transaction.
      // If Paystack fails → transaction rolls back → properties revert to
      // "For Sale" → no orphaned "Reserved" properties in the database.
      //
      // The `reference` is our globally unique order key on the Paystack side.
      // We prefix with BH- so Paystack dashboard entries are identifiable.
      const paystackReference = `BH-${Date.now()}-${userId.toString().slice(-6)}`;

      let paystackData;
      try {
        const { data: paystackResponse } = await paystackClient.post(
          "/transaction/initialize",
          {
            email: buyerInfo.email.toLowerCase().trim(),
            amount: totalAmountKobo,
            currency: "NGN",
            reference: paystackReference,
            // callback_url is where Paystack redirects after payment
            callback_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/order-success`,
            metadata: {
              userId: userId.toString(),
              orderId: "pending", // will be updated post-creation
              properties: reservedProperties.map((p) => ({
                id: p._id.toString(),
                title: p.title,
              })),
              buyerFullName: buyerInfo.fullName,
              legalFeeNgn: LEGAL_FEE_NGN,
              custom_fields: [
                {
                  display_name: "Buyer Name",
                  variable_name: "buyer_name",
                  value: buyerInfo.fullName,
                },
              ],
            },
          }
        );

        if (!paystackResponse.status) {
          const err = new Error(
            `Paystack initialization failed: ${paystackResponse.message}`
          );
          err.statusCode = 502;
          throw err;
        }

        paystackData = paystackResponse.data;
      } catch (paystackErr) {
        // Re-throw to trigger transaction rollback
        const err = new Error(
          paystackErr.response?.data?.message ||
            paystackErr.message ||
            "Payment gateway error. Please try again."
        );
        err.statusCode = paystackErr.statusCode || 502;
        throw err;
      }

      // ── 4d. Create Order document ────────────────────────────────────
      const [order] = await Order.create(
        [
          {
            user: userId,
            properties: reservedProperties.map((p) => ({
              property: p._id,
              title: p.title,
              location: p.location,
              priceNgn: p.amount,
              whatFor: p.whatFor,
            })),
            buyerInfo: {
              fullName: buyerInfo.fullName.trim(),
              email: buyerInfo.email.toLowerCase().trim(),
              phone: buyerInfo.phone.trim(),
              city: buyerInfo.city?.trim(),
              notes: buyerInfo.notes?.trim(),
            },
            paymentMethod,
            paystackReference,
            paystackAuthorizationUrl: paystackData.authorization_url,
            totalAmountNgn,
            totalAmountKobo,
            legalFeeNgn: LEGAL_FEE_NGN,
            idempotencyKeyHash,
            // orderRef is auto-generated by the schema default
          },
        ],
        { session }
      );

      transactionResult = {
        success: true,
        authorizationUrl: paystackData.authorization_url,
        reference: paystackReference,
        orderId: order._id.toString(),
        orderRef: order.orderRef,
        totalAmountNgn,
        legalFeeNgn: LEGAL_FEE_NGN,
        propertiesCount: reservedProperties.length,
      };
    });
  } catch (txErr) {
    // Ensure properties are unlocked even on transaction failure
    for (const id of lockedPropertyIds) {
      await releasePropertyLock(id).catch(() => {});
    }

    const statusCode = txErr.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: txErr.message || "Checkout failed. Please try again.",
    });
  } finally {
    await session.endSession();
  }

  // ── 5. Post-transaction cleanup ────────────────────────────────────────
  // Release locks (properties are now Reserved in DB — no longer need locks)
  for (const id of lockedPropertyIds) {
    await releasePropertyLock(id).catch(() => {});
  }

  // Cache the idempotency result — prevents duplicate charges on retries
  try {
    await redisClient.setEx(
      idempotencyCacheKey,
      IDEMPOTENCY_TTL_SEC,
      JSON.stringify(transactionResult)
    );
  } catch (cacheErr) {
    console.error("[Idempotency] Failed to cache result:", cacheErr.message);
  }

  // Invalidate property listing cache — status changed to "Reserved"
  await invalidatePropertyCache();

  // ── 6. Respond ────────────────────────────────────────────────────────
  return res.status(201).json(transactionResult);
};

// ─── Controller: POST /api/v1/checkout/webhook ───────────────────────────────

/**
 * handleWebhook
 *
 * Receives and processes Paystack webhook events.
 *
 * CRITICAL SECURITY NOTE:
 *   The webhook endpoint MUST receive the RAW request body (Buffer), not a
 *   JSON-parsed object.  The HMAC-SHA512 signature is computed over the raw
 *   bytes.  If Express parses the body first, the signature will not match.
 *   This is configured in checkout.route.js using express.raw().
 *
 * SYSTEM DESIGN — Why webhooks?
 *   Card payments may take seconds to authorize. We never trust a client-side
 *   "payment successful" signal — that's trivially spoofable. Instead we:
 *   1. Return authorizationUrl to the client immediately
 *   2. Client redirects to Paystack's hosted payment page
 *   3. Paystack fires webhook → we verify + confirm the order server-side
 *   4. Client polling /verify/:reference confirms the final state
 *
 * Paystack retries failed webhooks every hour for 72 hours — we must
 * return 200 quickly. All heavy work should be fast (indexed DB updates).
 */
export const handleWebhook = async (req, res) => {
  // ── Signature verification ──────────────────────────────────────────────
  // SYSTEM DESIGN: HMAC-SHA512 prevents forged webhook events.
  // An attacker cannot fabricate a valid signature without the secret key.
  const signature = req.headers["x-paystack-signature"];
  if (!signature) {
    return res.status(401).json({ success: false, message: "Missing signature" });
  }

  const rawBody = req.rawBody || req.body; // Raw buffer from express.json verify hook or express.raw
  const expectedSig = createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (expectedSig !== signature) {
    return res.status(401).json({
      success: false,
      message: "Webhook signature mismatch. Request rejected.",
    });
  }

  // Parse body only AFTER signature verification
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
  }

  const { event: eventType, data } = event;
  const reference = data?.reference;

  // Respond 200 immediately — Paystack considers any non-2xx a failure and retries
  res.status(200).json({ received: true });

  // Process asynchronously after acknowledging Paystack
  setImmediate(async () => {
    try {
      if (eventType === "charge.success") {
        await handleChargeSuccess(reference);
      } else if (
        eventType === "charge.failed" ||
        eventType === "transfer.failed"
      ) {
        await handleChargeFailed(reference);
      }
      // Other event types (charge.dispute.create, etc.) are logged but not acted upon
    } catch (err) {
      console.error(`[Webhook] Error processing event "${eventType}":`, err.message);
    }
  });
};

/**
 * Handles a confirmed successful payment.
 *
 * SYSTEM DESIGN — Server-side re-verification:
 *   Even after receiving a `charge.success` webhook, we call
 *   Paystack's /transaction/verify/:reference endpoint to independently
 *   confirm the payment amount and status.
 *   This prevents a class of attacks where a webhook is replayed with a
 *   modified amount or a test-mode signature is used against production.
 */
async function handleChargeSuccess(reference) {
  if (!reference) return;

  // Independent server-side verification — NEVER trust webhook data alone
  const { data: verifyResponse } = await paystackClient.get(
    `/transaction/verify/${reference}`
  );

  if (
    !verifyResponse.status ||
    verifyResponse.data?.status !== "success"
  ) {
    console.error(
      `[Webhook] Payment verification failed for reference: ${reference}`
    );
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Find and update the order
      const order = await Order.findOneAndUpdate(
        { paystackReference: reference, status: { $in: ["pending", "processing"] } },
        { $set: { status: "paid", paidAt: new Date() } },
        { session, new: true }
      );

      if (!order) {
        // Order already processed (idempotent webhook handling) or doesn't exist
        return;
      }

      // Update each property status to Sold or Rented
      const propertyIds = order.properties.map((p) => p.property);
      await Property.updateMany(
        { _id: { $in: propertyIds } },
        [
          {
            $set: {
              status: {
                $cond: {
                  if: { $eq: ["$whatFor", "Rent"] },
                  then: "Rented",
                  else: "Sold",
                },
              },
            },
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // Invalidate cache after transaction so listings reflect the final status
  await invalidatePropertyCache();
  console.log(`[Webhook] Order paid and properties updated for ref: ${reference}`);
}

/**
 * Handles a failed payment — reverts all reserved properties back to available.
 */
async function handleChargeFailed(reference) {
  if (!reference) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        { paystackReference: reference, status: { $in: ["pending", "processing"] } },
        { $set: { status: "failed" } },
        { session, new: true }
      );

      if (!order) return;

      // Revert properties to their original available status
      for (const entry of order.properties) {
        const revertStatus = entry.whatFor === "Rent" ? "For Rent" : "For Sale";
        await Property.findByIdAndUpdate(
          entry.property,
          { $set: { status: revertStatus } },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  await invalidatePropertyCache();
  console.log(`[Webhook] Payment failed — properties reverted for ref: ${reference}`);
}

// ─── Controller: GET /api/v1/checkout/verify/:reference ──────────────────────

/**
 * verifyPayment
 *
 * Client-facing endpoint called after Paystack redirects back to the app.
 * Checks both our Order DB and Paystack's verification endpoint.
 *
 * SYSTEM DESIGN: The client should NOT trust the URL query params from
 * Paystack's callback_url (e.g. ?trxref=...).  They should call this endpoint
 * which is authenticated (requires JWT) and does a server-side DB lookup.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId = req.user._id;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required.",
      });
    }

    const order = await Order.findOne({
      paystackReference: reference,
      user: userId,
    }).populate("properties.property", "title location amount status image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderRef: order.orderRef,
        status: order.status,
        totalAmountNgn: order.totalAmountNgn,
        legalFeeNgn: order.legalFeeNgn,
        paymentMethod: order.paymentMethod,
        buyerInfo: order.buyerInfo,
        properties: order.properties,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: GET /api/v1/checkout/order/:id ───────────────────────────────

/**
 * getOrder
 * Returns a single order by its MongoDB _id.
 * Only the authenticated owner can access their order.
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("properties.property", "title location amount status image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied.",
      });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: GET /api/v1/checkout/my-orders ──────────────────────────────

/**
 * getMyOrders
 * Returns all orders for the authenticated user, most recent first.
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("properties.property", "title location amount status image")
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    next(err);
  }
};
