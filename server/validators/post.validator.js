const { body, query, param } = require("express-validator");
const { POST_STATUS } = require("../config/constants");

const createPostValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 5 })
    .withMessage("Content must be at least 5 characters"),

  body("excerpt")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Excerpt cannot exceed 300 characters"),

  body("tags")
    .optional()
    .custom((value) => {
      // Accept both array and comma-separated string
      if (typeof value === 'string' || Array.isArray(value)) {
        return true;
      }
      throw new Error('Tags must be a string or array');
    }),

  body("category")
    .optional(),

  body("status")
    .optional()
    .isIn(Object.values(POST_STATUS))
    .withMessage(`Status must be one of: ${Object.values(POST_STATUS).join(", ")}`),
];

const updatePostValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage("Content must be at least 5 characters"),

  body("excerpt")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Excerpt cannot exceed 300 characters"),

  body("tags")
    .optional()
    .custom((value) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        return true;
      }
      throw new Error('Tags must be a string or array');
    }),

  body("category")
    .optional(),

  body("status")
    .optional()
    .isIn(Object.values(POST_STATUS))
    .withMessage(`Status must be one of: ${Object.values(POST_STATUS).join(", ")}`),
];

const getPostsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters"),

  query("tag")
    .optional()
    .trim(),

  query("category")
    .optional()
    .trim(),

  query("author")
    .optional()
    .isMongoId()
    .withMessage("Invalid author ID"),

  query("status")
    .optional()
    .isIn(Object.values(POST_STATUS))
    .withMessage(`Status must be one of: ${Object.values(POST_STATUS).join(", ")}`),
];

const postIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid post ID"),
];

const postSlugValidation = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug is required"),
];

module.exports = {
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  postIdValidation,
  postSlugValidation,
};
