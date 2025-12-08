const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const { protect, optionalAuth, isAdmin } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");
const validate = require("../middleware/validate");
const {
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  postIdValidation,
  postSlugValidation,
} = require("../validators/post.validator");
const { POST_STATUS } = require("../config/constants");
const multer = require("multer");

// Multer in-memory storage for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only image files are allowed"), false);
    }
  },
});

// @route   POST /api/posts
// @desc    Create a new blog post
// @access  Private
router.post(
  "/",
  protect,
  upload.single("image"),
  (req, res, next) => {
    console.log("📝 POST /api/posts - Body:", req.body);
    console.log("📝 POST /api/posts - File:", req.file ? "Yes" : "No");
    next();
  },
  createPostValidation,
  validate,
  async (req, res, next) => {
    try {
      const { title, content, excerpt, tags, category, status } = req.body;

      // Parse tags if sent as string
      let parsedTags = tags;
      if (typeof tags === "string") {
        parsedTags = tags.split(",").map((tag) => tag.trim().toLowerCase());
      }

      const postData = {
        title,
        content,
        excerpt,
        author: req.userId,
        category: category || undefined,
        tags: parsedTags || [],
        status: status || POST_STATUS.DRAFT,
      };

      // Handle image upload
      if (req.file) {
        postData.image = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        };
      }

      const post = await Post.create(postData);

      // Populate author info
      await post.populate("author", "username name avatar");
      await post.populate("category", "name slug color");

      // Don't send image data back
      const { image: _img, ...postResponse } = post.toObject();

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: { ...postResponse, hasImage: !!post.image?.data },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/posts
// @desc    Get all published posts with pagination, search, filtering
// @access  Public
router.get("/", getPostsValidation, validate, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      tag,
      category,
      author,
      sortBy,
      sortOrder,
      featured,
    } = req.query;

    const result = await Post.getPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      tag,
      category,
      author,
      status: POST_STATUS.PUBLISHED, // Only published posts for public
      sortBy,
      sortOrder,
      featured: featured === "true" ? true : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/my-posts
// @desc    Get current user's posts (all statuses)
// @access  Private
router.get("/my-posts", protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await Post.getPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      author: req.userId,
      status: status || undefined, // Allow filtering by status
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/tags
// @desc    Get all unique tags
// @access  Public
router.get("/tags", async (req, res, next) => {
  try {
    const tags = await Post.aggregate([
      { $match: { status: POST_STATUS.PUBLISHED } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    res.json({
      success: true,
      tags: tags.map((t) => ({ name: t._id, count: t.count })),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/slug/:slug
// @desc    Get a single post by slug
// @access  Public
router.get("/slug/:slug", postSlugValidation, validate, optionalAuth, async (req, res, next) => {
  try {
    console.log("🔍 GET /api/posts/slug/" + req.params.slug);
    console.log("🔍 User:", req.userId || "not logged in");
    
    // First check if post exists and has image
    const postCheck = await Post.findOne({ slug: req.params.slug }).select("image status author");
    
    console.log("🔍 Post found:", postCheck ? "Yes" : "No");
    
    if (!postCheck) {
      throw new ApiError(404, "Post not found");
    }

    const hasImage = !!(postCheck.image && postCheck.image.data);
    console.log("🔍 Post status:", postCheck.status, "Author:", postCheck.author.toString());

    // Only show published posts to non-authors
    if (postCheck.status !== POST_STATUS.PUBLISHED) {
      if (!req.user || postCheck.author.toString() !== req.userId) {
        console.log("🔍 Access denied - draft post and user is not author");
        throw new ApiError(404, "Post not found");
      }
    }

    const post = await Post.findOne({ slug: req.params.slug })
      .select("-image")
      .populate("author", "username name avatar bio")
      .populate("category", "name slug color")
      .populate("commentCount");

    // Increment views
    await post.incrementViews();

    // Check if current user liked the post
    const isLiked = req.user
      ? post.likes.some((id) => id.toString() === req.userId)
      : false;

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        hasImage,
        isLiked,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/:id
// @desc    Get a single post by ID
// @access  Public
router.get("/:id", postIdValidation, validate, optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .select("-image")
      .populate("author", "username name avatar bio")
      .populate("category", "name slug color")
      .populate("commentCount");

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Only show published posts to non-authors
    if (post.status !== POST_STATUS.PUBLISHED) {
      if (!req.user || post.author._id.toString() !== req.userId) {
        throw new ApiError(404, "Post not found");
      }
    }

    // Increment views
    await post.incrementViews();

    // Check if current user liked the post
    const isLiked = req.user
      ? post.likes.some((id) => id.toString() === req.userId)
      : false;

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        hasImage: !!post.image,
        isLiked,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/posts/:id/image
// @desc    Stream post image
// @access  Public
router.get("/:id/image", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select("image");

    if (!post || !post.image || !post.image.data) {
      throw new ApiError(404, "Image not found");
    }

    res.set("Content-Type", post.image.contentType || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.send(post.image.data);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private (author only)
router.put(
  "/:id",
  protect,
  upload.single("image"),
  postIdValidation,
  updatePostValidation,
  validate,
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check ownership (admin can edit any post)
      if (post.author.toString() !== req.userId && req.user.role !== "admin") {
        throw new ApiError(403, "Not authorized to edit this post");
      }

      const { title, content, excerpt, tags, category, status } = req.body;

      // Update fields
      if (title) post.title = title;
      if (content) post.content = content;
      if (excerpt !== undefined) post.excerpt = excerpt;
      if (category !== undefined) post.category = category || null;
      if (status) post.status = status;

      // Parse and update tags
      if (tags !== undefined) {
        if (typeof tags === "string") {
          post.tags = tags.split(",").map((tag) => tag.trim().toLowerCase());
        } else if (Array.isArray(tags)) {
          post.tags = tags.map((tag) => tag.trim().toLowerCase());
        }
      }

      // Handle image upload
      if (req.file) {
        post.image = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        };
      }

      await post.save();

      // Populate for response
      await post.populate("author", "username name avatar");
      await post.populate("category", "name slug color");

      const { image: _img, ...postResponse } = post.toObject();

      res.json({
        success: true,
        message: "Post updated successfully",
        post: { ...postResponse, hasImage: !!post.image?.data },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.put("/:id/like", protect, postIdValidation, validate, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    await post.toggleLike(req.userId);

    const isLiked = post.likes.some((id) => id.toString() === req.userId);

    res.json({
      success: true,
      message: isLiked ? "Post liked" : "Post unliked",
      likeCount: post.likes.length,
      isLiked,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/posts/:id/feature
// @desc    Feature/unfeature a post (admin only)
// @access  Private/Admin
router.put("/:id/feature", protect, isAdmin, postIdValidation, validate, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    post.isFeatured = !post.isFeatured;
    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: post.isFeatured ? "Post featured" : "Post unfeatured",
      isFeatured: post.isFeatured,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private (author or admin)
router.delete("/:id", protect, postIdValidation, validate, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Check ownership (admin can delete any post)
    if (post.author.toString() !== req.userId && req.user.role !== "admin") {
      throw new ApiError(403, "Not authorized to delete this post");
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;