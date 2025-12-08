module.exports = {
  // User roles
  ROLES: {
    USER: "user",
    AUTHOR: "author",
    ADMIN: "admin",
  },

  // Post status
  POST_STATUS: {
    DRAFT: "draft",
    PUBLISHED: "published",
  },

  // Comment status
  COMMENT_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
  },

  // JWT expiration
  JWT_EXPIRES_IN: "7d",
};
