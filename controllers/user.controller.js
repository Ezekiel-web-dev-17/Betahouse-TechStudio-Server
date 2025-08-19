import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signUp = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields above are required.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    const salt = await bcrypt.genSalt(11);

    const hashedPassword = await bcrypt.hash(password, salt);

    const [newUser] = await User.create(
      [{ firstName, lastName, email, password: hashedPassword }],
      { session }
    );

    await newUser.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "New user signed up sucessfully.",
      user: newUser,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: `${!password ? "Password" : "Email"} field is required.`,
      });
    }

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({
        success: false,
        message: "Invalid credentials.",
      });

    const comparePassword = await bcrypt.compare(password, user.password);

    if (comparePassword === false)
      return res.status(401).json({
        success: false,
        message: "Invalid Password.",
      });

    res.status(200).json({
      success: true,
      message: "User signed-in successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};
