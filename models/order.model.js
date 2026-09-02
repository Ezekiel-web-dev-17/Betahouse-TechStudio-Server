import mongoose, { Schema } from "mongoose";
import { randomBytes } from "crypto";

/** Generates a short 6-char uppercase alphanumeric ID, e.g. "A1B2C3" */
const shortId = () => randomBytes(3).toString("hex").toUpperCase();

/**
 * Order Model
 *
 * Represents a property purchase/reservation order linked to a Paystack
 * payment transaction.  The lifecycle is:
 *
 *   pending  ──►  processing  ──►  paid
 *                     │
 *                     └──►  failed  ──►  (properties reverted to "For Sale")
 *
 * Key design decisions:
 *  - `paystackReference` is unique and sparse — it acts as our idempotency
 *    anchor on the Paystack side.
 *  - `idempotencyKeyHash` is a SHA-256 of the client-sent Idempotency-Key
 *    header.  The raw key is never stored.
 *  - `totalAmountKobo` stores the canonical amount in kobo (NGN × 100),
 *    which is what Paystack expects.  We also store `totalAmountNgn` for
 *    human-readable queries.
 */
const orderSchema = new Schema(
  {
    // ─── Relations ────────────────────────────────────────────────────────
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of each property at order time (price may change later)
    properties: [
      {
        property: {
          type: Schema.Types.ObjectId,
          ref: "Property",
          required: true,
        },
        title: { type: String, required: true },
        location: { type: String },
        priceNgn: { type: Number, required: true },
        whatFor: { type: String, enum: ["Sale", "Rent"], required: true },
      },
    ],

    // ─── Buyer Info (captured at checkout time) ───────────────────────────
    buyerInfo: {
      fullName: { type: String, required: true, trim: true },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: { type: String, required: true, trim: true },
      city: { type: String, trim: true },
      notes: { type: String, trim: true },
    },

    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "installment"],
      required: true,
    },

    // ─── Paystack Payment Data ────────────────────────────────────────────
    paystackReference: {
      type: String,
      unique: true,
      sparse: true, // NULL-safe unique index (pending orders before Paystack init)
      index: true,
    },

    paystackAuthorizationUrl: { type: String },

    // ─── Amounts ─────────────────────────────────────────────────────────
    totalAmountNgn: { type: Number, required: true },
    totalAmountKobo: { type: Number, required: true }, // canonical Paystack amount
    legalFeeNgn: { type: Number, required: true, default: 50_000 },
    currency: { type: String, default: "NGN" },

    // ─── Order Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    // ─── Idempotency ──────────────────────────────────────────────────────
    // SHA-256 hash of the raw client Idempotency-Key header
    idempotencyKeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Human-readable order reference displayed to the buyer (e.g. BH-A1B2C3)
    orderRef: {
      type: String,
      unique: true,
      default: () => `BH-${shortId()}`,
    },

    // Set by webhook on successful payment confirmation
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    // Compound indexes for common query patterns
    index: [
      { user: 1, status: 1 },
      { paystackReference: 1, status: 1 },
    ],
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
