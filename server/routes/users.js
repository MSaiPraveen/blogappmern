const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Post = require("../models/post");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");
const { sanitizeUser } = require("../utils/helpers");
const { ROLES, POST_STATUS } = require("../config/constants");

const router = express.Router();

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password -refreshTokens");
    
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put("/me", protect, async (req, res, next) => {
  try {
    const { username, email, bio } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new password are required");
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters");
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(401, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get("/", protect, isAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      users: users.map(sanitizeUser),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== BOOKMARKS ====================
// NOTE: These routes must come BEFORE /:id to avoid route conflicts

// @route   GET /api/users/me/bookmarks
// @desc    Get user's bookmarked posts
// @access  Private
router.get("/me/bookmarks", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "bookmarks",
      select: "-image",
      populate: [
        { path: "author", select: "username name avatar" },
        { path: "category", select: "name slug" }
      ],
      match: { status: POST_STATUS.PUBLISHED }
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Filter out null values (deleted posts)
    const bookmarks = user.bookmarks.filter(Boolean);

    res.json({
      success: true,
      bookmarks: bookmarks.map(post => ({
        ...post.toObject(),
        hasImage: false
      })),
      count: bookmarks.length
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/me/bookmarks/:postId
// @desc    Add/remove bookmark
// @access  Private
router.put("/me/bookmarks/:postId", protect, async (req, res, next) => {
  try {
    const { postId } = req.params;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const user = await User.findById(req.userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const bookmarkIndex = user.bookmarks.indexOf(postId);
    const isBookmarked = bookmarkIndex > -1;

    if (isBookmarked) {
      user.bookmarks.splice(bookmarkIndex, 1);
    } else {
      user.bookmarks.push(postId);
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: isBookmarked ? "Bookmark removed" : "Post bookmarked",
      bookmarked: !isBookmarked,
      bookmarkCount: user.bookmarks.length
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/profile/:username
// @desc    Get public user profile by username
// @access  Public
router.get("/profile/:username", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("username name bio avatar createdAt role");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get user's published posts
    const posts = await Post.find({ 
      author: user._id, 
      status: POST_STATUS.PUBLISHED 
    })
      .select("-image")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get post count
    const postCount = await Post.countDocuments({ 
      author: user._id, 
      status: POST_STATUS.PUBLISHED 
    });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        postCount
      },
      posts: posts.map(p => ({ ...p.toObject(), hasImage: false }))
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (public profile)
// @access  Public
router.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("username name bio avatar createdAt")
      .populate("postCount");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private/Admin
router.put("/:id/role", protect, isAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!Object.values(ROLES).includes(role)) {
      throw new ApiError(400, `Invalid role. Must be one of: ${Object.values(ROLES).join(", ")}`);
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.userId) {
      throw new ApiError(400, "You cannot change your own role");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      message: "User role updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/status
// @desc    Activate/deactivate user (admin only)
// @access  Private/Admin
router.put("/:id/status", protect, isAdmin, async (req, res, next) => {
  try {
    const { isActive } = req.body;

    // Prevent admin from deactivating themselves
    if (req.params.id === req.userId) {
      throw new ApiError(400, "You cannot change your own status");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete("/:id", protect, isAdmin, async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.userId) {
      throw new ApiError(400, "You cannot delete your own account");
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/search
// @desc    Search users by username (for mentions autocomplete)
// @access  Public
router.get("/search", async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: `^${q}`, $options: "i" },
    })
      .select("username name avatar")
      .limit(parseInt(limit))
      .lean();

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
