const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const auth = require("../middleware/authMiddleware");

// 🔐 Create a new blog post (protected route)
router.post("/", auth, async (req, res) => {
  const { title, content } = req.body;

  console.log("📩 Received POST /posts");
  console.log("Request Body:", req.body);
  console.log("Authenticated User ID:", req.userId);

  if (!title || !content) {
    console.log("🚫 Missing title or content");
    return res.status(400).json({ message: "Title and content are required" });
  }

  try {
    const post = await Post.create({ title, content, author: req.userId });
    console.log("✅ Post created:", post);
    res.status(201).json(post);
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
    const post = await Post.findById(req.params.id).populate(
      "author",
      "username"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error("❌ Error fetching post:", err.message);
    res.status(404).json({ message: "Post not found", error: err.message });
  }
});

// 🔄 Update a post (only by author)
router.put("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    post.title = req.body.title;
    post.content = req.body.content;
    await post.save();

    res.json(post);
  } catch (err) {
    console.error("❌ Error updating post:", err.message);
    res
      .status(400)
      .json({ message: "Failed to update post", error: err.message });
  }
});

// ❌ Delete a post (only by author)
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
