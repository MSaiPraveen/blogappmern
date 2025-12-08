const { body } = require("express-validator");

const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
};
