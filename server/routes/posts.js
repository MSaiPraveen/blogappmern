// server/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");

// Multer in-memory storage for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// 🔐 Create a new blog post (protected route)
router.post("/", auth, upload.single("image"), async (req, res) => {
  const { title, content } = req.body;

  console.log("📩 Received POST /posts");
  console.log("Fields:", { title, content });
  console.log("Authenticated User ID:", req.userId);
  console.log("File received:", !!req.file, req.file?.mimetype, req.file?.size);

  if (!title || !content) {
    console.log("🚫 Missing title or content");
    return res.status(400).json({ message: "Title and content are required" });
  }

  try {
    const image = req.file
      ? { data: req.file.buffer, contentType: req.file.mimetype }
      : undefined;

    const post = await Post.create({
      title,
      content,
      image,
      author: req.userId,
    });
    console.log("✅ Post created:", { id: post._id, hasImage: !!post.image?.data });

    // Do not send raw image buffer back in response
    const { image: _img, ...plain } = post.toObject();
    res.status(201).json({ ...plain, hasImage: !!post.image?.data });
  } catch (err) {
    console.error("❌ Error creating post:", err.message);
    res
      .status(400)
      .json({ message: "Failed to create post", error: err.message });
  }
});

// 📃 Get all blog posts (public route)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .select("-image") // exclude binary image from list
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("❌ Error fetching posts:", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch posts", error: err.message });
  }
});

// 📄 Get a single post by ID (public route)
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .select("-image")
      .populate("author", "username");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error("❌ Error fetching post:", err.message);
    res.status(404).json({ message: "Post not found", error: err.message });
  }
});

// 🖼️ Stream image binary
router.get("/:id/image", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("image");
    if (!post || !post.image || !post.image.data) {
      return res.status(404).json({ message: "Image not found" });
    }
    res.set("Content-Type", post.image.contentType || "application/octet-stream");
    return res.send(post.image.data);
  } catch (err) {
    console.error(" Error fetching image:", err.message);
    res.status(404).json({ message: "Image not found", error: err.message });
  }
});

// Update a post (only by author) — supports optional image replacement
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (typeof req.body.title === "string") post.title = req.body.title;
    if (typeof req.body.content === "string") post.content = req.body.content;

    // If a new file is uploaded, replace existing image
    if (req.file) {
      post.image = { data: req.file.buffer, contentType: req.file.mimetype };
    }
    await post.save();

    // Avoid sending binary back
    const { image: _img, ...plain } = post.toObject();
    res.json({ ...plain, hasImage: !!post.image?.data });
  } catch (err) {
    console.error(" Error updating post:", err.message);
    res
      .status(400)
      .json({ message: "Failed to update post", error: err.message });
  }
});

// Delete a post (only by author)
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting post:", err.message);
    res
      .status(400)
      .json({ message: "Failed to delete post", error: err.message });
  }
});

module.exports = router;