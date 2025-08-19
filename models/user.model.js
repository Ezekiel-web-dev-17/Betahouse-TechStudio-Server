import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      minLength: 2,
      trim: true,
      required: [true, "Enter your First name."],
      maxLength: 50,
    },

    lastName: {
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

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
