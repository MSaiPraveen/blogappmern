const express = require("express");
const router = express.Router();
const { PageView, DailyStats, PostAnalytics } = require("../models/Analytics");
const Post = require("../models/post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Helper to get device type from user agent
const getDeviceType = (userAgent) => {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
};

// Helper to get browser from user agent
const getBrowser = (userAgent) => {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  return "Other";
};

// Helper to get OS from user agent
const getOS = (userAgent) => {
  if (!userAgent) return "Unknown";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone")) return "iOS";
  return "Other";
};

// Helper to parse referrer source
const getReferrerSource = (referer) => {
  if (!referer) return "Direct";
  try {
    const url = new URL(referer);
    const domain = url.hostname.replace("www.", "");
    if (domain.includes("google")) return "Google";
    if (domain.includes("facebook")) return "Facebook";
    if (domain.includes("twitter") || domain.includes("x.com")) return "Twitter/X";
    if (domain.includes("linkedin")) return "LinkedIn";
    if (domain.includes("reddit")) return "Reddit";
    if (domain.includes("github")) return "GitHub";
    return domain;
  } catch {
    return "Direct";
  }
};

// @desc    Track page view
// @route   POST /api/analytics/track
// @access  Public
router.post("/track", async (req, res) => {
  try {
    const { path, postId, duration, scrollDepth, sessionId } = req.body;
    const userAgent = req.headers["user-agent"];
    const referer = req.headers.referer || req.headers.referrer;
    const ip = req.ip || req.connection.remoteAddress;

    // Create page view record
    const pageView = new PageView({
      post: postId || null,
      user: req.user?._id || null,
      sessionId: sessionId || `anon-${Date.now()}`,
      ip: ip?.replace("::ffff:", ""),
      userAgent,
      referer,
      path,
      device: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
      duration: duration || 0,
      scrollDepth: scrollDepth || 0,
    });

    await pageView.save();

    // Update post analytics if post view
    if (postId) {
      await PostAnalytics.findOneAndUpdate(
        { post: postId },
        {
          $inc: { totalViews: 1 },
          $push: {
            viewHistory: {
              $each: [{ date: new Date(), views: 1 }],
              $slice: -30, // Keep last 30 entries
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    res.status(500).json({ message: "Failed to track" });
  }
});

// @desc    Get dashboard overview stats
// @route   GET /api/analytics/overview
// @access  Private/Admin
router.get("/overview", protect, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);

    // Get total counts
    const [
      totalPosts,
      totalUsers,
      totalComments,
      totalViews,
      todayViews,
      yesterdayViews,
      weekViews,
      monthViews,
      uniqueVisitorsToday,
      newUsersToday,
    ] = await Promise.all([
      Post.countDocuments({ status: "published" }),
      User.countDocuments(),
      Comment.countDocuments({ status: "approved" }),
      PageView.countDocuments(),
      PageView.countDocuments({ createdAt: { $gte: today } }),
      PageView.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
      PageView.countDocuments({ createdAt: { $gte: lastWeek } }),
      PageView.countDocuments({ createdAt: { $gte: lastMonth } }),
      PageView.distinct("sessionId", { createdAt: { $gte: today } }).then(r => r.length),
      User.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // Calculate growth percentages
    const viewsGrowth = yesterdayViews > 0 
      ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) 
      : 100;

    res.json({
      totals: {
        posts: totalPosts,
        users: totalUsers,
        comments: totalComments,
        views: totalViews,
      },
      today: {
        views: todayViews,
        uniqueVisitors: uniqueVisitorsToday,
        newUsers: newUsersToday,
        viewsGrowth,
      },
      periods: {
        yesterday: yesterdayViews,
        week: weekViews,
        month: monthViews,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// @desc    Get views over time chart data
// @route   GET /api/analytics/views-over-time
// @access  Private/Admin
router.get("/views-over-time", protect, isAdmin, async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    
    let startDate = new Date();
    let groupFormat;
    
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const viewsData = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupFormat,
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          views: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" },
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.json(viewsData);
  } catch (error) {
    console.error("Views over time error:", error);
    res.status(500).json({ message: "Failed to fetch views data" });
  }
});

// @desc    Get engagement metrics
// @route   GET /api/analytics/engagement
// @access  Private/Admin
router.get("/engagement", protect, isAdmin, async (req, res) => {
  try {
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    const [engagementData, likesData, commentsData] = await Promise.all([
      // Average duration and scroll depth
      PageView.aggregate([
        { $match: { createdAt: { $gte: lastMonth }, duration: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$duration" },
            avgScrollDepth: { $avg: "$scrollDepth" },
            totalSessions: { $addToSet: "$sessionId" },
            singlePageSessions: {
              $push: { sessionId: "$sessionId", path: "$path" },
            },
          },
        },
      ]),
      // Likes trend
      Post.aggregate([
        { $unwind: "$likes" },
        { $match: { "likes.createdAt": { $gte: lastMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$likes.createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", likes: "$count", _id: 0 } },
      ]).catch(() => []),
      // Comments trend
      Comment.aggregate([
        { $match: { createdAt: { $gte: lastMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", comments: "$count", _id: 0 } },
      ]),
    ]);

    const metrics = engagementData[0] || {
      avgDuration: 0,
      avgScrollDepth: 0,
      totalSessions: [],
    };

    // Calculate bounce rate (sessions with only one page view)
    const sessionCounts = {};
    (metrics.singlePageSessions || []).forEach((s) => {
      sessionCounts[s.sessionId] = (sessionCounts[s.sessionId] || 0) + 1;
    });
    const singlePageCount = Object.values(sessionCounts).filter((c) => c === 1).length;
    const bounceRate = metrics.totalSessions?.length > 0
      ? Math.round((singlePageCount / metrics.totalSessions.length) * 100)
      : 0;

    res.json({
      avgDuration: Math.round(metrics.avgDuration || 0),
      avgScrollDepth: Math.round(metrics.avgScrollDepth || 0),
      bounceRate,
      likesOverTime: likesData,
      commentsOverTime: commentsData,
    });
  } catch (error) {
    console.error("Engagement metrics error:", error);
    res.status(500).json({ message: "Failed to fetch engagement data" });
  }
});

// @desc    Get popular posts
// @route   GET /api/analytics/popular-posts
// @access  Private/Admin
router.get("/popular-posts", protect, isAdmin, async (req, res) => {
  try {
    const { period = "30d", limit = 10 } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const popularPosts = await PageView.aggregate([
      { $match: { post: { $ne: null }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$post",
          views: { $sum: 1 },
          uniqueViews: { $addToSet: "$sessionId" },
          avgDuration: { $avg: "$duration" },
        },
      },
      {
        $project: {
          _id: 1,
          views: 1,
          uniqueViews: { $size: "$uniqueViews" },
          avgDuration: { $round: ["$avgDuration", 0] },
        },
      },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "post",
        },
      },
      { $unwind: "$post" },
      {
        $lookup: {
          from: "users",
          localField: "post.author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $project: {
          _id: 1,
          views: 1,
          uniqueViews: 1,
          avgDuration: 1,
          title: "$post.title",
          slug: "$post.slug",
          author: {
            _id: "$author._id",
            name: "$author.name",
            username: "$author.username",
          },
          likes: { $size: { $ifNull: ["$post.likes", []] } },
        },
      },
    ]);

    res.json(popularPosts);
  } catch (error) {
    console.error("Popular posts error:", error);
    res.status(500).json({ message: "Failed to fetch popular posts" });
  }
});

// @desc    Get popular authors
// @route   GET /api/analytics/popular-authors
// @access  Private/Admin
router.get("/popular-authors", protect, isAdmin, async (req, res) => {
  try {
    const { period = "30d", limit = 10 } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const popularAuthors = await PageView.aggregate([
      { $match: { post: { $ne: null }, createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          as: "postData",
        },
      },
      { $unwind: "$postData" },
      {
        $group: {
          _id: "$postData.author",
          totalViews: { $sum: 1 },
          uniqueViews: { $addToSet: "$sessionId" },
          posts: { $addToSet: "$post" },
        },
      },
      {
        $project: {
          totalViews: 1,
          uniqueViews: { $size: "$uniqueViews" },
          postCount: { $size: "$posts" },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $project: {
          _id: 1,
          totalViews: 1,
          uniqueViews: 1,
          postCount: 1,
          name: "$author.name",
          username: "$author.username",
          avatar: "$author.avatar",
        },
      },
    ]);

    res.json(popularAuthors);
  } catch (error) {
    console.error("Popular authors error:", error);
    res.status(500).json({ message: "Failed to fetch popular authors" });
  }
});

// @desc    Get geographic data
// @route   GET /api/analytics/geographic
// @access  Private/Admin
router.get("/geographic", protect, isAdmin, async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get country breakdown
    const countryData = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $ifNull: ["$country", "Unknown"] },
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          country: "$_id",
          views: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" },
          _id: 0,
        },
      },
      { $sort: { views: -1 } },
      { $limit: 20 },
    ]);

    // Get device breakdown
    const deviceData = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$device",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          device: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Get browser breakdown
    const browserData = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$browser",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          browser: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get referrer breakdown
    const referrerData = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $project: {
          source: {
            $cond: {
              if: { $eq: ["$referer", null] },
              then: "Direct",
              else: "$referer",
            },
          },
        },
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      countries: countryData,
      devices: deviceData,
      browsers: browserData,
      referrers: referrerData.map((r) => ({
        source: getReferrerSource(r._id),
        count: r.count,
      })),
    });
  } catch (error) {
    console.error("Geographic data error:", error);
    res.status(500).json({ message: "Failed to fetch geographic data" });
  }
});

// @desc    Get real-time visitors (last 5 minutes)
// @route   GET /api/analytics/realtime
// @access  Private/Admin
router.get("/realtime", protect, isAdmin, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const realtimeData = await PageView.aggregate([
      { $match: { createdAt: { $gte: fiveMinutesAgo } } },
      {
        $group: {
          _id: null,
          activeVisitors: { $addToSet: "$sessionId" },
          pageViews: { $sum: 1 },
          pages: { $addToSet: "$path" },
        },
      },
      {
        $project: {
          activeVisitors: { $size: "$activeVisitors" },
          pageViews: 1,
          activePages: { $size: "$pages" },
          _id: 0,
        },
      },
    ]);

    // Get active pages
    const activePages = await PageView.aggregate([
      { $match: { createdAt: { $gte: fiveMinutesAgo } } },
      {
        $group: {
          _id: "$path",
          visitors: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          path: "$_id",
          visitors: { $size: "$visitors" },
          _id: 0,
        },
      },
      { $sort: { visitors: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      ...(realtimeData[0] || { activeVisitors: 0, pageViews: 0, activePages: 0 }),
      topPages: activePages,
    });
  } catch (error) {
    console.error("Realtime data error:", error);
    res.status(500).json({ message: "Failed to fetch realtime data" });
  }
});

// @desc    Get author's own analytics
// @route   GET /api/analytics/my-stats
// @access  Private
router.get("/my-stats", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    // Get user's posts
    const userPosts = await Post.find({ author: userId }).select("_id");
    const postIds = userPosts.map((p) => p._id);

    if (postIds.length === 0) {
      return res.json({
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        viewsOverTime: [],
        topPosts: [],
      });
    }

    const [totalViews, viewsOverTime, topPosts] = await Promise.all([
      PageView.countDocuments({ post: { $in: postIds } }),
      PageView.aggregate([
        { $match: { post: { $in: postIds }, createdAt: { $gte: lastMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", views: 1, _id: 0 } },
      ]),
      PageView.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "posts",
            localField: "_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        { $project: { title: "$post.title", slug: "$post.slug", views: 1, _id: 0 } },
      ]),
    ]);

    // Get likes and comments count
    const posts = await Post.find({ author: userId });
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const totalComments = await Comment.countDocuments({
      post: { $in: postIds },
      status: "approved",
    });

    res.json({
      totalViews,
      totalLikes,
      totalComments,
      viewsOverTime,
      topPosts,
    });
  } catch (error) {
    console.error("My stats error:", error);
    res.status(500).json({ message: "Failed to fetch your stats" });
  }
});

module.exports = router;
