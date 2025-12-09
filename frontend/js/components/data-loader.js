/**
 * Data Loader Component
 * Handles API data fetching and caching
 */

class DataLoader {
  constructor() {
    this.cache = {
      posts: null,
      stats: null,
      accounts: null,
      emotionData: null,
      lastFetch: null,
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load user's social media posts
   */
  async loadPosts(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("posts")) {
      return this.cache.posts;
    }

    try {
      const posts = await this.fetchAllPosts();
      this.cache.posts = posts;
      this.cache.lastFetch = Date.now();
      return posts;
    } catch (error) {
      console.error("Error loading posts:", error);
      throw error;
    }
  }

  /**
   * Load dashboard statistics
   */
  async loadStats(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("stats")) {
      return this.cache.stats;
    }

    try {
      const stats = await window.api.getStats();
      this.cache.stats = stats;
      return stats;
    } catch (error) {
      console.error("Error loading stats:", error);
      throw error;
    }
  }

  /**
   * Load connected social accounts
   */
  async loadAccounts(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("accounts")) {
      return this.cache.accounts;
    }

    try {
      const accounts = await window.api.getAccounts();
      this.cache.accounts = accounts;
      return accounts;
    } catch (error) {
      console.error("Error loading accounts:", error);
      throw error;
    }
  }

  /**
   * Fetch all posts with pagination
   */
  async fetchAllPosts(limit = 500) {
    try {
      let allPosts = [];
      let skip = 0;
      const batchSize = 100;

      while (allPosts.length < limit) {
        const batch = await fetch(
          `/api/v1/data/posts?skip=${skip}&limit=${batchSize}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        ).then((r) => r.json());

        if (batch.length === 0) break;

        allPosts = allPosts.concat(batch);
        skip += batchSize;

        if (batch.length < batchSize) break;
      }

      return allPosts.slice(0, limit);
    } catch (error) {
      console.error("Error fetching posts:", error);
      return [];
    }
  }

  /**
   * Load analytics data
   */
  async loadAnalytics() {
    try {
      const [emotionAnalysis, slangAnalysis, topPosts] = await Promise.all([
        window.api
          .getEmotionAnalysis()
          .catch(() => ({
            emotions: { positive: 0, neutral: 0, negative: 0 },
          })),
        window.api
          .getSlangAnalysis()
          .catch(() => ({ slang_frequency: {}, total_slang_terms: 0 })),
        window.api.getTopPosts(6).catch(() => []),
      ]);

      return {
        emotionAnalysis,
        slangAnalysis,
        topPosts,
      };
    } catch (error) {
      console.error("Error loading analytics:", error);
      return {
        emotionAnalysis: { emotions: { positive: 0, neutral: 0, negative: 0 } },
        slangAnalysis: { slang_frequency: {}, total_slang_terms: 0 },
        topPosts: [],
      };
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(key) {
    if (!this.cache[key] || !this.cache.lastFetch) {
      return false;
    }
    return Date.now() - this.cache.lastFetch < this.cacheTimeout;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {
      posts: null,
      stats: null,
      accounts: null,
      emotionData: null,
      lastFetch: null,
    };
  }

  /**
   * Ingest data for an account
   */
  async ingestAccountData(accountId, maxPosts = 50) {
    try {
      const result = await window.api.ingestData(accountId, maxPosts);
      this.clearCache(); // Clear cache after ingestion
      return result;
    } catch (error) {
      console.error("Error ingesting data:", error);
      throw error;
    }
  }

  /**
   * Load emotion dashboard data (with caching)
   */
  async loadEmotionDashboardData() {
    try {
      // Use cached data if available and fresh
      if (this.isCacheValid("emotionData")) {
        return this.cache.emotionData;
      }

      // Fetch data in parallel
      const [emotionAnalysis, topPosts, engagementTrends] = await Promise.all([
        window.api.getEmotionAnalysis(),
        window.api.getTopPosts(10),
        window.api.getEngagementTrends(30), // Match default filter
      ]);

      const data = {
        emotionAnalysis,
        topPosts,
        engagementTrends,
      };

      // Update cache
      this.cache.emotionData = data;
      this.cache.lastFetch = Date.now();

      return data;
    } catch (error) {
      console.error("Error loading emotion dashboard data:", error);
      throw error;
    }
  }

  /**
   * Load emotion dashboard data with filters (bypasses cache)
   */
  async loadEmotionDashboardDataWithFilters(dateRange = 7, platform = "all") {
    try {
      // Build filter parameters
      const filters = {};

      if (platform && platform !== "all") {
        filters.platform = platform;
      }

      // Fetch data with filters in parallel
      const [emotionAnalysis, topPosts, engagementTrends] = await Promise.all([
        window.api.getEmotionAnalysis(filters),
        window.api.getTopPosts(10, filters),
        window.api.getEngagementTrends(dateRange, filters),
      ]);

      return {
        emotionAnalysis,
        topPosts,
        engagementTrends,
      };
    } catch (error) {
      console.error("Error loading filtered emotion dashboard data:", error);
      throw error;
    }
  }

  /**
   * Load negative triggers data with filters (bypasses cache)
   */
  async loadNegativeTriggersData(
    dateRange = 30,
    platform = "all",
    severity = "all"
  ) {
    try {
      const data = await window.api.getNegativeTriggers(
        dateRange,
        platform,
        severity
      );
      return data;
    } catch (error) {
      console.error("Error loading negative triggers data:", error);
      throw error;
    }
  }

  /**
   * Load negative comments for a specific post
   */
  async loadPostNegativeComments(postId) {
    try {
      return await window.api.getPostNegativeComments(postId);
    } catch (error) {
      console.error("Error loading post negative comments:", error);
      throw error;
    }
  }
}

// Create global instance
window.dataLoader = new DataLoader();

export default DataLoader;
