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

// Helper to invalidate property cache
export const invalidatePropertyCache = async (propertyId) => {
  try {
    if (!redisClient.isOpen) return;
    if (propertyId) {
      await redisClient.del(`properties:item:${propertyId}`);
    }
    // Delete known list/sort/filter cache keys or use scan
    const keys = await redisClient.keys("properties:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.warn("Error invalidating property cache:", err.message);
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

export const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `properties:item:${id}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        property: cached,
        fromCache: true,
      });
    }

    let property = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      property = await Property.findById(id).lean();
    } else {
      property = await Property.findOne({ title: new RegExp(id, "i") }).lean();
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    await setInCache(cacheKey, DEFAULT_CACHE_TTL, property);

    res.status(200).json({
      success: true,
      property,
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
    const order = req.query.order === "desc" || req.query.order === "des" ? "desc" : "asc";
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
    const order = req.query.order === "desc" || req.query.order === "des" ? "desc" : "asc";
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

export const createProperty = async (req, res, next) => {
  try {
    const existingProperty = await Property.findOne({
      location: new RegExp(req.body.location, "i"),
      title: new RegExp(req.body.title, "i"),
    })

    if (existingProperty) {
      return res.status(400).json({
        success: false,
        message: "Property already exists",
      });
    }
    const newProperty = await Property.create(req.body);
    await invalidatePropertyCache();
    res.status(201).json({
      success: true,
      message: "Property created successfully",
      property: newProperty,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Property.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    await invalidatePropertyCache(id);
    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      property: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Property.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    await invalidatePropertyCache(id);
    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
