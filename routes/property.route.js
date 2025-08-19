import { Router } from "express";
import { Property } from "../models/property.model.js";
const propertyRouter = Router();

propertyRouter.get("/", async (req, res) => {
  try {
    const { query } = req.query;
    const property = await Property.find()
      .skip(query * 10)
      .limit(10)
      .lean();
    res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    next(error);
  }
});

export default propertyRouter;
