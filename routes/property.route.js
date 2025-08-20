import { Router } from "express";
import {
  filterProperties,
  getPropertiesByLimit,
  sortByPrice,
  sortByTitle,
} from "../controllers/property.controller.js";

const propertyRouter = Router();

propertyRouter.get("/", getPropertiesByLimit);

propertyRouter.get("/filter", filterProperties);

propertyRouter.get("/sort-by-price", sortByPrice);

propertyRouter.get("/sort-by-title", sortByTitle);

export default propertyRouter;
