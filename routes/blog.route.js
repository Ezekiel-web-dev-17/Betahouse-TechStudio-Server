import { Router } from "express";
import {
  getAllBlogs,
  getBlogByIdOrSlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";
import { isAgentOrAdmin } from "../middlewares/admin.middleware.js";

const blogRouter = Router();

blogRouter.get("/", getAllBlogs);
blogRouter.get("/:id", getBlogByIdOrSlug);
blogRouter.post("/", isAgentOrAdmin, createBlog);
blogRouter.put("/:id", isAgentOrAdmin, updateBlog);
blogRouter.delete("/:id", isAgentOrAdmin, deleteBlog);

export default blogRouter;
