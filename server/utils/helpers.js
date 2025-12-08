/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - The text to convert to slug
 * @returns {string} - The generated slug
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
};

/**
 * Generate a unique slug by appending a random suffix if needed
 * @param {string} text - The text to convert to slug
 * @param {boolean} addSuffix - Whether to add a unique suffix
 * @returns {string} - The generated unique slug
 */
const generateUniqueSlug = (text, addSuffix = false) => {
  const baseSlug = generateSlug(text);
  if (addSuffix) {
    const suffix = Date.now().toString(36);
    return `${baseSlug}-${suffix}`;
  }
  return baseSlug;
};

/**
 * Calculate read time for content
 * @param {string} content - The content to calculate read time for
 * @param {number} wordsPerMinute - Reading speed (default: 200)
 * @returns {number} - Estimated read time in minutes
 */
const calculateReadTime = (content, wordsPerMinute = 200) => {
  const wordCount = content.trim().split(/\s+/).length;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, readTime); // Minimum 1 minute
};

/**
 * Build pagination response object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} - Pagination metadata
 */
const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Sanitize user object for response (remove sensitive fields)
 * @param {Object} user - User document
 * @returns {Object} - Sanitized user object
 */
const sanitizeUser = (user) => {
  const { password, __v, ...sanitized } = user.toObject ? user.toObject() : user;
  // Add 'id' alias for frontend compatibility
  sanitized.id = sanitized._id.toString();
  return sanitized;
};

module.exports = {
  generateSlug,
  generateUniqueSlug,
  calculateReadTime,
  buildPagination,
  sanitizeUser,
};
