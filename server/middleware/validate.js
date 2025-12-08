const { validationResult } = require("express-validator");
const { ApiError } = require("./errorHandler");

// Validation middleware - checks express-validator results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    
    console.log("❌ Validation errors:", JSON.stringify(extractedErrors, null, 2));
    
    throw new ApiError(400, "Validation failed", extractedErrors);
  }
  
  next();
};

module.exports = validate;
