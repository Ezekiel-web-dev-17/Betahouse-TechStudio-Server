import { Router } from "express";
import {
  createContactInquiry,
  getContactInquiries,
} from "../controllers/contact.controller.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const contactRouter = Router();

contactRouter.post("/", createContactInquiry);
contactRouter.get("/", isAdmin, getContactInquiries);

export default contactRouter;
