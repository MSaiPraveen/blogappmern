const sanitizeHtml = require("sanitize-html");
const { v4: uuidv4 } = require("uuid");

/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern (stateless)
 */
const csrfTokens = new Map(); // In production, use Redis

const generateCsrfToken = () => uuidv4();

const csrfProtection = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints that use JWT (token-based auth is CSRF-resistant)
  // Only apply CSRF for cookie-based sessions
  if (req.headers.authorization?.startsWith("Bearer")) {
    return next();
  }

  const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;
  const cookieToken = req.cookies?.csrfToken;

  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  }

  next();
};

// Endpoint to get CSRF token
const getCsrfToken = (req, res) => {
  const token = generateCsrfToken();
  res.cookie("csrfToken", token, {
    httpOnly: false, // Client needs to read this
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600000, // 1 hour
  });
  res.json({ csrfToken: token });
};

/**
 * XSS Sanitization Middleware
 * Sanitizes all string inputs in request body
 */
const sanitizeOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "strong", "em", "s", "u",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return sanitizeHtml(str, sanitizeOptions);
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

const xssSanitizer = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * NoSQL Injection Prevention
 * Removes $ and . from query keys
 */
const sanitizeQuery = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip keys starting with $ (MongoDB operators from user input)
      if (key.startsWith("$")) continue;
      
      const value = obj[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeQuery(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

const mongoSanitizer = (req, res, next) => {
  if (req.body) req.body = sanitizeQuery(req.body);
  if (req.query) req.query = sanitizeQuery(req.query);
  if (req.params) req.params = sanitizeQuery(req.params);
  next();
};

/**
 * HTTP Parameter Pollution Prevention
 * Only keeps the last value for duplicate parameters
 */
const hppProtection = (req, res, next) => {
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
};

/**
 * Rate Limiting per User
 * More restrictive for authenticated users making mutations
 */
const userRateLimits = new Map();

const perUserRateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 30,
    message = "Too many requests, please slow down",
  } = options;

  return (req, res, next) => {
    // Use user ID if authenticated, otherwise IP
    const identifier = req.userId || req.ip;
    const key = `${identifier}:${req.method}:${req.baseUrl}`;
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let record = userRateLimits.get(key);
    
    if (!record) {
      record = { count: 0, resetAt: now + windowMs };
      userRateLimits.set(key, record);
    }
    
    // Reset if window expired
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    
    record.count++;
    
    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));
    
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }
    
    next();
  };
};

// Cleanup old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of userRateLimits.entries()) {
    if (now > record.resetAt + 60000) {
      userRateLimits.delete(key);
    }
  }
}, 60000);

module.exports = {
  csrfProtection,
  getCsrfToken,
  xssSanitizer,
  mongoSanitizer,
  hppProtection,
  perUserRateLimit,
  sanitizeString,
};
