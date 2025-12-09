/**
 * Emotion Dashboard Page
 * Detailed emotion analysis with trends, breakdowns, and top posts
 */

import DataLoader from "../components/data-loader.js";
import ChartManager from "../components/chart-manager.js";
import StatCards from "../components/stat-cards.js";

class EmotionDashboard {
  constructor() {
    this.dataLoader = window.dataLoader || new DataLoader();
    this.chartManager = window.chartManager || new ChartManager();
    this.statCards = window.statCards || new StatCards();
    this.data = null;
    this.filters = {
      dateRange: 30,
      platform: "all",
    };
    this.postsDisplayLimit = 5; // Start with 5 posts
    // Store bound handlers for cleanup
    this.boundHandlers = {
      dateRangeChange: null,
      platformFilter: null,
      exportCSV: null,
      refresh: null,
      seeMorePosts: null,
      showLessPosts: null,
    };
  }

  /**
   * Render the emotion dashboard
   */
  async render() {
    const container = document.getElementById("main-content");
    if (!container) return;

    // Show loading state
    container.innerHTML = this.getLoadingHTML();

    try {
      // Load all data
      this.data = await this.loadData();

      // Render dashboard content
      container.innerHTML = this.getHTML();

      // Initialize components
      this.initializeComponents();
    } catch (error) {
      console.error("Error loading emotion dashboard:", error);
      container.innerHTML = this.getErrorHTML(error.message);
    }
  }

  /**
   * Load all necessary data
   */
  async loadData() {
    try {
      // Fetch data using current filters
      const [emotionAnalysis, allPosts, engagementTrends] = await Promise.all([
        window.api.request(
          `/api/v1/analytics/emotion-analysis?days=${this.filters.dateRange}`
        ),
        window.api.request("/api/v1/analytics/top-posts?limit=100"), // Get more posts for filtering
        window.api.request(
          `/api/v1/analytics/engagement-trends?days=${this.filters.dateRange}`
        ),
      ]);

      // Filter posts by date range and platform
      const filteredPosts = this.filterPosts(
        allPosts,
        this.filters.dateRange,
        this.filters.platform
      );

      const data = {
        emotionAnalysis: emotionAnalysis,
        topPosts: filteredPosts,
        engagementTrends: engagementTrends,
        allPosts: allPosts, // Keep all posts for reference
      };

      return {
        ...data,
        processedStats: this.processEmotionData(data),
      };
    } catch (error) {
      console.error("Error loading emotion data:", error);
      return {
        emotionAnalysis: {
          emotions: { positive: 0, neutral: 0, negative: 0 },
          total_analyzed: 0,
        },
        topPosts: [],
        allPosts: [],
        processedStats: {
          totalPosts: 0,
          totalEngagement: 0,
          avgEmotionScore: 0,
          emotionBreakdown: {
            joy: 0,
            admiration: 0,
            neutral: 0,
            sarcasm: 0,
            anger: 0,
          },
          emotionPercentages: {
            joy: 0,
            admiration: 0,
            neutral: 0,
            sarcasm: 0,
            anger: 0,
          },
          postsByEmotion: {
            joy: [],
            admiration: [],
            neutral: [],
            sarcasm: [],
            anger: [],
          },
        },
      };
    }
  }

  /**
   * Filter posts by date range and platform
   */
  filterPosts(posts, dateRange, platform) {
    if (!Array.isArray(posts)) return [];

    const now = new Date();
    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);

    return posts.filter((post) => {
      // Filter by date range
      const postDate = new Date(post.created_at_platform || post.created_at);
      if (postDate < startDate) return false;

      // Filter by platform
      if (platform !== "all" && post.platform !== platform) return false;

      return true;
    });
  }

  /**
   * Process raw data into stats
   */
  processEmotionData(data) {
    const { emotionAnalysis, topPosts, engagementTrends } = data;

    // Calculate total posts analyzed from filtered posts
    const totalPosts = topPosts.length;

    // Calculate total engagement
    const totalEngagement = topPosts.reduce(
      (sum, post) => sum + (post.engagement || 0),
      0
    );

    // Use the REAL average sentiment score from backend
    const avgEmotionScore = emotionAnalysis.avg_sentiment_score || 0;

    // Process emotion breakdown from FILTERED posts instead of backend breakdown
    const rawBreakdown = {};
    topPosts.forEach((post) => {
      const emotion = post.dominant_emotion || post.emotion || "neutral";
      rawBreakdown[emotion] = (rawBreakdown[emotion] || 0) + 1;
    });

    // Sort emotions by count (descending)
    const sortedEmotions = Object.entries(rawBreakdown).sort(
      (a, b) => b[1] - a[1]
    );

    // Calculate total for percentages
    const totalBreakdown = Object.values(rawBreakdown).reduce(
      (a, b) => a + b,
      0
    );

    // Build emotion breakdown with all emotions and their percentages
    const emotionBreakdown = {};
    const emotionPercentages = {};

    sortedEmotions.forEach(([emotion, count]) => {
      emotionBreakdown[emotion] = count;
      emotionPercentages[emotion] =
        totalBreakdown > 0
          ? parseFloat(((count / totalBreakdown) * 100).toFixed(1))
          : 0;
    });

    // Group posts by their actual dominant_emotion
    const postsByEmotion = {};
    topPosts.forEach((post) => {
      const emotion = post.emotion || post.dominant_emotion || "neutral";
      if (!postsByEmotion[emotion]) {
        postsByEmotion[emotion] = [];
      }
      postsByEmotion[emotion].push(post);
    });

    return {
      totalPosts,
      totalEngagement,
      avgEmotionScore,
      emotionBreakdown,
      emotionPercentages,
      postsByEmotion,
      rawBreakdown,
      changeMetrics: {
        postsChange: "+0%",
        engagementChange: "+0%",
        scoreChange: "+0%",
      },
    };
  }

  /**
   * Initialize charts and interactive components
   */
  initializeComponents() {
    // Render stat cards
    this.renderStatCards();

    // Initialize emotion trends chart
    if (this.data && this.data.engagementTrends) {
      this.renderEmotionTrendsChart();
    }

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render stat cards
   */
  renderStatCards() {
    const statsContainer = document.querySelector(".stats-grid");
    if (!statsContainer || !this.data) return;

    const stats = this.data.processedStats;

    // Use generateEmotionCards which returns a complete grid wrapper
    const cardsHTML = this.statCards.generateEmotionCards(stats);

    // Replace the container's content with the full grid
    statsContainer.outerHTML = cardsHTML;
  }

  /**
   * Render emotion trends chart - Using filtered posts to build trend data
   */
  renderEmotionTrendsChart() {
    if (!this.data || !this.data.topPosts || this.data.topPosts.length === 0) {
      const chartData = { labels: [], emotions: {} };
      this.chartManager.createEmotionTrendChart(
        "emotionTrendsChart",
        chartData
      );
      return;
    }

    // Build trend data from filtered posts
    const posts = this.data.topPosts;
    const dailyEmotions = {};

    // Group posts by date
    posts.forEach((post) => {
      const postDate = new Date(post.created_at_platform || post.created_at);
      const dateStr = postDate.toISOString().split("T")[0];
      const emotion = post.dominant_emotion || post.emotion || "neutral";

      if (!dailyEmotions[dateStr]) {
        dailyEmotions[dateStr] = {};
      }
      dailyEmotions[dateStr][emotion] =
        (dailyEmotions[dateStr][emotion] || 0) + 1;
    });

    // Sort dates and build chart data
    const sortedDates = Object.keys(dailyEmotions).sort();

    // Get top 4 emotions overall to avoid clutter
    const emotionTotals = {};
    Object.values(dailyEmotions).forEach((dayEmotions) => {
      Object.entries(dayEmotions).forEach(([emotion, count]) => {
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + count;
      });
    });

    const topEmotions = Object.entries(emotionTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([emotion]) => emotion);

    // Build final chart data
    const chartData = {
      labels: sortedDates,
      emotions: {},
    };

    topEmotions.forEach((emotion) => {
      chartData.emotions[emotion] = sortedDates.map(
        (date) => dailyEmotions[date][emotion] || 0
      );
    });

    this.chartManager.createEmotionTrendChart("emotionTrendsChart", chartData);

    // Update chart header text with current date range
    const chartPeriod = document.querySelector(".chart-period");
    if (chartPeriod) {
      chartPeriod.textContent = `Last ${this.filters.dateRange} days`;
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Remove old listeners if they exist
    this.removeEventListeners();

    // Date range filter
    const dateRangeSelect = document.getElementById("dateRangeFilter");
    if (dateRangeSelect) {
      this.boundHandlers.dateRangeChange = (e) => {
        this.handleDateRangeChange(parseInt(e.target.value));
      };
      dateRangeSelect.addEventListener(
        "change",
        this.boundHandlers.dateRangeChange
      );
    }

    // Platform filter
    const platformSelect = document.getElementById("platformFilter");
    if (platformSelect) {
      this.boundHandlers.platformFilter = (e) => {
        this.handlePlatformFilter(e.target.value);
      };
      platformSelect.addEventListener(
        "change",
        this.boundHandlers.platformFilter
      );
    }

    // Export CSV button
    const exportBtn = document.getElementById("exportCSV");
    if (exportBtn) {
      this.boundHandlers.exportCSV = () => this.exportToCSV();
      exportBtn.addEventListener("click", this.boundHandlers.exportCSV);
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshEmotionDashboard");
    if (refreshBtn) {
      this.boundHandlers.refresh = () => this.refresh();
      refreshBtn.addEventListener("click", this.boundHandlers.refresh);
    }

    // Toggle more emotions button
    const toggleBtn = document.getElementById("toggleMoreEmotions");
    if (toggleBtn) {
      this.boundHandlers.toggleEmotions = () => this.toggleSecondaryEmotions();
      toggleBtn.addEventListener("click", this.boundHandlers.toggleEmotions);
    }

    // Post row clicks - use event delegation on container
    const tableContainer = document.querySelector(".posts-table-container");
    if (tableContainer) {
      this.boundHandlers.tableClick = (e) => {
        const row = e.target.closest(".table-row");
        if (row) {
          const postId = row.dataset.postId;
          this.viewPostDetails(postId);
        }
      };
      tableContainer.addEventListener("click", this.boundHandlers.tableClick);
    }

    // Attach see more handler
    this.attachSeeMoreHandler();
  }

  /**
   * Attach See More posts handler
   */
  attachSeeMoreHandler() {
    const seeMoreBtn = document.getElementById("seeMorePosts");
    if (seeMoreBtn) {
      // Remove old listener
      if (this.boundHandlers.seeMorePosts) {
        seeMoreBtn.removeEventListener(
          "click",
          this.boundHandlers.seeMorePosts
        );
      }
      // Add new listener
      this.boundHandlers.seeMorePosts = () => this.showMorePosts();
      seeMoreBtn.addEventListener("click", this.boundHandlers.seeMorePosts);
    }

    const showLessBtn = document.getElementById("showLessPosts");
    if (showLessBtn) {
      // Remove old listener
      if (this.boundHandlers.showLessPosts) {
        showLessBtn.removeEventListener(
          "click",
          this.boundHandlers.showLessPosts
        );
      }
      // Add new listener
      this.boundHandlers.showLessPosts = () => this.showLessPosts();
      showLessBtn.addEventListener("click", this.boundHandlers.showLessPosts);
    }
  }

  /**
   * Show more posts (increase limit by 5)
   */
  showMorePosts() {
    this.postsDisplayLimit += 5;
    const tableContainer = document.querySelector(".posts-table-container");
    if (tableContainer) {
      tableContainer.innerHTML = this.getTopPostsTableHTML();
      this.attachSeeMoreHandler();
    }
  }

  /**
   * Show less posts (decrease limit by 5, minimum 5)
   */
  showLessPosts() {
    this.postsDisplayLimit = Math.max(5, this.postsDisplayLimit - 5);
    const tableContainer = document.querySelector(".posts-table-container");
    if (tableContainer) {
      tableContainer.innerHTML = this.getTopPostsTableHTML();
      this.attachSeeMoreHandler();
    }
  }

  /**
   * Toggle secondary emotions visibility
   */
  toggleSecondaryEmotions() {
    const secondaryContainer = document.getElementById("secondaryEmotions");
    const toggleBtn = document.getElementById("toggleMoreEmotions");

    if (secondaryContainer && toggleBtn) {
      const isHidden = secondaryContainer.style.display === "none";
      secondaryContainer.style.display = isHidden ? "block" : "none";

      const icon = toggleBtn.querySelector(".toggle-icon");
      if (icon) {
        icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
      }

      const emotionCount =
        secondaryContainer.querySelectorAll(".emotion-bar-item").length;
      toggleBtn.innerHTML = isHidden
        ? `Hide ${emotionCount} emotions <svg class="toggle-icon" style="transform: rotate(180deg);" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`
        : `Show ${emotionCount} more emotions <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    const dateRangeSelect = document.getElementById("dateRangeFilter");
    if (dateRangeSelect && this.boundHandlers.dateRangeChange) {
      dateRangeSelect.removeEventListener(
        "change",
        this.boundHandlers.dateRangeChange
      );
    }

    const platformSelect = document.getElementById("platformFilter");
    if (platformSelect && this.boundHandlers.platformFilter) {
      platformSelect.removeEventListener(
        "change",
        this.boundHandlers.platformFilter
      );
    }

    const exportBtn = document.getElementById("exportCSV");
    if (exportBtn && this.boundHandlers.exportCSV) {
      exportBtn.removeEventListener("click", this.boundHandlers.exportCSV);
    }

    const refreshBtn = document.getElementById("refreshEmotionDashboard");
    if (refreshBtn && this.boundHandlers.refresh) {
      refreshBtn.removeEventListener("click", this.boundHandlers.refresh);
    }

    const tableContainer = document.querySelector(".posts-table-container");
    if (tableContainer && this.boundHandlers.tableClick) {
      tableContainer.removeEventListener(
        "click",
        this.boundHandlers.tableClick
      );
    }
  }

  /**
   * Handle date range change
   */
  async handleDateRangeChange(dateRange) {
    this.filters.dateRange = dateRange;
    await this.applyFilters();
  }

  /**
   * Handle platform filter
   */
  async handlePlatformFilter(platform) {
    this.filters.platform = platform;
    await this.applyFilters();
  }

  /**
   * Apply all filters and refresh the dashboard
   */
  async applyFilters() {
    const refreshBtn = document.getElementById("refreshEmotionDashboard");
    if (refreshBtn) {
      refreshBtn.classList.add("loading");
      refreshBtn.disabled = true;
    }

    try {
      // Reload all data
      const [emotionAnalysis, allPosts, engagementTrends] = await Promise.all([
        window.api.request(
          `/api/v1/analytics/emotion-analysis?days=${this.filters.dateRange}`
        ),
        window.api.request("/api/v1/analytics/top-posts?limit=100"),
        window.api.request(
          `/api/v1/analytics/engagement-trends?days=${this.filters.dateRange}`
        ),
      ]);

      // Apply filters to posts
      const filteredPosts = this.filterPosts(
        allPosts,
        this.filters.dateRange,
        this.filters.platform
      );

      this.data = {
        emotionAnalysis: emotionAnalysis,
        topPosts: filteredPosts,
        allPosts: allPosts,
        engagementTrends: engagementTrends,
        processedStats: this.processEmotionData({
          emotionAnalysis,
          topPosts: filteredPosts,
          engagementTrends,
        }),
      };

      // Re-render all components
      this.renderStatCards();
      this.renderEmotionTrendsChart();

      // Update emotion breakdown
      const breakdownContainer = document.querySelector(
        ".emotion-breakdown-grid"
      );
      if (breakdownContainer) {
        breakdownContainer.innerHTML = this.getEmotionBreakdownHTML();
      }

      // Reset posts display limit when filters change
      this.postsDisplayLimit = 5;

      // Update posts table
      const tableContainer = document.querySelector(".posts-table-container");
      if (tableContainer) {
        tableContainer.innerHTML = this.getTopPostsTableHTML();
        this.attachSeeMoreHandler();
      }
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove("loading");
        refreshBtn.disabled = false;
      }
    }
  }

  /**
   * Export to CSV
   */
  exportToCSV() {
    if (!this.data || !this.data.topPosts) return;

    const headers = [
      "Content",
      "Platform",
      "Date",
      "Emotion",
      "Likes",
      "Retweets",
      "Replies",
      "Total Engagement",
    ];
    const rows = this.data.topPosts.map((post) => [
      `"${(post.content || "").replace(/"/g, '""')}"`,
      post.platform || "twitter",
      this.formatDate(post.created_at),
      post.emotion || "neutral",
      post.likes_count || 0,
      post.retweets_count || 0,
      post.replies_count || 0,
      post.engagement || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emotion-analysis-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    const refreshBtn = document.getElementById("refreshEmotionDashboard");
    if (refreshBtn) {
      refreshBtn.classList.add("loading");
      refreshBtn.disabled = true;
    }

    try {
      this.dataLoader.clearCache();
      await this.render();
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove("loading");
        refreshBtn.disabled = false;
      }
    }
  }

  /**
   * View post details
   */
  viewPostDetails(postId) {
    console.log("View post details:", postId);
    // TODO: Implement post detail modal
  }

  /**
   * Get main HTML structure
   */
  getHTML() {
    return `
            <div class="dashboard-header">
                <div>
                    <h1>Emotion Dashboard</h1>
                    <p class="subtitle">Analyze emotional patterns in your social media content</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="exportCSV" class="btn-export">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export CSV
                    </button>
                    <button id="refreshEmotionDashboard" class="btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="filter-controls">
                <div class="filter-group">
                    <label for="dateRangeFilter">Date Range:</label>
                    <select id="dateRangeFilter" class="filter-select">
                        <option value="7">Last 7 days</option>
                        <option value="30" selected>Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="platformFilter">Platform:</label>
                    <select id="platformFilter" class="filter-select">
                        <option value="all">All Platforms</option>
                        <option value="twitter">Twitter</option>
                        <option value="instagram">Instagram</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <!-- Stats cards will be inserted here -->
            </div>

            <!-- Emotion Trends Chart -->
            <div class="chart-card" style="margin-bottom: 32px;">
                <div class="chart-header">
                    <h3>Emotion Trends Over Time</h3>
                    <span class="chart-period">Last ${
                      this.filters.dateRange
                    } days</span>
                </div>
                <div class="chart-container" style="min-height: 400px;">
                    <canvas id="emotionTrendsChart"></canvas>
                </div>
            </div>

            <!-- Posts by Emotion Section -->
            <div class="section">
                <div class="section-header">
                    <h2>Posts by Emotion</h2>
                </div>
                <div class="emotion-breakdown-grid">
                    ${this.getEmotionBreakdownHTML()}
                </div>
            </div>

            <!-- Top Performing Posts -->
            <div class="section">
                <div class="section-header">
                    <h2>Top Performing Posts</h2>
                </div>
                <div class="posts-table-container">
                    ${this.getTopPostsTableHTML()}
                </div>
            </div>
        `;
  }

  /**
   * Get emotion breakdown HTML - Display all 28 emotions with smart grouping
   */
  getEmotionBreakdownHTML() {
    if (!this.data || !this.data.processedStats) {
      return '<p class="no-data">No emotion data available</p>';
    }

    const { emotionBreakdown, emotionPercentages } = this.data.processedStats;

    // Emotion metadata with icons and colors
    const emotionMetadata = this.getEmotionMetadata();

    // Get sorted emotions (already sorted by count in processEmotionData)
    const sortedEmotions = Object.keys(emotionBreakdown);

    if (sortedEmotions.length === 0) {
      return '<p class="no-data">No emotion data available</p>';
    }

    // Split into primary (top 10) and secondary (rest)
    const primaryEmotions = sortedEmotions.slice(0, 10);
    const secondaryEmotions = sortedEmotions.slice(10);

    let html = '<div class="emotion-breakdown-primary">';

    // Render primary emotions (always visible)
    primaryEmotions.forEach((emotionKey) => {
      const metadata = emotionMetadata[emotionKey] || {
        icon: "😐",
        color: "#6B7280",
        category: "neutral",
      };
      const count = emotionBreakdown[emotionKey];
      const percentage = emotionPercentages[emotionKey];

      html += `
                <div class="emotion-bar-item emotion-${metadata.category}">
                    <div class="emotion-header">
                        <span class="emotion-name">
                            <span class="emotion-icon">${metadata.icon}</span>
                            <span class="emotion-label">${this.capitalizeEmotion(
                              emotionKey
                            )}</span>
                            <span class="emotion-count">(${count})</span>
                        </span>
                        <div class="emotion-bar-container">
                            <div class="emotion-bar-fill"
                                 style="width: ${percentage}%; background: ${
        metadata.color
      };">
                            </div>
                        </div>
                        <span class="emotion-percentage">${percentage}%</span>
                    </div>
                </div>
            `;
    });

    html += "</div>";

    // Render secondary emotions (collapsible)
    if (secondaryEmotions.length > 0) {
      html += `
                <div class="emotion-breakdown-toggle">
                    <button id="toggleMoreEmotions" class="btn-text">
                        Show ${secondaryEmotions.length} more emotions
                        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div id="secondaryEmotions" class="emotion-breakdown-secondary" style="display: none;">
            `;

      secondaryEmotions.forEach((emotionKey) => {
        const metadata = emotionMetadata[emotionKey] || {
          icon: "😐",
          color: "#6B7280",
          category: "neutral",
        };
        const count = emotionBreakdown[emotionKey];
        const percentage = emotionPercentages[emotionKey];

        html += `
                    <div class="emotion-bar-item emotion-${metadata.category}">
                        <div class="emotion-header">
                            <span class="emotion-name">
                                <span class="emotion-icon">${
                                  metadata.icon
                                }</span>
                                <span class="emotion-label">${this.capitalizeEmotion(
                                  emotionKey
                                )}</span>
                                <span class="emotion-count">(${count})</span>
                            </span>
                            <div class="emotion-bar-container">
                                <div class="emotion-bar-fill"
                                     style="width: ${percentage}%; background: ${
          metadata.color
        };">
                                </div>
                            </div>
                            <span class="emotion-percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
      });

      html += "</div>";
    }

    return html;
  }

  /**
   * Get emotion metadata (icons, colors, categories)
   */
  getEmotionMetadata() {
    return {
      // Positive emotions
      joy: { icon: "😊", color: "#10B981", category: "positive" },
      love: { icon: "❤️", color: "#EC4899", category: "positive" },
      admiration: { icon: "🤩", color: "#8B5CF6", category: "positive" },
      approval: { icon: "👍", color: "#10B981", category: "positive" },
      caring: { icon: "🤗", color: "#EC4899", category: "positive" },
      excitement: { icon: "🎉", color: "#F59E0B", category: "positive" },
      gratitude: { icon: "🙏", color: "#10B981", category: "positive" },
      optimism: { icon: "✨", color: "#3B82F6", category: "positive" },
      pride: { icon: "😌", color: "#8B5CF6", category: "positive" },
      relief: { icon: "😮‍💨", color: "#10B981", category: "positive" },
      desire: { icon: "😍", color: "#EC4899", category: "positive" },
      amusement: { icon: "😄", color: "#F59E0B", category: "positive" },

      // Negative emotions
      anger: { icon: "😠", color: "#EF4444", category: "negative" },
      annoyance: { icon: "😒", color: "#F97316", category: "negative" },
      disappointment: { icon: "😞", color: "#EF4444", category: "negative" },
      disapproval: { icon: "👎", color: "#DC2626", category: "negative" },
      disgust: { icon: "🤢", color: "#84CC16", category: "negative" },
      embarrassment: { icon: "😳", color: "#EC4899", category: "negative" },
      fear: { icon: "😨", color: "#8B5CF6", category: "negative" },
      grief: { icon: "😢", color: "#6366F1", category: "negative" },
      nervousness: { icon: "😰", color: "#F59E0B", category: "negative" },
      remorse: { icon: "😔", color: "#6B7280", category: "negative" },
      sadness: { icon: "😭", color: "#3B82F6", category: "negative" },

      // Neutral/Mixed emotions
      neutral: { icon: "😐", color: "#6B7280", category: "neutral" },
      surprise: { icon: "😲", color: "#F59E0B", category: "surprise" },
      confusion: { icon: "😕", color: "#A855F7", category: "surprise" },
      curiosity: { icon: "🤔", color: "#3B82F6", category: "surprise" },
      realization: { icon: "💡", color: "#FBBF24", category: "surprise" },
    };
  }

  /**
   * Capitalize emotion name
   */
  capitalizeEmotion(emotion) {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  }

  /**
   * Get top posts table HTML
   */
  getTopPostsTableHTML() {
    if (!this.data || !this.data.topPosts || this.data.topPosts.length === 0) {
      return '<p class="no-data">No posts available</p>';
    }

    const allPosts = this.data.topPosts;
    const posts = allPosts.slice(0, this.postsDisplayLimit);
    const hasMore = allPosts.length > this.postsDisplayLimit;

    return `
            <table class="posts-table">
                <thead class="table-header">
                    <tr>
                        <th>Post Content</th>
                        <th>Platform</th>
                        <th>Date</th>
                        <th>Emotion</th>
                        <th>Engagement</th>
                    </tr>
                </thead>
                <tbody>
                    ${posts
                      .map((post) => {
                        const emotionData = this.mapEmotionToCategory(
                          post.emotion
                        );
                        return `
                        <tr class="table-row" data-post-id="${post.id}">
                            <td class="content-cell">
                                ${this.escapeHtml(
                                  (post.content || "").substring(0, 100)
                                )}${
                          (post.content || "").length > 100 ? "..." : ""
                        }
                            </td>
                            <td>${this.getPlatformBadge(
                              post.platform || "twitter"
                            )}</td>
                            <td>${this.formatDate(post.created_at)}</td>
                            <td>
                                <span class="emotion-badge ${
                                  emotionData.class
                                }">
                                    ${emotionData.label}
                                </span>
                            </td>
                            <td class="engagement-cell">${this.formatEngagement(
                              post.engagement || 0
                            )}</td>
                        </tr>
                        `;
                      })
                      .join("")}
                </tbody>
            </table>
            <div style="text-align: center; margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                ${
                  this.postsDisplayLimit > 5
                    ? `
                    <button id="showLessPosts" class="btn-secondary" style="padding: 12px 24px;">
                        Show Less
                    </button>
                `
                    : ""
                }
                ${
                  hasMore
                    ? `
                    <button id="seeMorePosts" class="btn-secondary" style="padding: 12px 24px;">
                        See More Posts (${
                          allPosts.length - this.postsDisplayLimit
                        } remaining)
                    </button>
                `
                    : ""
                }
            </div>
        `;
  }

  /**
   * Map emotion value to visual category
   */
  mapEmotionToCategory(emotion) {
    const emotionLower = (emotion || "neutral").toLowerCase();

    // Map API emotion values to our five visual categories
    if (emotionLower === "positive") {
      return { class: "joy", label: "Joy" };
    } else if (emotionLower === "negative") {
      return { class: "anger", label: "Anger" };
    } else if (emotionLower === "neutral") {
      return { class: "neutral", label: "Neutral" };
    } else {
      // Already a specific category
      return {
        class: emotionLower,
        label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      };
    }
  }

  /**
   * Get platform badge HTML
   */
  getPlatformBadge(platform) {
    return `<span class="platform-badge ${platform.toLowerCase()}">${platform}</span>`;
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  /**
   * Format engagement numbers
   */
  formatEngagement(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get loading state HTML
   */
  getLoadingHTML() {
    return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading emotion analytics...</p>
            </div>
        `;
  }

  /**
   * Get error state HTML
   */
  getErrorHTML(message) {
    return `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Failed to Load Emotion Dashboard</h3>
                <p>${this.escapeHtml(message)}</p>
                <button onclick="window.location.reload()" class="btn-primary">Retry</button>
            </div>
        `;
  }

  /**
   * Cleanup when leaving page
   */
  destroy() {
    this.removeEventListeners();
    this.chartManager.destroyAll();
  }
}

// Create global instance
window.emotionDashboard = new EmotionDashboard();

export default EmotionDashboard;
