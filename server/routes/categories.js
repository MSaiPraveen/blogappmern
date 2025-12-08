const express = require("express");
const Category = require("../models/Category");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { ApiError } = require("../middleware/errorHandler");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", async (req, res, next) => {
  try {
    const categories = await Category.find()
      .populate("postCount")
      .sort({ name: 1 });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/categories/:slug
// @desc    Get category by slug
// @access  Public
router.get("/:slug", async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate("postCount");

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories
// @desc    Create a category
// @access  Private/Admin
router.post("/", protect, isAdmin, async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      throw new ApiError(400, "Category name is required");
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      throw new ApiError(400, "Category already exists");
    }

    const category = await Category.create({ name, description, color });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private/Admin
router.put("/:id", protect, isAdmin, async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    // Check for duplicate name
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        throw new ApiError(400, "Category name already exists");
      }
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (color) category.color = color;

    await category.save();

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private/Admin
router.delete("/:id", protect, isAdmin, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
