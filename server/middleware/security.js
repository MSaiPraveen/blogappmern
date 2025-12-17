const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Helmet configuration for security headers
const helmetConfig = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Allow popups (Google OAuth / One Tap) to communicate via postMessage by permitting popups
  // Note: this relaxes strict COOP but is required for some OAuth flows that use window.postMessage
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false, // Disable for API-only server
});

// Rate limiter for general API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased for SPA with analytics)
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Separate rate limiter for analytics (more permissive since it's called frequently)
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Analytics can be called more frequently
  message: {
    success: false,
    message: "Too many analytics requests.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
});

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 auth requests per hour
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { helmetConfig, apiLimiter, authLimiter, analyticsLimiter };
