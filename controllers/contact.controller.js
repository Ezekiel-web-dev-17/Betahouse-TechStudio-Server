import { Contact } from "../models/contact.model.js";

export const createContactInquiry = async (req, res, next) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and message are required fields.",
      });
    }

    const inquiry = await Contact.create({
      fullName,
      email,
      phone: phone || "",
      subject: subject || "General Inquiry",
      message,
    });

    res.status(201).json({
      success: true,
      message: "Thank you for contacting Betahouse! Our team will reach out to you within 24 hours.",
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};

export const getContactInquiries = async (req, res, next) => {
  try {
    const inquiries = await Contact.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    next(error);
  }
};
