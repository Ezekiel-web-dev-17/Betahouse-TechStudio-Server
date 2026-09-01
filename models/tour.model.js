import mongoose, { Schema } from "mongoose";

const tourSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
    },
    propertyTitle: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      default: "10:00 AM",
    },
    tourType: {
      type: String,
      enum: ["In-Person", "Virtual Video"],
      default: "In-Person",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Tour = mongoose.model("Tour", tourSchema);
