import mongoose from "mongoose";
import { DB_URI } from "../config/env.config.js";
import { Property } from "../models/property.model.js";
import propertyApi from "../propertyApi.js";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(DB_URI, {
      maxPoolSize: 10, // maximum number of connections in the pool
      minPoolSize: 2, // keep at least 2 connections alive
      serverSelectionTimeoutMS: 5000, // timeout if DB not reachable
    });

    console.log("Server connected to MongoDB successfully.");

    try {
      console.log("Deleting previous records...");
      await Property.deleteMany();
      console.log("Previous records deleted successfully");
    } catch (error) {
      console.error("Error uploading properties:", error);
    }

    try {
      console.log("Uploading updated/new records...");
      await Property.create(propertyApi);
      console.log("Properties uploaded successfully");
    } catch (creationError) {
      console.error("Error uploading properties:", creationError);
    }

    process.exit(0);
  } catch (error) {
    console.log("Error connecting to Database: ", error);
    process.exit(1);
  }
};
