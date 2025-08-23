import { Router } from "express";
import { googleAuth, signIn, signUp } from "../controllers/user.controller.js";
import {
  validateSignIn,
  validateSignUp,
} from "../middlewares/error.middleware.js";

// Add to auth routes
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts",
});

const authRouter = Router();

authRouter.post("/google", authLimiter, googleAuth);
authRouter.post("/sign-up", authLimiter, validateSignUp, signUp);
authRouter.post("/sign-in", authLimiter, validateSignIn, signIn);

export default authRouter;
