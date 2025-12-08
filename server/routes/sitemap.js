const express = require("express");
const Post = require("../models/post");
const User = require("../models/User");
const { POST_STATUS } = require("../config/constants");

const router = express.Router();

const SITE_URL = process.env.CLIENT_URL || "http://localhost:5173";

// @route   GET /api/sitemap.xml
// @desc    Generate XML sitemap for SEO
// @access  Public
router.get("/sitemap.xml", async (req, res) => {
  try {
    // Get all published posts
    const posts = await Post.find({ status: POST_STATUS.PUBLISHED })
      .select("slug updatedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Get all users with public profiles
    const users = await User.find({ isActive: true })
      .select("username updatedAt createdAt")
      .lean();

    // Static pages
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/login", priority: "0.5", changefreq: "monthly" },
      { url: "/register", priority: "0.5", changefreq: "monthly" },
    ];

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach((page) => {
      xml += "  <url>\n";
      xml += `    <loc>${SITE_URL}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += "  </url>\n";
    });

    // Add posts
    posts.forEach((post) => {
      const lastmod = post.updatedAt || post.createdAt;
      xml += "  <url>\n";
      xml += `    <loc>${SITE_URL}/post/${post.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
      xml += "    <changefreq>weekly</changefreq>\n";
      xml += "    <priority>0.8</priority>\n";
      xml += "  </url>\n";
    });

    // Add user profiles
    users.forEach((user) => {
      const lastmod = user.updatedAt || user.createdAt;
      xml += "  <url>\n";
      xml += `    <loc>${SITE_URL}/user/${user.username}</loc>\n`;
      xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
      xml += "    <changefreq>weekly</changefreq>\n";
      xml += "    <priority>0.6</priority>\n";
      xml += "  </url>\n";
    });

    xml += "</urlset>";

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// @route   GET /api/robots.txt
// @desc    Generate robots.txt
// @access  Public
router.get("/robots.txt", (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /profile
Disallow: /admin
Disallow: /create
Disallow: /edit/

Sitemap: ${SITE_URL}/api/sitemap.xml
`;

  res.set("Content-Type", "text/plain");
  res.send(robots);
});

module.exports = router;
