import { Router } from "express";
import Popular from "../models/popular.model";

const popularRoute = Router();

popularRoute.get("/", async (req, res) => {
  try {
    const popularProperties = await Popular.find().lean();
    res.status(200).json({
      success: true,
      properties: popularProperties,
    });
  } catch (error) {
    next(error);
  }
});

export default popularRoute;
