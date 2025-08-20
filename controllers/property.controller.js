import { Property } from "../models/property.model.js";

export const getPropertiesByLimit = async (req, res, next) => {
  try {
    const { page, lmt } = req.query;
    const properties = await Property.find()
      .skip((page - 1) * 10)
      .limit(lmt)
      .lean();

    res.status(200).json({
      success: true,
      properties,
      pagination: {
        page,
        limit: lmt,
      },
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

    const properties = await Property.find(query).limit(Number(limit)).lean();

    res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    next(error);
  }
};

export const sortByPrice = async (req, res, next) => {
  try {
    const { order = "asc" } = req.query; // default = ascending

    const properties = await Property.find()
      .sort({ price: order === "desc" ? -1 : 1 }) // sort by price
      .lean();

    res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    next(error);
  }
};

export const sortByTitle = async (req, res, next) => {
  try {
    const { order = "asc" } = req.query;

    const properties = await Property.find()
      .sort({ title: order === "desc" ? -1 : 1 })
      .lean();

    res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    next(error);
  }
};
