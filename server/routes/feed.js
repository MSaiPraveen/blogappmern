const express = require("express");
const router = express.Router();
const Post = require("../models/post");

// Helper to escape XML special characters
const escapeXml = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

// Helper to strip HTML tags
const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").substring(0, 500);
};

// @route   GET /api/feed/rss
// @desc    Get RSS feed
// @access  Public
router.get("/rss", async (req, res, next) => {
  try {
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    
    const posts = await Post.find({ status: "published" })
      .populate("author", "username name")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const rssItems = posts.map((post) => {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      const pubDate = new Date(post.createdAt).toUTCString();
      const description = escapeXml(stripHtml(post.excerpt || post.content));
      const author = post.author?.name || post.author?.username || "Unknown";

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <description><![CDATA[${description}]]></description>
      ${post.category ? `<category>${escapeXml(post.category.name)}</category>` : ""}
      ${post.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n      ") || ""}
    </item>`;
    }).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BlogApp - Latest Posts</title>
    <link>${baseUrl}</link>
    <description>Discover amazing stories, tutorials, and insights from our community of writers.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feed/rss" rel="self" type="application/rss+xml"/>
    <generator>BlogApp RSS Generator</generator>
    ${rssItems}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rss);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feed/atom
// @desc    Get Atom feed
// @access  Public
router.get("/atom", async (req, res, next) => {
  try {
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    
    const posts = await Post.find({ status: "published" })
      .populate("author", "username name")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const atomEntries = posts.map((post) => {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      const updated = new Date(post.updatedAt || post.createdAt).toISOString();
      const published = new Date(post.createdAt).toISOString();
      const summary = escapeXml(stripHtml(post.excerpt || post.content));
      const author = post.author?.name || post.author?.username || "Unknown";

      return `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${postUrl}"/>
    <id>${postUrl}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <author>
      <name>${escapeXml(author)}</name>
    </author>
    <summary type="html"><![CDATA[${summary}]]></summary>
    ${post.category ? `<category term="${escapeXml(post.category.name)}"/>` : ""}
    ${post.tags?.map((tag) => `<category term="${escapeXml(tag)}"/>`).join("\n    ") || ""}
  </entry>`;
    }).join("");

    const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>BlogApp - Latest Posts</title>
  <link href="${baseUrl}"/>
  <link href="${baseUrl}/api/feed/atom" rel="self"/>
  <id>${baseUrl}/</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>Discover amazing stories, tutorials, and insights from our community of writers.</subtitle>
  <generator>BlogApp Atom Generator</generator>
  ${atomEntries}
</feed>`;

    res.set("Content-Type", "application/atom+xml; charset=utf-8");
    res.send(atom);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feed/json
// @desc    Get JSON feed
// @access  Public
router.get("/json", async (req, res, next) => {
  try {
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    
    const posts = await Post.find({ status: "published" })
      .populate("author", "username name avatar")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const jsonFeed = {
      version: "https://jsonfeed.org/version/1.1",
      title: "BlogApp - Latest Posts",
      home_page_url: baseUrl,
      feed_url: `${baseUrl}/api/feed/json`,
      description: "Discover amazing stories, tutorials, and insights from our community of writers.",
      items: posts.map((post) => ({
        id: post._id.toString(),
        url: `${baseUrl}/post/${post.slug}`,
        title: post.title,
        content_text: stripHtml(post.content),
        summary: stripHtml(post.excerpt || post.content),
        date_published: post.createdAt,
        date_modified: post.updatedAt,
        authors: [{
          name: post.author?.name || post.author?.username,
          url: `${baseUrl}/user/${post.author?.username}`,
          avatar: post.author?.avatar,
        }],
        tags: [
          ...(post.category ? [post.category.name] : []),
          ...(post.tags || []),
        ],
      })),
    };

    res.json(jsonFeed);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feed/author/:username
// @desc    Get RSS feed for specific author
// @access  Public
router.get("/author/:username", async (req, res, next) => {
  try {
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const User = require("../models/User");
    
    const author = await User.findOne({ username: req.params.username });
    if (!author) {
      return res.status(404).send("Author not found");
    }

    const posts = await Post.find({ 
      author: author._id, 
      status: "published" 
    })
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const rssItems = posts.map((post) => {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      const pubDate = new Date(post.createdAt).toUTCString();
      const description = escapeXml(stripHtml(post.excerpt || post.content));

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(author.name || author.username)}</dc:creator>
      <description><![CDATA[${description}]]></description>
    </item>`;
    }).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(author.name || author.username)} - BlogApp</title>
    <link>${baseUrl}/user/${author.username}</link>
    <description>Posts by ${escapeXml(author.name || author.username)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feed/author/${author.username}" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rss);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
