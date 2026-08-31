import { Property } from "../models/property.model.js";
import redisClient from "../redis.js";

const DEFAULT_CACHE_TTL = 60 * 60; // 1 hour

// Helper to safely get from Redis
const getFromCache = async (key) => {
  try {
    if (!redisClient.isOpen) return null;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn(`Redis GET failed for key "${key}":`, err.message);
    return null;
  }
};

// Helper to safely set in Redis
const setInCache = async (key, ttl, value) => {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn(`Redis SET failed for key "${key}":`, err.message);
  }
};

export const getPropertiesByLimit = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 9));
    const cacheKey = `properties:page:${page}:limit:${limit}`;

    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        properties: cachedData.properties,
        pagination: cachedData.pagination,
        fromCache: true,
      });
    }

    const [total, properties] = await Promise.all([
      Property.countDocuments(),
      Property.find()
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, { properties, pagination });

    res.status(200).json({
      success: true,
      properties,
      pagination,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const filterProperties = async (req, res, next) => {
  try {
    const { locate, bed, type } = req.query;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));

    let query = {};
    if (locate) query.location = new RegExp(locate, "i");
    if (bed) query.bed = Number(bed);
    if (type) query.propertyType = new RegExp(type, "i");

    const cacheKey = `properties:filter:loc:${locate || "any"}:bed:${bed || "any"}:type:${type || "any"}:limit:${limit}`;
    const cached = await getFromCache(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        count: cached.length,
        properties: cached,
        fromCache: true,
      });
    }

    const properties = await Property.find(query).limit(limit).lean();
    await setInCache(cacheKey, DEFAULT_CACHE_TTL, properties);

    res.status(200).json({
      success: true,
      count: properties.length,
      properties,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const sortByPrice = async (req, res, next) => {
  try {
    const order = req.query.order === "desc" ? "desc" : "asc";
    const cacheKey = `properties:sort:price:${order}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        properties: cached,
        fromCache: true,
      });
    }

    const properties = await Property.find()
      .sort({ amount: order === "asc" ? 1 : -1 })
      .lean();

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, properties);

    res.status(200).json({
      success: true,
      properties,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const sortByTitle = async (req, res, next) => {
  try {
    const order = req.query.order === "desc" ? "desc" : "asc";
    const cacheKey = `properties:sort:title:${order}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        properties: cached,
        fromCache: true,
      });
    }

    const properties = await Property.find()
      .sort({ title: order === "desc" ? -1 : 1 })
      .lean();

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, properties);

    res.status(200).json({
      success: true,
      properties,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

