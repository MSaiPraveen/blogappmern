const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get("/", protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.userId };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate("sender", "username name avatar")
      .populate("post", "title slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      read: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get("/unread-count", protect, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.userId,
      read: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put("/:id/read", protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.userId,
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put("/read-all", protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.userId,
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Private
router.delete("/", protect, async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.userId });

    res.json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/notifications/preferences
// @desc    Get notification preferences
// @access  Private
router.get("/preferences", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("notificationPrefs");

    res.json({
      success: true,
      preferences: user.notificationPrefs,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.put("/preferences", protect, async (req, res, next) => {
  try {
    const { email, inApp } = req.body;

    const user = await User.findById(req.userId);
    
    if (email) {
      user.notificationPrefs.email = { ...user.notificationPrefs.email, ...email };
    }
    if (inApp) {
      user.notificationPrefs.inApp = { ...user.notificationPrefs.inApp, ...inApp };
    }

    await user.save();

    res.json({
      success: true,
      preferences: user.notificationPrefs,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
