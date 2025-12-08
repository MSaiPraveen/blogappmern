const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Subscriber = require("../models/Subscriber");
const User = require("../models/User");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post("/subscribe", async (req, res, next) => {
  try {
    const { email, name, frequency = "weekly" } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    // Check if already subscribed
    let subscriber = await Subscriber.findOne({ email });

    if (subscriber) {
      if (subscriber.status === "active") {
        throw new ApiError(400, "This email is already subscribed");
      }
      // Reactivate unsubscribed user
      subscriber.status = "pending";
      subscriber.confirmToken = crypto.randomBytes(32).toString("hex");
      subscriber.unsubscribedAt = null;
      subscriber.unsubscribeReason = null;
    } else {
      subscriber = new Subscriber({
        email,
        name,
        frequency,
        confirmToken: crypto.randomBytes(32).toString("hex"),
      });
    }

    await subscriber.save();

    // TODO: Send confirmation email
    // For now, auto-confirm
    subscriber.status = "active";
    subscriber.confirmedAt = new Date();
    subscriber.confirmToken = null;
    await subscriber.save();

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to newsletter!",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/newsletter/confirm/:token
// @desc    Confirm newsletter subscription
// @access  Public
router.post("/confirm/:token", async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findOne({
      confirmToken: req.params.token,
      status: "pending",
    });

    if (!subscriber) {
      throw new ApiError(400, "Invalid or expired confirmation token");
    }

    subscriber.status = "active";
    subscriber.confirmedAt = new Date();
    subscriber.confirmToken = null;
    await subscriber.save();

    res.json({
      success: true,
      message: "Email confirmed! You are now subscribed.",
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post("/unsubscribe", async (req, res, next) => {
  try {
    const { email, reason } = req.body;

    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      throw new ApiError(404, "Email not found in our subscriber list");
    }

    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date();
    subscriber.unsubscribeReason = reason;
    await subscriber.save();

    // Also update user if they have an account
    if (subscriber.user) {
      await User.findByIdAndUpdate(subscriber.user, {
        "newsletter.subscribed": false,
      });
    }

    res.json({
      success: true,
      message: "You have been unsubscribed from our newsletter",
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/newsletter/preferences
// @desc    Update newsletter preferences
// @access  Private
router.put("/preferences", protect, async (req, res, next) => {
  try {
    const { frequency, interests } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (frequency) {
      user.newsletter.frequency = frequency;
    }

    await user.save();

    // Also update subscriber record if exists
    await Subscriber.findOneAndUpdate(
      { user: req.userId },
      { frequency, interests }
    );

    res.json({
      success: true,
      message: "Preferences updated",
      newsletter: user.newsletter,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/newsletter/status
// @desc    Get current user's newsletter status
// @access  Private
router.get("/status", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("newsletter email");
    const subscriber = await Subscriber.findOne({ email: user.email });

    res.json({
      success: true,
      subscribed: subscriber?.status === "active" || user.newsletter?.subscribed,
      frequency: subscriber?.frequency || user.newsletter?.frequency,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all subscribers (admin)
// @access  Private/Admin
router.get("/subscribers", protect, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Subscriber.countDocuments(query);
    const stats = {
      total: await Subscriber.countDocuments(),
      active: await Subscriber.countDocuments({ status: "active" }),
      pending: await Subscriber.countDocuments({ status: "pending" }),
      unsubscribed: await Subscriber.countDocuments({ status: "unsubscribed" }),
    };

    res.json({
      success: true,
      subscribers,
      stats,
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

module.exports = router;
