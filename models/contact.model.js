import mongoose, { Schema } from "mongoose";

const contactSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      required: true,
      default: "General Inquiry",
    },
    message: {
      type: String,
      required: true,
      min: 5,
      max: 500,
    },
    status: {
      type: String,
      enum: ["new", "in-review", "contacted", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

export const Contact = mongoose.model("Contact", contactSchema);
