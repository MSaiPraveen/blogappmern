const mongoose = require("mongoose");
const { COMMENT_STATUS } = require("../config/constants");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [2, "Comment must be at least 2 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(COMMENT_STATUS),
      default: COMMENT_STATUS.APPROVED, // Auto-approve by default
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    // Depth level for nested comments (0 = top-level, 1 = reply, 2 = reply to reply, etc.)
    depth: {
      type: Number,
      default: 0,
      max: 3, // Limit nesting to 3 levels
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Upvotes and downvotes for Reddit-style voting
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Mentioned users
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for reply count
commentSchema.virtual("replyCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
  count: true,
});

// Virtual for like count
commentSchema.virtual("likeCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for vote score (upvotes - downvotes)
commentSchema.virtual("voteScore").get(function () {
  const up = this.upvotes ? this.upvotes.length : 0;
  const down = this.downvotes ? this.downvotes.length : 0;
  return up - down;
});

// Static method to get comments for a post
commentSchema.statics.getPostComments = async function (postId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = COMMENT_STATUS.APPROVED,
    includeReplies = true,
  } = options;

  const query = {
    post: postId,
    parentComment: null, // Only top-level comments
  };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    this.find(query)
      .populate("author", "username name avatar")
      .populate("replyCount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  // Fetch replies if requested
  if (includeReplies) {
    const commentIds = comments.map((c) => c._id);
    const replies = await this.find({
      parentComment: { $in: commentIds },
      status: COMMENT_STATUS.APPROVED,
    })
      .populate("author", "username name avatar")
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by parent comment
    const repliesByParent = replies.reduce((acc, reply) => {
      const parentId = reply.parentComment.toString();
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(reply);
      return acc;
    }, {});

    // Attach replies to their parent comments
    comments.forEach((comment) => {
      comment.replies = repliesByParent[comment._id.toString()] || [];
    });
  }

  return {
    comments,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

// Instance method to toggle like
commentSchema.methods.toggleLike = function (userId) {
  const userIdStr = userId.toString();
  const index = this.likes.findIndex((id) => id.toString() === userIdStr);

  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }

  return this.save({ validateBeforeSave: false });
};

// Instance method to vote (upvote/downvote)
commentSchema.methods.vote = function (userId, voteType) {
  const userIdStr = userId.toString();
  
  // Remove from both arrays first
  this.upvotes = this.upvotes.filter((id) => id.toString() !== userIdStr);
  this.downvotes = this.downvotes.filter((id) => id.toString() !== userIdStr);
  
  // Add to appropriate array if not removing vote
  if (voteType === "up") {
    this.upvotes.push(userId);
  } else if (voteType === "down") {
    this.downvotes.push(userId);
  }
  // If voteType is "none", user's vote is just removed
  
  return this.save({ validateBeforeSave: false });
};

// Static method to parse mentions from content
commentSchema.statics.parseMentions = function (content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]); // username without @
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};

module.exports = mongoose.model("Comment", commentSchema);
