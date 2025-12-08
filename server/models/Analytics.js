const mongoose = require("mongoose");

// Page View Schema - tracks individual page views
const pageViewSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    // Visitor info
    ip: String,
    userAgent: String,
    referer: String,
    // Geographic data
    country: String,
    city: String,
    region: String,
    // Device info
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    browser: String,
    os: String,
    // Page info
    path: {
      type: String,
      required: true,
    },
    // Engagement
    duration: {
      type: Number,
      default: 0, // Time spent in seconds
    },
    scrollDepth: {
      type: Number,
      default: 0, // Percentage scrolled (0-100)
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ post: 1, createdAt: -1 });
pageViewSchema.index({ country: 1 });

// Daily Stats Schema - aggregated daily statistics
const dailyStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    totalUsers: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    totalPosts: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    // Top content
    topPosts: [
      {
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
        views: Number,
      },
    ],
    topAuthors: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        views: Number,
      },
    ],
    // Geographic breakdown
    countryBreakdown: [
      {
        country: String,
        views: Number,
      },
    ],
    // Device breakdown
    deviceBreakdown: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 },
    },
    // Referrer breakdown
    referrerBreakdown: [
      {
        source: String,
        views: Number,
      },
    ],
    // Average engagement
    avgDuration: {
      type: Number,
      default: 0,
    },
    avgScrollDepth: {
      type: Number,
      default: 0,
    },
    bounceRate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

dailyStatsSchema.index({ date: -1 });

// Post Analytics Schema - per-post statistics
const postAnalyticsSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      unique: true,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    uniqueViews: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    bookmarks: {
      type: Number,
      default: 0,
    },
    avgDuration: {
      type: Number,
      default: 0,
    },
    avgScrollDepth: {
      type: Number,
      default: 0,
    },
    // Daily view history (last 30 days)
    viewHistory: [
      {
        date: Date,
        views: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

postAnalyticsSchema.index({ post: 1 });
postAnalyticsSchema.index({ totalViews: -1 });

const PageView = mongoose.model("PageView", pageViewSchema);
const DailyStats = mongoose.model("DailyStats", dailyStatsSchema);
const PostAnalytics = mongoose.model("PostAnalytics", postAnalyticsSchema);

module.exports = { PageView, DailyStats, PostAnalytics };
