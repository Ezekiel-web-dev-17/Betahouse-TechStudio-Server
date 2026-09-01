import mongoose from "mongoose";
import { DB_URI } from "../config/env.config.js";
import { Property } from "../models/property.model.js";
import propertyApi from "../propertyApi.js";
import Popular from "../models/popular.model.js";
import { discoverApi } from "../popularProperties.js";
import { Blog } from "../models/blog.model.js";
import blogApi from "../blogApi.js";
import { invalidatePropertyCache } from "../controllers/property.controller.js";

export const seedDatabase = async () => {
  try {
    const count = await Property.countDocuments();
    const countPopular = await Popular.countDocuments();
    const countBlogs = await Blog.countDocuments();

    // Check if any existing properties are missing full images galleries
    const sampleMissingGallery = await Property.findOne({ "images.1": { $exists: false } });

    if (count <= 0 || countPopular <= 0 || sampleMissingGallery) {
      console.log("Seeding / updating properties with full dynamic image galleries...");
      await Property.deleteMany({});
      await Popular.deleteMany({});
      await Property.create(propertyApi);
      await Popular.create(discoverApi);
      await invalidatePropertyCache();
      console.log("Properties and popular properties seeded successfully.");
    }

    if (countBlogs <= 0) {
      console.log("Seeding blog articles...");
      await Blog.deleteMany({});
      await Blog.create(blogApi);
      console.log("Blog articles seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding database:", error.message);
  }
};

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(DB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    console.log("Server connected to MongoDB successfully.");

    try {
      await seedDatabase();
    } catch (error) {
      console.error("Error during initial data seed:", error.message);
    }
  } catch (error) {
    console.error("Error connecting to Database: ", error.message);
    process.exit(1);
  }
};
