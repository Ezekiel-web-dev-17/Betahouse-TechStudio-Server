import { body, validationResult } from "express-validator";

export const validateSignUp = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage("First name must be between 2-30 characters."),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage("Last name must be between 2-30 characters."),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email."),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8-128 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

export const validateSignIn = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8-128 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

const errorMiddleware = (err, req, res, next) => {
  try {
    let error = { ...err };
    error.message = err.message;

    // Log minimal error in non-test environment
    if (process.env.NODE_ENV !== "test") {
      console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);
    }

    // Mongoose bad objectId
    if (err.name === "CastError") {
      error = new Error("Resource not found");
      error.statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      error = new Error("Duplicate field value entered");
      error.statusCode = 409;
    }

    // Mongoose Validation Error
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors || {}).map((val) => val.message);
      error = new Error(message.join(", ") || "Validation Error");
      error.statusCode = 400;
    }

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message: error.message || "Internal server error.",
      });
  } catch (internalErr) {
    next(internalErr);
  }
};

export default errorMiddleware;
