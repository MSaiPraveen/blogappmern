const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const auth = require("../middleware/authMiddleware");

// POST /api/comments/:postId → Add comment
router.post("/:postId", auth, async (req, res) => {
  const { content } = req.body;
  try {
    const comment = await Comment.create({
      content,
      post: req.params.postId,
      author: req.userId,
    });
    res.status(201).json(comment);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to add comment", error: err.message });
  }
});

// GET /api/comments/:postId → Fetch comments
router.get("/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "username")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: err.message });
  }
});

// DELETE /api/comments/single/:commentId → Delete comment
router.delete("/single/:commentId", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.author.toString() !== req.userId)
      return res.status(403).json({ message: "Access denied" });

    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting comment", error: err.message });
  }
});

module.exports = router;
