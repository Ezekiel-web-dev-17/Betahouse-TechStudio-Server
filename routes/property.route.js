import { Router } from "express";
import {
  filterProperties,
  getPropertiesByLimit,
  getPropertyById,
  sortByPrice,
  sortByTitle,
  createProperty,
  updateProperty,
  deleteProperty,
} from "../controllers/property.controller.js";

const propertyRouter = Router();

propertyRouter.get("/", getPropertiesByLimit);
propertyRouter.get("/filter", filterProperties);
propertyRouter.get("/sort-by-price", sortByPrice);
propertyRouter.get("/sort-by-title", sortByTitle);
propertyRouter.get("/:id", getPropertyById);
propertyRouter.post("/", createProperty);
propertyRouter.put("/:id", updateProperty);
propertyRouter.delete("/:id", deleteProperty);

export default propertyRouter;
