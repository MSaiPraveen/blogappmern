const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, optionalAuth, isAdmin } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");
const validate = require("../middleware/validate");
const {
  createCommentValidation,
  updateCommentValidation,
  getCommentsValidation,
  commentIdValidation,
} = require("../validators/comment.validator");
const { COMMENT_STATUS, ROLES } = require("../config/constants");

// @route   POST /api/comments/:postId
// @desc    Add a comment to a post
// @access  Private
router.post(
  "/:postId",
  protect,
  createCommentValidation,
  validate,
  async (req, res, next) => {
    try {
      const { content, parentComment } = req.body;

      // Verify post exists
      const post = await Post.findById(req.params.postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      let depth = 0;
      let parentCommentDoc = null;

      // If this is a reply, verify parent comment exists
      if (parentComment) {
        parentCommentDoc = await Comment.findById(parentComment);
        if (!parentCommentDoc) {
          throw new ApiError(404, "Parent comment not found");
        }
        if (parentCommentDoc.post.toString() !== req.params.postId) {
          throw new ApiError(400, "Parent comment belongs to a different post");
        }
        // Calculate depth (max 3 levels)
        depth = Math.min(parentCommentDoc.depth + 1, 3);
      }

      // Parse mentions from content
      const mentionedUsernames = Comment.parseMentions(content);
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await User.find({ 
          username: { $in: mentionedUsernames } 
        }).select("_id username");
        mentionedUserIds = mentionedUsers.map(u => u._id);
        
        // Create notifications for mentioned users
        const mentionNotifications = mentionedUsers
          .filter(u => u._id.toString() !== req.userId) // Don't notify self
          .map(u => ({
            recipient: u._id,
            sender: req.userId,
            type: "mention",
            post: req.params.postId,
            message: `mentioned you in a comment`,
          }));
        
        if (mentionNotifications.length > 0) {
          await Notification.insertMany(mentionNotifications);
        }
      }

      const comment = await Comment.create({
        content,
        post: req.params.postId,
        author: req.userId,
        parentComment: parentComment || null,
        depth,
        mentions: mentionedUserIds,
        status: COMMENT_STATUS.APPROVED, // Auto-approve for now
      });

      await comment.populate("author", "username name avatar");
      await comment.populate("mentions", "username name");

      // Notify parent comment author if this is a reply
      if (parentCommentDoc && parentCommentDoc.author.toString() !== req.userId) {
        await Notification.create({
          recipient: parentCommentDoc.author,
          sender: req.userId,
          type: "comment",
          post: req.params.postId,
          comment: comment._id,
          message: `replied to your comment`,
        });
      }

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/comments/:postId
// @desc    Get comments for a post
// @access  Public
router.get(
  "/:postId",
  getCommentsValidation,
  validate,
  optionalAuth,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sort = "best" } = req.query;

      // Verify post exists
      const post = await Post.findById(req.params.postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      const result = await Comment.getPostComments(req.params.postId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status: COMMENT_STATUS.APPROVED,
        includeReplies: true,
      });

      // Helper to add user vote status
      const addVoteStatus = (comment) => {
        const isLiked = comment.likes?.some(
          (id) => id.toString() === req.userId
        ) || false;
        const userVote = comment.upvotes?.some(id => id.toString() === req.userId) 
          ? "up" 
          : comment.downvotes?.some(id => id.toString() === req.userId) 
            ? "down" 
            : null;
        const voteScore = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);
        
        return {
          ...comment,
          isLiked,
          userVote,
          voteScore,
        };
      };

      // Mark liked/voted status if user is logged in
      if (req.user) {
        result.comments = result.comments.map((comment) => ({
          ...addVoteStatus(comment),
          replies: comment.replies?.map(addVoteStatus) || [],
        }));
      } else {
        // Still calculate vote scores for non-logged in users
        result.comments = result.comments.map((comment) => ({
          ...comment,
          voteScore: (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0),
          replies: comment.replies?.map(reply => ({
            ...reply,
            voteScore: (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0),
          })) || [],
        }));
      }

      // Sort comments based on preference
      if (sort === "best") {
        result.comments.sort((a, b) => b.voteScore - a.voteScore);
      } else if (sort === "newest") {
        result.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sort === "oldest") {
        result.comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/comments/pending
// @desc    Get pending comments (for moderation)
// @access  Private/Admin
router.get("/moderation/pending", protect, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comments, total] = await Promise.all([
      Comment.find({ status: COMMENT_STATUS.PENDING })
        .populate("author", "username name avatar")
        .populate("post", "title slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Comment.countDocuments({ status: COMMENT_STATUS.PENDING }),
    ]);

    res.json({
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
// @access  Private (author only)
router.put(
  "/:commentId",
  protect,
  updateCommentValidation,
  validate,
  async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.commentId);

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Check ownership
      if (comment.author.toString() !== req.userId) {
        throw new ApiError(403, "Not authorized to edit this comment");
      }

      const { content } = req.body;

      if (content) {
        comment.content = content;
        comment.isEdited = true;
        comment.editedAt = new Date();
      }

      await comment.save();
      await comment.populate("author", "username name avatar");

      res.json({
        success: true,
        message: "Comment updated successfully",
        comment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/comments/:commentId/status
// @desc    Update comment status (moderation)
// @access  Private/Admin or Post Author
router.put(
  "/:commentId/status",
  protect,
  commentIdValidation,
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body;

      if (!Object.values(COMMENT_STATUS).includes(status)) {
        throw new ApiError(
          400,
          `Invalid status. Must be one of: ${Object.values(COMMENT_STATUS).join(", ")}`
        );
      }

      const comment = await Comment.findById(req.params.commentId).populate("post");

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Allow admin or post author to moderate
      const isPostAuthor = comment.post.author.toString() === req.userId;
      const isAdminUser = req.user.role === ROLES.ADMIN;

      if (!isPostAuthor && !isAdminUser) {
        throw new ApiError(403, "Not authorized to moderate this comment");
      }

      comment.status = status;
      await comment.save();

      res.json({
        success: true,
        message: `Comment ${status}`,
        comment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/comments/:commentId/like
// @desc    Like/unlike a comment
// @access  Private
router.put(
  "/:commentId/like",
  protect,
  commentIdValidation,
  validate,
  async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.commentId);

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      await comment.toggleLike(req.userId);

      const isLiked = comment.likes.some((id) => id.toString() === req.userId);

      res.json({
        success: true,
        message: isLiked ? "Comment liked" : "Comment unliked",
        likeCount: comment.likes.length,
        isLiked,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/comments/:commentId/vote
// @desc    Upvote/downvote a comment
// @access  Private
router.put(
  "/:commentId/vote",
  protect,
  commentIdValidation,
  validate,
  async (req, res, next) => {
    try {
      const { vote } = req.body; // "up", "down", or "none"
      
      if (!["up", "down", "none"].includes(vote)) {
        throw new ApiError(400, "Vote must be 'up', 'down', or 'none'");
      }

      const comment = await Comment.findById(req.params.commentId);

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      await comment.vote(req.userId, vote);

      const voteScore = comment.upvotes.length - comment.downvotes.length;
      const userVote = comment.upvotes.some(id => id.toString() === req.userId) 
        ? "up" 
        : comment.downvotes.some(id => id.toString() === req.userId) 
          ? "down" 
          : null;

      res.json({
        success: true,
        message: vote === "none" ? "Vote removed" : `Comment ${vote}voted`,
        voteScore,
        userVote,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/comments/:commentId/replies
// @desc    Get replies for a comment (for loading more replies)
// @access  Public
router.get(
  "/:commentId/replies",
  optionalAuth,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const comment = await Comment.findById(req.params.commentId);
      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      const [replies, total] = await Promise.all([
        Comment.find({ 
          parentComment: req.params.commentId,
          status: COMMENT_STATUS.APPROVED,
        })
          .populate("author", "username name avatar")
          .populate("mentions", "username name")
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Comment.countDocuments({ 
          parentComment: req.params.commentId,
          status: COMMENT_STATUS.APPROVED,
        }),
      ]);

      // Add vote status
      const processedReplies = replies.map(reply => {
        const voteScore = (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0);
        const userVote = req.user 
          ? reply.upvotes?.some(id => id.toString() === req.userId) 
            ? "up" 
            : reply.downvotes?.some(id => id.toString() === req.userId) 
              ? "down" 
              : null
          : null;
        
        return {
          ...reply,
          voteScore,
          userVote,
          isLiked: req.user ? reply.likes?.some(id => id.toString() === req.userId) : false,
        };
      });

      res.json({
        success: true,
        replies: processedReplies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/comments/single/:commentId
// @desc    Delete a comment
// @access  Private (author, post author, or admin)
router.delete(
  "/single/:commentId",
  protect,
  async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.commentId).populate("post");

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Allow comment author, post author, or admin to delete
      const isCommentAuthor = comment.author.toString() === req.userId;
      const isPostAuthor = comment.post.author.toString() === req.userId;
      const isAdminUser = req.user.role === ROLES.ADMIN;

      if (!isCommentAuthor && !isPostAuthor && !isAdminUser) {
        throw new ApiError(403, "Not authorized to delete this comment");
      }

      // Also delete all replies to this comment
      await Comment.deleteMany({ parentComment: comment._id });
      await comment.deleteOne();

      res.json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
