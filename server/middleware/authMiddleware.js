const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ApiError } = require("./errorHandler");
const { ROLES } = require("../config/constants");

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Not authorized, no token provided");
    }

    const token = authHeader.split(" ")[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request (excluding password)
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = user;
    req.userId = user._id.toString();
    
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(401, "Not authorized, token invalid"));
  }
};

// Optional auth - attach user if token exists, but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }
    
    next();
  } catch {
    // Token invalid, but continue without user
    next();
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role '${req.user.role}' is not authorized to access this route`)
      );
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
};

// Check if user is author or admin
const isAuthorOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== ROLES.AUTHOR && req.user.role !== ROLES.ADMIN)) {
    return next(new ApiError(403, "Author or admin access required"));
  }
  next();
};

module.exports = { protect, optionalAuth, authorize, isAdmin, isAuthorOrAdmin };
