import { Router } from "express";
import { scheduleTour, getTours } from "../controllers/tour.controller.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const tourRouter = Router();

tourRouter.post("/", scheduleTour);
tourRouter.get("/", isAdmin, getTours);

export default tourRouter;
