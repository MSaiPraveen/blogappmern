const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Config
const connectDB = require("./config/db");

// Middleware
const { helmetConfig, apiLimiter } = require("./middleware/security");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { 
  xssSanitizer, 
  mongoSanitizer, 
  hppProtection,
  getCsrfToken 
} = require("./middleware/securityMiddleware");

const app = express();

// Connect to Database
connectDB();

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

// 🔧 Security Middleware
app.use(helmetConfig);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Cookie parser (for CSRF)
app.use(cookieParser());

// Rate limiting
app.use("/api", apiLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security: XSS, NoSQL injection, HPP protection
app.use(xssSanitizer);
app.use(mongoSanitizer);
app.use(hppProtection);

// Logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// CSRF Token endpoint
app.get("/api/csrf-token", getCsrfToken);

// 📦 Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/oauth", require("./routes/oauth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/users", require("./routes/users"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/social", require("./routes/social"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/newsletter", require("./routes/newsletter"));
app.use("/api/feed", require("./routes/feed"));
app.use("/api", require("./routes/sitemap"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
