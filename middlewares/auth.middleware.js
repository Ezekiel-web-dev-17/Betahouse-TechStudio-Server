import jwt from "jsonwebtoken";

import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

const authorize = async (req, res, next) => {
  const headAuth = req.headers.authorization;
  try {
    let token;

    if (headAuth && headAuth.startsWith("Bearer")) {
      token = headAuth.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Unuthorized",
      //   this below 👇 is: error (whish is a property): error(error object janjan).message,
      error: error.message,
    });
    next(error);
  }
};

export default authorize;
