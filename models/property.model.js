import mongoose, { Schema } from "mongoose";

const propertySchema = new Schema(
  {
    image: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },

    whatFor: {
      type: String,
      required: true,
      enum: ["Sale", "Rent"],
    },

    status: {
      type: String,
      enum: ["Sold", "For Sale", "Rented", "For Rent"],
      default: "For Sale",
    },

    title: {
      type: String,
      required: true,
      index: true,
    },

    location: {
      type: String,
      required: true,
      index: true,
    },

    bed: {
      type: Number,
      required: true,
      index: true,
    },

    bath: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      index: true,
    },

    propertyType: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Property = mongoose.model("Property", propertySchema);
