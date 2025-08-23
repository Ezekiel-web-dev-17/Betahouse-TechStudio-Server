import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { CLIENT_ID, JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.config.js";

const client = new OAuth2Client(CLIENT_ID);

const createToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// ======================= EMAIL/PASSWORD SIGNUP =======================
export const signUp = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user = await User.create(
      [{ firstName, lastName, email, password: hashedPassword }],
      { session }
    );
    await session.commitTransaction();
    session.endSession();

    const token = createToken(user[0]);
    res.status(201).json({
      success: true,
      message: "User signed up successfully",
      jwt: token,
      user: user[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ======================= EMAIL/PASSWORD SIGNIN =======================
export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const token = createToken(user);
    res.json({
      success: true,
      message: "User signed in successfully",
      jwt: token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// ======================= GOOGLE SIGNUP/SIGNIN =======================
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Google token required" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
    }

    const appToken = createToken(user);
    res.json({
      success: true,
      message: "User logged in successfully",
      jwt: appToken,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Invalid Google token" });
  }
};
