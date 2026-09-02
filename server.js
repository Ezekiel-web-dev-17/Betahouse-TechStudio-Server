import express from "express";
import { PORT } from "./config/env.config.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import propertyRouter from "./routes/property.route.js";
import popularRoute from "./routes/popular.route.js";
import blogRouter from "./routes/blog.route.js";
import contactRouter from "./routes/contact.route.js";
import tourRouter from "./routes/tour.route.js";
import newsletterRouter from "./routes/newsletter.route.js";
import checkoutRouter from "./routes/checkout.route.js";
import { connectToDatabase } from "./database/mongodb.database.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();
// Trust reverse proxy if behind one (e.g. Render, Nginx, Vercel)
app.set("trust proxy", true);

app.use(cors());
app.use(morgan("dev"));
app.use(helmet());

// ─── IMPORTANT: Checkout webhook needs raw body for HMAC-SHA512 verification.
// express.raw() is scoped inside the checkout router to /webhook specifically.
// We mount the checkout router BEFORE express.json() so the raw middleware
// on that route runs before any global body parser can consume the stream.
app.use("/api/v1/checkout", checkoutRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/property", propertyRouter);
app.use("/api/v1/popular", popularRoute);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/contact", contactRouter);
app.use("/api/v1/tour", tourRouter);
app.use("/api/v1/newsletter", newsletterRouter);
// Note: /api/v1/checkout is already mounted above (before express.json)

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

app.use(errorMiddleware);

const portNumber = parseInt(PORT, 10) || 5000;

try {
  app.listen(portNumber, async () => {
    console.log("Connecting Server to Database...");
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${portNumber}`);
  });
} catch (error) {
  console.error("Error starting server:", error.message);
}

export default app;
