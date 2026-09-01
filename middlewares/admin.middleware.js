import User from "../models/user.model.js";

export const isAgentOrAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (user.role !== "agent" || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized. Agent or Admin privileges required.",
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};
export const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized. Admin privileges required.",
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};