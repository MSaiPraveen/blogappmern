import axios from "axios";
import { ApiCache } from "./utils/cache";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Initialize cache for API responses
const apiCache = new ApiCache({
  maxEntries: 100,
  defaultTTL: 5 * 60 * 1000 // 5 minutes
});

// Helper to generate cache keys (used for delete + get)
const makeCacheKey = (url, config = {}) =>
  `${url}${config.params ? JSON.stringify(config.params) : ""}`;

// Helper function for cached GET requests
const cachedGet = async (url, config = {}, ttl = null) => {
  const cacheKey = makeCacheKey(url, config);

  // Check cache first
  if (apiCache.has(cacheKey)) {
    return { data: apiCache.get(cacheKey), fromCache: true };
  }

  // Make API request
  const response = await API.get(url, config);

  // Cache the response
  apiCache.set(cacheKey, response.data, ttl);

  return response;
};

// Request interceptor - add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      const message = error.response?.data?.message;
      if (message === "Token expired" || message === "Invalid token") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: (data) => API.post("/auth/register", data),
  login: (data) => API.post("/auth/login", data),
  getMe: () => API.get("/auth/me"),
};

// OAuth services
export const oauthService = {
  googleLogin: (credential) => API.post("/oauth/google", { credential }),
  githubLogin: (code) => API.post("/oauth/github", { code }),
};

// Post services with caching
export const postService = {
  getAll: (params) => cachedGet("/posts", { params }, 2 * 60 * 1000), // Cache for 2 min
  getById: (id) => cachedGet(`/posts/${id}`, {}, 5 * 60 * 1000),
  getBySlug: (slug) => cachedGet(`/posts/slug/${slug}`, {}, 5 * 60 * 1000),
  getTags: () => cachedGet("/posts/tags", {}, 10 * 60 * 1000), // Cache tags for 10 min
  getMyPosts: (params) => API.get("/posts/my-posts", { params }), // Don't cache user's own posts
  create: (data) => {
    apiCache.clear(); // Invalidate cache on create
    return API.post("/posts", data);
  },
  update: (id, data) => {
    apiCache.delete(`/posts/${id}`);
    apiCache.clear(); // Invalidate all post caches
    return API.put(`/posts/${id}`, data);
  },
  delete: (id) => {
    apiCache.delete(`/posts/${id}`);
    apiCache.clear();
    return API.delete(`/posts/${id}`);
  },
  like: (id) => {
    apiCache.delete(`/posts/${id}`);
    return API.put(`/posts/${id}/like`);
  },
  getImageUrl: (id) => `${API.defaults.baseURL}/posts/${id}/image`,
  clearCache: () => apiCache.clear(), // Manual cache clear
};

// Comment services (with selective caching)
export const commentService = {
  getByPost: (postId, params) => cachedGet(`/comments/${postId}`, { params }, 60 * 1000), // 1 min cache
  create: (postId, data) => {
    apiCache.delete(`/comments/${postId}`);
    return API.post(`/comments/${postId}`, data);
  },
  update: (commentId, data) => API.put(`/comments/${commentId}`, data),
  delete: (commentId) => API.delete(`/comments/single/${commentId}`),
  getPending: () => API.get("/comments/moderation/pending"),
  moderate: (commentId, status) => API.put(`/comments/${commentId}/status`, { status }),
  like: (commentId) => API.put(`/comments/${commentId}/like`),
  vote: (commentId, vote) => API.put(`/comments/${commentId}/vote`, { vote }),
  getReplies: (commentId, params) => API.get(`/comments/${commentId}/replies`, { params }),
};

// Category services (with long caching)
export const categoryService = {
  getAll: () => cachedGet("/categories", {}, 30 * 60 * 1000), // Cache for 30 min
  getBySlug: (slug) => cachedGet(`/categories/${slug}`, {}, 30 * 60 * 1000),
  create: (data) => {
    apiCache.delete("/categories");
    return API.post("/categories", data);
  },
  update: (id, data) => {
    apiCache.delete("/categories");
    return API.put(`/categories/${id}`, data);
  },
  delete: (id) => {
    apiCache.delete("/categories");
    return API.delete(`/categories/${id}`);
  },
};

// User services (with selective caching)
export const userService = {
  getMe: () => API.get("/users/me"), // Don't cache user's own data
  updateMe: (data) => API.put("/users/me", data),
  changePassword: (data) => API.put("/users/change-password", data),
  getAll: (params) => API.get("/users", { params }),
  getById: (id) => cachedGet(`/users/${id}`, {}, 5 * 60 * 1000),
  getProfile: (username) => cachedGet(`/users/profile/${username}`, {}, 5 * 60 * 1000),
  updateRole: (id, role) => API.put(`/users/${id}/role`, { role }),
  delete: (id) => API.delete(`/users/${id}`),
  // Bookmarks
  getBookmarks: () => API.get("/users/me/bookmarks"),
  toggleBookmark: (postId) => API.put(`/users/me/bookmarks/${postId}`),
  // Search for mentions
  search: (query) => API.get("/users/search", { params: { q: query } }),
};

// Analytics services
export const analyticsService = {
  // Track page view
  track: (data) => API.post("/analytics/track", data),
  // Admin endpoints
  getOverview: () => API.get("/analytics/overview"),
  getViewsOverTime: (period) => API.get("/analytics/views-over-time", { params: { period } }),
  getEngagement: () => API.get("/analytics/engagement"),
  getPopularPosts: (period, limit = 10) => 
    API.get("/analytics/popular-posts", { params: { period, limit } }),
  getPopularAuthors: (period, limit = 10) => 
    API.get("/analytics/popular-authors", { params: { period, limit } }),
  getGeographic: (period) => API.get("/analytics/geographic", { params: { period } }),
  getRealtime: () => API.get("/analytics/realtime"),
  // Author's own stats
  getMyStats: () => API.get("/analytics/my-stats"),
};

// Social services
export const socialService = {
  follow: async (userId) => {
    const res = await API.post(`/social/follow/${userId}`);
    // Invalidate related caches so UI reflects new follower counts immediately
    apiCache.delete(makeCacheKey(`/social/user/${userId}/followers`));
    apiCache.delete(makeCacheKey(`/users/profile/${userId}`));
    return res;
  },

  unfollow: async (userId) => {
    // Server exposes DELETE /api/social/follow/:userId
    const res = await API.delete(`/social/follow/${userId}`);
    // Invalidate related caches so UI reflects new follower counts immediately
    apiCache.delete(makeCacheKey(`/social/user/${userId}/followers`));
    apiCache.delete(makeCacheKey(`/users/profile/${userId}`));
    return res;
  },

  // Server public endpoints use /social/user/:userId/... (see server/routes/social.js)
  getFollowers: (userId, params) => cachedGet(`/social/user/${userId}/followers`, { params }, 60 * 1000),
  getFollowing: (userId, params) => cachedGet(`/social/user/${userId}/following`, { params }, 60 * 1000),
  getFeed: (params) => API.get("/social/feed", { params }),
  share: (postId, platform) => API.post("/social/share", { postId, platform }),
};

// Notification services
export const notificationService = {
  getAll: (params) => API.get("/notifications", { params }),
  getUnreadCount: () => API.get("/notifications/unread-count"),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put("/notifications/read-all"),
  delete: (id) => API.delete(`/notifications/${id}`),
  updatePreferences: (preferences) => API.put("/notifications/preferences", preferences),
};

// Newsletter services
export const newsletterService = {
  subscribe: (email, preferences) => API.post("/newsletter/subscribe", { email, preferences }),
  confirmSubscription: (token) => API.get(`/newsletter/confirm/${token}`),
  unsubscribe: (email, token) => API.post("/newsletter/unsubscribe", { email, token }),
  updatePreferences: (email, preferences) => API.put("/newsletter/preferences", { email, preferences }),
};

// Export cache utilities for manual control
export { apiCache };

export default API;
