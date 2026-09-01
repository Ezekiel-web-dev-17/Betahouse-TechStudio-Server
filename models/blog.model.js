import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    author: {
      type: String,
      default: "Betahouse Editorial",
    },
    authorRole: {
      type: String,
      default: "Real Estate Analyst",
    },
    authorAvatar: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    readTime: {
      type: String,
      default: "5 min read",
    },
    image: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: ["Real Estate", "Nigeria", "Property"],
    },
  },
  { timestamps: true }
);

blogSchema.index({ category: 1, createdAt: -1 });

export const Blog = mongoose.model("Blog", blogSchema);
