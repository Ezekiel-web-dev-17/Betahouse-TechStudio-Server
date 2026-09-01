import { Tour } from "../models/tour.model.js";

// Helper to parse date string (YYYY-MM-DD) and time string (e.g., "10:00 AM" or "14:00") into a Date object
const parseDateTime = (dateStr, timeStr) => {
  return new Date(`${dateStr} ${timeStr}`);
};

export const scheduleTour = async (req, res, next) => {
  try {
    const { name, email, phone, propertyId, propertyTitle, date, time, tourType } = req.body;

    if (!name || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Your name, preferred tour date, and time are required.",
      });
    }

    const requestedTime = parseDateTime(date, time).getTime();
    if (isNaN(requestedTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time format.",
      });
    }

    // 1. Fetch all tours for this property on the selected date
    const sameDayTours = await Tour.find({
      propertyId,
      date,
      status: { $ne: "cancelled" }, // ignore cancelled tours
    });

    // 2. Check if any existing tour is within 30 minutes
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const hasConflict = sameDayTours.some((tour) => {
      const existingTime = parseDateTime(tour.date, tour.time).getTime();
      if (isNaN(existingTime)) return false;
      const difference = Math.abs(requestedTime - existingTime);
      return difference < THIRTY_MINUTES_MS; // Conflict if within 30 mins
    });

    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: "A tour is already scheduled within 30 minutes of this time slot. Please choose another time.",
      });
    }

    // 3. Create the tour
    const newTour = await Tour.create({
      name,
      email: email || "",
      phone: phone || "",
      propertyId: propertyId || null,
      propertyTitle: propertyTitle || "",
      date,
      time: time || "10:00 AM",
      tourType: tourType || "In-Person",
    });

    res.status(201).json({
      success: true,
      message: `Tour scheduled successfully for ${date} at ${time}. An advisor will contact you.`,
      tour: newTour,
    });
  } catch (error) {
    next(error);
  }
};


export const getTours = async (req, res, next) => {
  try {
    const tours = await Tour.find().sort({ createdAt: -1 }).populate("propertyId").lean();
    res.status(200).json({
      success: true,
      count: tours.length,
      tours,
    });
  } catch (error) {
    next(error);
  }
};
