const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");

// @route   POST /api/social/follow/:userId
// @desc    Follow a user
// @access  Private
router.post("/follow/:userId", protect, async (req, res, next) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!userToFollow) {
      throw new ApiError(404, "User not found");
    }

    if (req.params.userId === req.userId) {
      throw new ApiError(400, "You cannot follow yourself");
    }

    // Check if already following
    if (currentUser.following.includes(req.params.userId)) {
      throw new ApiError(400, "You are already following this user");
    }

    // Add to following/followers
    currentUser.following.push(req.params.userId);
    userToFollow.followers.push(req.userId);

    await Promise.all([currentUser.save(), userToFollow.save()]);

    // Create notification for the followed user
    await Notification.createNotification({
      recipient: userToFollow._id,
      sender: currentUser._id,
      type: "follow",
      title: "New Follower",
      message: `${currentUser.name || currentUser.username} started following you`,
      link: `/user/${currentUser.username}`,
    });

    res.json({
      success: true,
      message: `You are now following ${userToFollow.username}`,
      following: true,
      followersCount: userToFollow.followers.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/social/follow/:userId
// @desc    Unfollow a user
// @access  Private
router.delete("/follow/:userId", protect, async (req, res, next) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.userId);

    if (!userToUnfollow) {
      throw new ApiError(404, "User not found");
    }

    if (!currentUser.following.includes(req.params.userId)) {
      throw new ApiError(400, "You are not following this user");
    }

    // Remove from following/followers
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== req.params.userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== req.userId
    );

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    res.json({
      success: true,
      message: `You have unfollowed ${userToUnfollow.username}`,
      following: false,
      followersCount: userToUnfollow.followers.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/following
// @desc    Get users I'm following
// @access  Private
router.get("/following", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .populate("following", "username name avatar bio");

    res.json({
      success: true,
      following: user.following,
      count: user.following.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/followers
// @desc    Get my followers
// @access  Private
router.get("/followers", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .populate("followers", "username name avatar bio");

    res.json({
      success: true,
      followers: user.followers,
      count: user.followers.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/user/:userId/followers
// @desc    Get a user's followers
// @access  Public
router.get("/user/:userId/followers", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("followers", "username name avatar bio");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      followers: user.followers,
      count: user.followers.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/user/:userId/following
// @desc    Get users a user is following
// @access  Public
router.get("/user/:userId/following", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("following", "username name avatar bio");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      success: true,
      following: user.following,
      count: user.following.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/check/:userId
// @desc    Check if following a user
// @access  Private
router.get("/check/:userId", protect, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.userId);
    const isFollowing = currentUser.following.includes(req.params.userId);

    res.json({
      success: true,
      isFollowing,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/social/feed
// @desc    Get posts from followed users
// @access  Private
router.get("/feed", protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.userId);
    
    const Post = require("../models/post");
    
    const posts = await Post.find({
      author: { $in: user.following },
      status: "published",
    })
      .populate("author", "username name avatar")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      author: { $in: user.following },
      status: "published",
    });

    res.json({
      success: true,
      posts,
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
