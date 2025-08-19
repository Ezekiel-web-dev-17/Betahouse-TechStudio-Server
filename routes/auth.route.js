import { Router } from "express";
import { signIn, signUp } from "../controllers/user.controller.js";
import {
  validateSignIn,
  validateSignUp,
} from "../middlewares/error.middleware.js";

const authRouter = Router();

authRouter.post("/sign-up", validateSignUp, signUp);
authRouter.post("/sign-in", validateSignIn, signIn);

export default authRouter;
