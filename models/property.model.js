import mongoose, { Schema } from "mongoose";

const propertySchema = new Schema(
  {
    image: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },

    whatFor: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    bed: {
      type: Number,
      required: true,
    },

    bath: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    propertyType: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Property = mongoose.model("Property", propertySchema);
