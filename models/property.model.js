import mongoose, { Schema } from "mongoose";

const propertySchema = new Schema(
  {
    image: {
      type: String,
      required: true,
      unique: true,
    },

    whatFor: {
      type: String,
      required: true,
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
