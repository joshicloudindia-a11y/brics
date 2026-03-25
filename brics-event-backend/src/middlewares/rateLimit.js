import rateLimit from "express-rate-limit";

/**
 * Global API limiter
 * Applies to ALL /api routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,               // 100 requests / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later."
  }
});

/**
 * OTP limiter (very strict)
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many OTP attempts. Please wait 10 minutes."
  }
});
