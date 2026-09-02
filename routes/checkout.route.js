import express from "express";
import {
  initiateCheckout,
  handleWebhook,
  verifyPayment,
  getOrder,
  getMyOrders,
} from "../controllers/checkout.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { requireIdempotencyKey } from "../middlewares/idempotency.middleware.js";

const checkoutRouter = express.Router();

/**
 * POST /api/v1/checkout/webhook
 *
 * CRITICAL: Uses express.raw() so the body arrives as a raw Buffer.
 * Paystack's HMAC-SHA512 signature is computed over the raw bytes.
 * If Express parses JSON first, the signature verification will fail.
 *
 * This route is registered on the router BEFORE any JSON-parsing middleware.
 * The router itself is mounted in server.js BEFORE the global express.json().
 */
checkoutRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

/**
 * POST /api/v1/checkout/initiate
 *
 * Initiates a property reservation and Paystack payment transaction.
 *
 * Required headers:
 *   Authorization: Bearer <jwt>
 *   Idempotency-Key: <uuid>
 *
 * Body: { cart: string[], buyerInfo: object, paymentMethod: string }
 *
 * Returns: { authorizationUrl, reference, orderId, orderRef, totalAmountNgn }
 */
checkoutRouter.post(
  "/initiate",
  protect,
  requireIdempotencyKey,
  initiateCheckout
);

/**
 * GET /api/v1/checkout/verify/:reference
 * Server-side verification after Paystack redirects back.
 * Safer than trusting URL params — does a DB lookup by JWT owner.
 */
checkoutRouter.get("/verify/:reference", protect, verifyPayment);

/**
 * GET /api/v1/checkout/order/:id
 * Returns a specific order by MongoDB ObjectId (owner only).
 */
checkoutRouter.get("/order/:id", protect, getOrder);

/**
 * GET /api/v1/checkout/my-orders
 * Returns all orders for the authenticated user, sorted by newest first.
 */
checkoutRouter.get("/my-orders", protect, getMyOrders);

export default checkoutRouter;
