import mongoose from "mongoose";
import { DB_URI } from "../config/env.config.js";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(DB_URI);

    console.log("Server connected to MongoDB successfully.");
  } catch (error) {
    console.log("Error connecting to Database: ", error);
    process.exit(1);
  }
};
