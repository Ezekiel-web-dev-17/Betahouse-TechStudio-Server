import { Newsletter } from "../models/newsletter.model.js";

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@") || !email.matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "You are already subscribed to the Betahouse newsletter!",
      });
    }

    await Newsletter.create({ email: email.toLowerCase() });

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to market updates and property alerts!",
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribeNewsletter = async (req, res, next) => {
  const { email } = req.body;
  if (!email || !email.includes("@") || !email.matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address.",
    });
  }
  const existing = await Newsletter.findOne({ email: email.toLowerCase() });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Email not found.",
    });
  }
  await Newsletter.deleteOne({ email: email.toLowerCase() });
  res.status(200).json({
    success: true,
    message: "Successfully unsubscribed from Betahouse newsletter!",
  });
}