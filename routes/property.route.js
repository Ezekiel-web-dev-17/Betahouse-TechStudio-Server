import { Router } from "express";
import { Property } from "../models/property.model.js";
const propertyRouter = Router();

propertyRouter.get("/", async (req, res, next) => {
  try {
    const { page, lmt } = req.query;
    const properties = await Property.find()
      .skip(page * 10)
      .limit(lmt)
      .lean();

    const totalPages = await Property.countDocuments();
    res.status(200).json({
      success: true,
      properties,
      pagination: {
        page,
        limit: lmt,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default propertyRouter;
