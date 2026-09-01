import { Blog } from "../models/blog.model.js";
import redisClient from "../redis.js";

const DEFAULT_CACHE_TTL = 60 * 60; // 1 hour

const getFromCache = async (key) => {
  try {
    if (!redisClient.isOpen) return null;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn(`Redis GET failed for blog key "${key}":`, err.message);
    return null;
  }
};

const setInCache = async (key, ttl, value) => {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn(`Redis SET failed for blog key "${key}":`, err.message);
  }
};

export const invalidateBlogCache = async (blogId) => {
  try {
    if (!redisClient.isOpen) return;
    if (blogId) {
      await redisClient.del(`blogs:item:${blogId}`);
    }
    const keys = await redisClient.keys("blogs:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.warn("Error invalidating blog cache:", err.message);
  }
};

export const getAllBlogs = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));

    let query = {};
    if (category && category !== "All") {
      query.category = new RegExp(`^${category}$`, "i");
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { summary: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
      ];
    }

    const cacheKey = `blogs:list:cat:${category || "all"}:search:${search || "none"}:page:${page}:limit:${limit}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        ...cached,
        fromCache: true,
      });
    }

    const [total, blogs] = await Promise.all([
      Blog.countDocuments(query),
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const result = {
      blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, result);

    res.status(200).json({
      success: true,
      ...result,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const getBlogByIdOrSlug = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `blogs:item:${id}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        blog: cached,
        fromCache: true,
      });
    }

    let blog = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(id).lean();
    } else {
      blog = await Blog.findOne({
        $or: [{ slug: id }, { title: new RegExp(id.replace(/-/g, " "), "i") }],
      }).lean();
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog article not found",
      });
    }

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, blog);

    res.status(200).json({
      success: true,
      blog,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const createBlog = async (req, res, next) => {
  try {
    const { title, slug } = req.body;
    const autoSlug =
      slug ||
      title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const newBlog = await Blog.create({
      ...req.body,
      slug: autoSlug,
    });

    await invalidateBlogCache();

    res.status(201).json({
      success: true,
      message: "Blog article created successfully",
      blog: newBlog,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Blog article not found" });
    }

    await invalidateBlogCache(id);
    res.status(200).json({
      success: true,
      message: "Blog article updated successfully",
      blog: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Blog article not found" });
    }

    await invalidateBlogCache(id);
    res.status(200).json({
      success: true,
      message: "Blog article deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
