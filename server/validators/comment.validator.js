const { body, param, query } = require("express-validator");
const { COMMENT_STATUS } = require("../config/constants");

const createCommentValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 2, max: 1000 })
    .withMessage("Comment must be between 2 and 1000 characters"),

  param("postId")
    .isMongoId()
    .withMessage("Invalid post ID"),
];

const updateCommentValidation = [
  body("content")
    .optional()
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage("Comment must be between 2 and 1000 characters"),

  body("status")
    .optional()
    .isIn(Object.values(COMMENT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(COMMENT_STATUS).join(", ")}`),

  param("commentId")
    .isMongoId()
    .withMessage("Invalid comment ID"),
];

const getCommentsValidation = [
  param("postId")
    .isMongoId()
    .withMessage("Invalid post ID"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("status")
    .optional()
    .isIn(Object.values(COMMENT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(COMMENT_STATUS).join(", ")}`),
];

const commentIdValidation = [
  param("commentId")
    .isMongoId()
    .withMessage("Invalid comment ID"),
];

module.exports = {
  createCommentValidation,
  updateCommentValidation,
  getCommentsValidation,
  commentIdValidation,
};
