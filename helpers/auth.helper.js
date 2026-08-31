import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.config.js";
import jwt from "jsonwebtoken";

export const createToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe ? "30d" : (JWT_EXPIRES_IN || "1d");
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET || "default_jwt_secret",
    {
      expiresIn,
    }
  );
};