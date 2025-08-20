import { Property } from "../models/property.model.js";

export const getPropertiesByLimit = async (req, res, next) => {
  try {
    const { page, lmt } = req.query;
    const cached = await redisClient.get(
      `Property from page: ${page} and limit: ${lmt}`
    );

    if (cached) {
      console.log("✅ Serving from Redis Cache");
      return res.status(200).json({
        success: true,
        property: JSON.parse(cached),
        pagination: {
          page,
          limit: lmt,
        },
        fromCache: true,
      });
    }

    console.log("Query is not found in Cache, querying MongoDB.");

    const properties = await Property.find()
      .skip((page - 1) * 10)
      .limit(lmt)
      .lean();

    await redisClient.setEx(
      `Property from page: ${page} and limit: ${lmt}`,
      60 * 60 * 60,
      JSON.stringify(properties)
    );

    res.status(200).json({
      success: true,
      properties,
      pagination: {
        page,
        limit: lmt,
      },
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};

export const filterProperties = async (req, res, next) => {
  try {
    const { locate, bed, type, limit = 10 } = req.query;

    let query = {};
    if (locate) query.location = locate;
    if (bed) query.bed = Number(bed);
    if (type) query.propertyType = type;

    const cached = await redisClient.get(
      `Property  filtered by noOfBedroom: ${query.bed}, propertyType: ${query.propertyType}, at: ${query.location}.`
    );

    if (cached) {
      console.log("✅ Serving from Redis Cache");
      return res.status(200).json({
        success: true,
        property: JSON.parse(cached),
        pagination: {
          page,
          limit: lmt,
        },
        fromCache: true,
      });
    }

    console.log("Query is not found in Cache, querying MongoDB.");

    const properties = await Property.find(query).limit(Number(limit)).lean();
    await redisClient.setEx(
      `Property  filtered by noOfBedroom: ${query.bed}, propertyType: ${query.propertyType}, at: ${query.location}.`,
      60 * 60 * 60,
      JSON.stringify(properties)
    );

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
    const { order = "asc" } = req.query;

    const cached = await redisClient.get(
      `Property price in ${order === "asc" ? "ascending" : "descending"} order.`
    );

    if (cached) {
      console.log("✅ Serving from Redis Cache");
      return res.status(200).json({
        success: true,
        properties: JSON.parse(cached),
        fromCache: true,
      });
    }

    console.log("Query is not found in Cache, querying MongoDB.");

    const properties = await Property.find()
      .sort({ price: order === "asc" ? 1 : -1 }) // sort by price
      .lean();

    await redisClient.setEx(
      `Property price in ${
        order === "asc" ? "ascending" : "descending"
      } order.`,
      60 * 60 * 20,
      JSON.stringify(properties)
    );

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
    const { order = "asc" } = req.query;

    const cached = await redisClient.get(
      `Property title in ${order === "asc" ? "ascending" : "descending"} order.`
    );

    if (cached) {
      console.log("✅ Serving from Redis Cache");
      return res.status(200).json({
        success: true,
        properties: JSON.parse(cached),
        fromCache: true,
      });
    }

    const properties = await Property.find()
      .sort({ title: order === "desc" ? -1 : 1 })
      .lean();

    await redisClient.setEx(
      `Property title in ${
        order === "asc" ? "ascending" : "descending"
      } order.`,
      60 * 60 * 20,
      JSON.stringify(properties)
    );

    res.status(200).json({
      success: true,
      properties,
      fromCache: false,
    });
  } catch (error) {
    next(error);
  }
};
