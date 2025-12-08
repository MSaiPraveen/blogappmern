const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/security");
const validate = require("../middleware/validate");
const { registerValidation, loginValidation, updateProfileValidation } = require("../validators/auth.validator");
const { ApiError } = require("../middleware/errorHandler");
const { JWT_EXPIRES_IN } = require("../config/constants");
const { sanitizeUser } = require("../utils/helpers");

const router = express.Router();

// Token expiry times
const ACCESS_TOKEN_EXPIRES = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRES = "7d"; // Longer-lived refresh token

// Generate Access Token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Legacy token generator for backwards compatibility
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  "/register",
  authLimiter,
  registerValidation,
  validate,
  async (req, res, next) => {
    try {
      const { username, email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        throw new ApiError(
          400,
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken"
        );
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password,
        name: name || username,
      });

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  authLimiter,
  loginValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user with password
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Check if account is active
      if (!user.isActive) {
        throw new ApiError(403, "Your account has been deactivated");
      }

      // Verify password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Update last login
      await user.updateLastLogin();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password -refreshTokens");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  updateProfileValidation,
  validate,
  async (req, res, next) => {
    try {
      const { name, bio, avatar } = req.body;

      const user = await User.findByIdAndUpdate(
        req.userId,
        { name, bio, avatar },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new passwords are required");
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters");
    }

    const user = await User.findById(req.userId).select("+password");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      throw new ApiError(401, "Current password is incorrect");
    }

    user.password = newPassword;
    // Invalidate all refresh tokens on password change
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token (with rotation)
// @access  Public
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    // Find user with this refresh token
    const user = await User.findOne({
      "refreshTokens.token": refreshToken,
      "refreshTokens.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated");
    }

    // Remove old refresh token (rotation)
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== refreshToken
    );

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();

    // Save new refresh token
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    });

    // Keep only last 5 refresh tokens (limit device sessions)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate refresh token)
// @access  Private
router.post("/logout", protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove specific refresh token
      await User.findByIdAndUpdate(req.userId, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post("/logout-all", protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      refreshTokens: [],
    });

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
