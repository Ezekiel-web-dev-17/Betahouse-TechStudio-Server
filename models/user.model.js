import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      minLength: 2,
      trim: true,
      required: [true, "Enter your First name."],
      maxLength: 50,
    },

    lastname: {
      type: String,
      minLength: 2,
      required: [true, "Enter your Last name."],
      maxLength: 50,
      trim: true,
    },

    email: {
      type: String,
      required: [true, "User Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please fill a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "User Password is required"],
      minLength: 6,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
