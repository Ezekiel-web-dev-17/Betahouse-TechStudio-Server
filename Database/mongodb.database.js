import mongoose from "mongoose";
import { DB_URI } from "../config/env.config.js";
import { Property } from "../models/property.model.js";
import propertyApi from "../propertyApi.js";
import Popular from "../models/popular.model.js";
import { discoverApi } from "../popularProperties.js";

export const seedDatabase = async () => {
  try {
    const count = await Property.countDocuments();
    const countPopular = await Popular.countDocuments();
    if (count === 0 && countPopular === 0) {
      console.log("Seeding database with initial data...");
      await Property.deleteMany({});
      await Popular.deleteMany({});
      console.log("Deleted properties and popular properties Successfully.");
      console.log("Creating properties and popular properties...");
      await Property.create(propertyApi);
      await Popular.create(discoverApi);
      console.log("Created properties and popular properties Successfully.");
      console.log("Database seeded successfully");
    } else {
      console.log("Database already has data, skipping seed");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

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
      await seedDatabase();
      console.log("Previous records deleted successfully");
    } catch (error) {
      console.error(
        "Error uploading properties and popular properties:",
        error
      );
    }
  } catch (error) {
    console.log("Error connecting to Database: ", error);
    process.exit(1);
  }
};
