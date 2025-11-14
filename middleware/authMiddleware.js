import jwt from "jsonwebtoken";
import User from "../models/usermodel.js"; // adjust path if needed

export const protect = async (req, res, next) => {
  try {
    // 1) Get token from cookie or Authorization header
    const tokenFromCookie = req.cookies?.token;
    const authHeader = req.headers?.authorization;
    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = tokenFromCookie || tokenFromHeader || req.body?.token || req.query?.token;

    // 2) Decide response style: HTML pages should redirect, API should return JSON
    const wantsHtml = req.accepts && req.accepts("html") && !req.xhr;

    if (!token) {
      if (wantsHtml) return res.redirect("/login");
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    // 3) Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (wantsHtml) return res.redirect("/login");
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }

    // 4) Load user from DB (optional: do not include password)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      if (wantsHtml) return res.redirect("/login");
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // 5) Attach user to request and continue
    req.user = user;
    return next();
  } catch (error) {
    console.error("Protect middleware error:", error);
    // fallback - do not leak internal error to browser
    const wantsHtml = req.accepts && req.accepts("html") && !req.xhr;
    if (wantsHtml) return res.redirect("/login");
    return res.status(500).json({ message: "Server error in auth middleware" });
  }
};


