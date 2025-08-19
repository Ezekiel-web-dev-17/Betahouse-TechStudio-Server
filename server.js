import express from "express";
import { PORT } from "./config/env.config.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import propertyRouter from "./routes/property.route.js";
import { connectToDatabase } from "./Database/mongodb.database.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(helmet());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: ["http:/localhost:4000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(arcjetMiddleware);

app.use("api/v1/auth", authRouter);
app.use("api/v1/property", propertyRouter);

app.use(errorMiddleware);

app.listen(PORT, async () => {
  console.log("Connecting Server to Database...");
  await connectToDatabase();
  console.log(`Server is running on http://localhost:${PORT}`);
});
