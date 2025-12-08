/**
 * Simple in-memory cache for API responses
 * For production, consider using React Query or SWR
 */

export class ApiCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
    this.maxEntries = options.maxEntries || 100;
  }

  /**
   * Generate cache key from URL and params
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `${url}?${sortedParams}`;
  }

  /**
   * Get item from cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Set item in cache
   */
  set(key, data, ttl = this.defaultTTL) {
    // Enforce max entries limit (LRU eviction)
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Remove item from cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache or by pattern
   */
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Clear by pattern (e.g., "/posts" clears all post-related cache)
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const apiCache = new ApiCache();

/**
 * Cache configuration for different endpoints
 */
export const CACHE_CONFIG = {
  // Public data - cache longer
  "/posts": { ttl: 2 * 60 * 1000 }, // 2 minutes
  "/categories": { ttl: 10 * 60 * 1000 }, // 10 minutes
  "/tags": { ttl: 10 * 60 * 1000 }, // 10 minutes
  "/users/profile": { ttl: 5 * 60 * 1000 }, // 5 minutes

  // User-specific data - shorter cache
  "/users/me": { ttl: 60 * 1000 }, // 1 minute
  "/users/me/bookmarks": { ttl: 60 * 1000 }, // 1 minute
};

/**
 * Get TTL for a specific endpoint
 */
export const getTTL = (url) => {
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (url.includes(pattern)) {
      return config.ttl;
    }
  }
  return apiCache.defaultTTL;
};

/**
 * React hook for cached API calls
 */
import { useState, useEffect, useCallback } from "react";

export function useCachedApi(fetcher, cacheKey, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (!skipCache) {
        const cached = apiCache.get(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return cached;
        }
      }

      // Fetch fresh data
      const result = await fetcher();
      
      // Cache the result
      apiCache.set(cacheKey, result, getTTL(cacheKey));
      setData(result);
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refresh };
}

export default apiCache;
