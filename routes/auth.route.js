import { Router } from "express";
import { googleAuth, signIn, signUp } from "../controllers/user.controller.js";
import {
  validateSignIn,
  validateSignUp,
} from "../middlewares/error.middleware.js";

import arcjetMiddleware from "../middlewares/arcjet.middleware.js";

const authRouter = Router();

// Apply Arcjet rate limiting & bot protection specifically to auth endpoints
authRouter.use(arcjetMiddleware);

authRouter.post("/google", googleAuth);
authRouter.post("/sign-up", validateSignUp, signUp);
authRouter.post("/sign-in", validateSignIn, signIn);

export default authRouter;
