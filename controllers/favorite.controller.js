import User from "../models/user.model.js";
import { Property } from "../models/property.model.js";

export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the property
    let property = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      property = await Property.findById(id);
    } else {
      property = await Property.findOne({ title: new RegExp(id, "i") });
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const user = await User.findById(userId);
    const propIdStr = property._id.toString();
    const isFavorited = user.favorites.some((fav) => fav.toString() === propIdStr);

    if (isFavorited) {
      // Remove from favorites
      user.favorites = user.favorites.filter((fav) => fav.toString() !== propIdStr);
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Property removed from favorites",
        isFavorited: false,
        favorites: user.favorites,
      });
    } else {
      // Add to favorites
      user.favorites.push(property._id);
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Property added to favorites!",
        isFavorited: true,
        favorites: user.favorites,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("favorites").lean();

    res.status(200).json({
      success: true,
      count: user.favorites?.length || 0,
      favorites: user.favorites || [],
    });
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    user.favorites = user.favorites.filter((fav) => fav.toString() !== id);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Property removed from favorites",
      favorites: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};
