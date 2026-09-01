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
import {
  toggleFavorite,
  getFavorites,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const propertyRouter = Router();

// Public property listing & search routes
propertyRouter.get("/", getPropertiesByLimit);
propertyRouter.get("/filter", filterProperties);
propertyRouter.get("/sort-by-price", sortByPrice);
propertyRouter.get("/sort-by-title", sortByTitle);

// User Favorites routes (protected - must be defined before /:id)
propertyRouter.get("/favorites", protect, getFavorites);
propertyRouter.post("/favorite/:id", protect, toggleFavorite);
propertyRouter.delete("/favorite/:id", protect, removeFavorite);

// Single property detail by ID
propertyRouter.get("/:id", getPropertyById);

// Admin property management routes
propertyRouter.post("/", protect, isAdmin, createProperty);
propertyRouter.put("/:id", protect, isAdmin, updateProperty);
propertyRouter.delete("/:id", protect, isAdmin, deleteProperty);

export default propertyRouter;
