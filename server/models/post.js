const mongoose = require("mongoose");
const { POST_STATUS } = require("../config/constants");
const { generateSlug, calculateReadTime } = require("../utils/helpers");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [5, "Content must be at least 5 characters"],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    image: {
      data: Buffer,
      contentType: String,
    },
    coverImageUrl: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    status: {
      type: String,
      enum: Object.values(POST_STATUS),
      default: POST_STATUS.DRAFT,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    readTime: {
      type: Number,
      default: 1,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for comment count
postSchema.virtual("commentCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
  count: true,
});

// Virtual for like count
postSchema.virtual("likeCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Index for text search
postSchema.index({ title: "text", content: "text", tags: "text" });

// Generate slug and read time before saving
postSchema.pre("save", async function (next) {
  // Generate slug from title
  if (this.isModified("title")) {
    let baseSlug = generateSlug(this.title);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await mongoose.models.Post.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }

  // Calculate read time
  if (this.isModified("content")) {
    this.readTime = calculateReadTime(this.content);
  }

  // Auto-generate excerpt if not provided
  if (this.isModified("content") && !this.excerpt) {
    this.excerpt = this.content.substring(0, 200).trim() + "...";
  }

  // Set publishedAt when status changes to published
  if (this.isModified("status") && this.status === POST_STATUS.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Static method to get posts with pagination and filters
postSchema.statics.getPosts = async function (options = {}) {
  const {
    page = 1,
    limit = 10,
    search,
    tag,
    category,
    author,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    featured,
  } = options;

  const query = {};

  // Filter by status (default to published for public)
  if (status) {
    query.status = status;
  }

  // Filter by author
  if (author) {
    query.author = author;
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by tag
  if (tag) {
    query.tags = tag.toLowerCase();
  }

  // Filter by featured
  if (featured !== undefined) {
    query.isFeatured = featured;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    this.find(query)
      .select("-image") // Exclude binary image
      .populate("author", "username name avatar")
      .populate("category", "name slug color")
      .populate("commentCount")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(query),
  ]);

  return {
    posts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

// Instance method to increment views
postSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

// Instance method to toggle like
postSchema.methods.toggleLike = function (userId) {
  const userIdStr = userId.toString();
  const index = this.likes.findIndex((id) => id.toString() === userIdStr);

  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }

  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model("Post", postSchema);