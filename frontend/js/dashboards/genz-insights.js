/**
 * Gen-Z Insights Dashboard
 * Analyze Gen-Z slang usage, trends, and engagement patterns
 */

import DataLoader from "../components/data-loader.js";
import ChartManager from "../components/chart-manager.js";
import StatCards from "../components/stat-cards.js";

class GenZInsights {
  constructor() {
    this.dataLoader = window.dataLoader || new DataLoader();
    this.chartManager = window.chartManager || new ChartManager();
    this.statCards = window.statCards || new StatCards();
    this.data = null;
    this.filters = {
      dateRange: 30,
      platform: "all",
    };
    this.boundHandlers = {};
    this.showingAllSlang = false; // For show more/less functionality
  }

  /**
   * Render the Gen-Z insights dashboard
   */
  async render() {
    const container = document.getElementById("main-content");
    if (!container) return;

    container.innerHTML = this.getLoadingHTML();

    try {
      this.data = await this.loadData();
      container.innerHTML = this.getHTML();
      this.initializeComponents();
    } catch (error) {
      console.error("Error loading Gen-Z insights dashboard:", error);
      container.innerHTML = this.getErrorHTML(error.message);
    }
  }

  /**
   * Load all necessary data
   */
  async loadData() {
    try {
      // Build query parameters from filters
      const params = new URLSearchParams({
        date_range: this.filters.dateRange,
        platform: this.filters.platform,
      });

      // Fetch comprehensive slang insights from API
      const insights = await window.api.request(
        `/api/v1/analytics/dashboard/slang-insights?${params.toString()}`
      );

      console.log("Slang insights loaded:", insights);

      return insights;
    } catch (error) {
      console.error("Error loading Gen-Z insights data:", error);
      return this.getDefaultInsights();
    }
  }

  /**
   * Get default insights for error states
   */
  getDefaultInsights() {
    return {
      total_slang_count: 0,
      total_emoji_count: 0,
      top_slang_term: "N/A",
      slang_analysis: [],
      emoji_emotion_map: [],
      unique_terms: 0,
    };
  }

  /**
   * Initialize components
   */
  initializeComponents() {
    this.renderStatCards();
    this.renderTopSlangChart();
    this.renderEmojiEmotionMap();
    this.renderSlangTable();
    this.attachEventListeners();
  }

  /**
   * Render stat cards
   */
  renderStatCards() {
    const statsContainer = document.querySelector(".stats-grid");
    if (!statsContainer || !this.data) return;

    const cards = [
      this.statCards.createCard(
        "Total Slang Terms",
        this.statCards.formatNumber(this.data.total_slang_count),
        this.data.unique_terms > 0
          ? `${this.data.unique_terms} unique`
          : "No data",
        "message-circle",
        "positive"
      ),
      this.statCards.createCard(
        "Emoji Detected",
        this.statCards.formatNumber(this.data.total_emoji_count),
        "In all posts",
        "smile",
        "positive"
      ),
      this.statCards.createCard(
        "Top Slang Term",
        this.data.top_slang_term,
        "Most used",
        "trending-up",
        "positive"
      ),
    ];

    statsContainer.innerHTML = cards.join("");
  }

  /**
   * Render top slang chart
   */
  renderTopSlangChart() {
    if (!this.data || !this.data.slang_analysis) return;

    const topSlang = this.data.slang_analysis.slice(0, 10);

    if (topSlang.length === 0) {
      const canvas = document.getElementById("topSlangChart");
      if (canvas && canvas.parentElement) {
        canvas.parentElement.innerHTML =
          '<p class="empty-state">No slang data available</p>';
      }
      return;
    }

    const chartData = {
      labels: topSlang.map((s) => s.term.toUpperCase()),
      datasets: [
        {
          label: "Usage Count",
          data: topSlang.map((s) => s.usage_count),
          backgroundColor: [
            "rgba(124, 58, 237, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(167, 139, 250, 0.8)",
            "rgba(196, 181, 253, 0.8)",
            "rgba(218, 108, 255, 0.8)",
            "rgba(167, 139, 250, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(124, 58, 237, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(167, 139, 250, 0.8)",
          ],
          borderWidth: 0,
        },
      ],
    };

    this.chartManager.createBarChart("topSlangChart", chartData);
  }

  /**
   * Render emoji emotion map with size-based frequency
   */
  renderEmojiEmotionMap() {
    const container = document.getElementById("emojiEmotionMapContainer");
    if (!container || !this.data) return;

    const emojiData = this.data.emoji_emotion_map || [];

    if (emojiData.length === 0) {
      container.innerHTML =
        '<p class="empty-state">No emoji data available</p>';
      return;
    }

    // Find max count for scaling
    const maxCount = Math.max(...emojiData.map((e) => e.count));

    // Emotion color mapping
    const emotionColors = {
      joy: "#FF1493",
      admiration: "#DA6CFF",
      love: "#FF69B4",
      amusement: "#FF6B9D",
      excitement: "#FF1493",
      gratitude: "#DDA0DD",
      optimism: "#FFB6C1",
      neutral: "#6B7280",
      curiosity: "#3B82F6",
      surprise: "#10B981",
      realization: "#8B5CF6",
      confusion: "#60A5FA",
      anger: "#EF4444",
      annoyance: "#F97316",
      disappointment: "#FB923C",
      sadness: "#F87171",
      fear: "#7C2D12",
      disgust: "#B91C1C",
    };

    container.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; padding: 20px; min-height: 300px; align-items: center;">
        ${emojiData
          .map((item) => {
            const scale = 0.5 + (item.count / maxCount) * 1.5; // Scale from 0.5x to 2x
            const fontSize = Math.round(30 + (item.count / maxCount) * 50); // 30px to 80px
            const color = emotionColors[item.emotion] || emotionColors.neutral;

            return `
            <div class="emoji-item" style="
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              transition: transform 0.3s ease;
            " 
            onmouseover="this.style.transform='scale(1.2)'" 
            onmouseout="this.style.transform='scale(1)'">
              <div style="
                font-size: ${fontSize}px;
                line-height: 1;
                filter: drop-shadow(0 4px 8px rgba(124, 58, 237, 0.3));
                cursor: pointer;
              " title="${item.emotion}: ${item.count} uses">
                ${item.emoji}
              </div>
              <div style="
                font-size: 11px;
                color: ${color};
                font-weight: 600;
                text-transform: capitalize;
                background: rgba(124, 58, 237, 0.1);
                padding: 2px 8px;
                border-radius: 10px;
                border: 1px solid ${color}40;
              ">
                ${item.count}
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  }

  /**
   * Render slang table with pagination
   */
  renderSlangTable() {
    const tableContainer = document.getElementById("slangTableContainer");
    if (!tableContainer || !this.data) return;

    const allSlang = this.data.slang_analysis || [];

    if (allSlang.length === 0) {
      tableContainer.innerHTML =
        '<p class="empty-state">No slang terms found</p>';
      return;
    }

    // Show first 10 or all based on state
    const displaySlang = this.showingAllSlang
      ? allSlang
      : allSlang.slice(0, 10);

    tableContainer.innerHTML = `
            <div class="table-responsive">
                <table class="posts-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="width: 12%; text-align: left; padding: 12px;">Slang Term</th>
                            <th style="width: 48%; text-align: left; padding: 12px;">Meaning</th>
                            <th style="width: 15%; text-align: center; padding: 12px;">Usage Count</th>
                            <th style="width: 25%; text-align: center; padding: 12px;">Emotion</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displaySlang
                          .map(
                            (slang) => `
                            <tr>
                                <td style="width: 12%; text-align: left; padding: 12px; vertical-align: top;">
                                    <strong style="color: var(--accent-purple); text-transform: uppercase; font-size: 14px;">
                                        ${this.escapeHtml(slang.term)}
                                    </strong>
                                </td>
                                <td style="width: 48%; text-align: left; padding: 12px; color: var(--text-secondary); vertical-align: top;">
                                    ${this.escapeHtml(slang.meaning || "N/A")}
                                </td>
                                <td style="width: 15%; text-align: center; padding: 12px; vertical-align: top;">
                                    <strong style="color: var(--accent-purple); font-size: 16px;">${
                                      slang.usage_count
                                    }</strong>
                                </td>
                                <td style="width: 25%; text-align: center; padding: 12px; vertical-align: top;">
                                    <span style="
                                        display: inline-block;
                                        padding: 6px 14px;
                                        background: ${this.getEmotionColor(
                                          slang.emotion || "neutral"
                                        )}15;
                                        border: 1px solid ${this.getEmotionColor(
                                          slang.emotion || "neutral"
                                        )}60;
                                        border-radius: 14px;
                                        font-size: 12px;
                                        text-transform: capitalize;
                                        color: ${this.getEmotionColor(
                                          slang.emotion || "neutral"
                                        )};
                                        font-weight: 600;
                                    ">
                                        ${this.escapeHtml(
                                          slang.emotion || "neutral"
                                        )}
                                    </span>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            ${
              allSlang.length > 10
                ? `
                <div style="text-align: center; margin-top: 20px;">
                    <button id="toggleSlangBtn" class="btn-secondary">
                        ${
                          this.showingAllSlang
                            ? "Show Less"
                            : `Show More (${allSlang.length - 10} more)`
                        }
                    </button>
                </div>
            `
                : ""
            }
        `;

    // Attach toggle button event
    const toggleBtn = document.getElementById("toggleSlangBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.showingAllSlang = !this.showingAllSlang;
        this.renderSlangTable();
      });
    }
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
   * Get emotion color based on emotion type
   */
  getEmotionColor(emotion) {
    const emotionColors = {
      // Positive emotions (pink/magenta tones)
      joy: "#FF1493",
      admiration: "#DA6CFF",
      love: "#FF69B4",
      amusement: "#FF6B9D",
      excitement: "#FF1493",
      gratitude: "#DDA0DD",
      optimism: "#FFB6C1",
      pride: "#DA70D6",
      relief: "#EE82EE",
      approval: "#C77DFF",
      caring: "#FF99CC",
      desire: "#FF1493",

      // Negative emotions (red/orange tones)
      anger: "#EF4444",
      annoyance: "#F97316",
      disappointment: "#FB923C",
      disapproval: "#DC2626",
      disgust: "#B91C1C",
      embarrassment: "#FCA5A5",
      fear: "#7C2D12",
      grief: "#991B1B",
      nervousness: "#FED7AA",
      remorse: "#EA580C",
      sadness: "#F87171",

      // Ambiguous emotions (blue/purple/gray tones)
      confusion: "#60A5FA",
      curiosity: "#3B82F6",
      realization: "#8B5CF6",
      surprise: "#10B981",

      // Neutral
      neutral: "#6B7280",
    };

    return emotionColors[emotion.toLowerCase()] || emotionColors.neutral;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.removeEventListeners();

    // Date range filter
    const dateRangeSelect = document.getElementById("dateRangeFilter");
    if (dateRangeSelect) {
      this.boundHandlers.dateRange = (e) =>
        this.handleDateRangeChange(parseInt(e.target.value));
      dateRangeSelect.addEventListener("change", this.boundHandlers.dateRange);
      dateRangeSelect.value = this.filters.dateRange;
    }

    // Platform filter
    const platformSelect = document.getElementById("platformFilter");
    if (platformSelect) {
      this.boundHandlers.platform = (e) =>
        this.handlePlatformChange(e.target.value);
      platformSelect.addEventListener("change", this.boundHandlers.platform);
      platformSelect.value = this.filters.platform;
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshGenZ");
    if (refreshBtn) {
      this.boundHandlers.refresh = () => this.refresh();
      refreshBtn.addEventListener("click", this.boundHandlers.refresh);
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    const elements = [
      { id: "dateRangeFilter", handler: "dateRange" },
      { id: "platformFilter", handler: "platform" },
      { id: "sortFilter", handler: "sort" },
      { id: "refreshGenZ", handler: "refresh" },
    ];

    elements.forEach(({ id, handler }) => {
      const element = document.getElementById(id);
      if (element && this.boundHandlers[handler]) {
        element.removeEventListener("change", this.boundHandlers[handler]);
        element.removeEventListener("click", this.boundHandlers[handler]);
      }
    });
  }

  /**
   * Handle date range change
   */
  async handleDateRangeChange(dateRange) {
    this.filters.dateRange = dateRange;
    this.showingAllSlang = false; // Reset pagination
    await this.refresh();
  }

  /**
   * Handle platform change
   */
  async handlePlatformChange(platform) {
    this.filters.platform = platform;
    this.showingAllSlang = false; // Reset pagination
    await this.refresh();
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    await this.render();
  }

  /**
   * Get main HTML structure
   */
  getHTML() {
    return `
            <div class="dashboard-header">
                <div>
                    <h1>Gen-Z Insights</h1>
                    <p class="subtitle">Analyze slang usage, trends, and engagement patterns</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="refreshGenZ" class="btn-primary">
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
                    <label for="dateRangeFilter">DATE RANGE:</label>
                    <select id="dateRangeFilter" class="filter-select">
                        <option value="7">Last 7 days</option>
                        <option value="30" selected>Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="platformFilter">PLATFORM:</label>
                    <select id="platformFilter" class="filter-select">
                        <option value="all">All Platforms</option>
                        <option value="twitter">Twitter</option>
                        <option value="instagram">Instagram</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid"></div>

            <!-- Charts -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 32px;">
                <!-- Top Slang Terms -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Top Slang Terms</h3>
                        <span class="chart-period">By usage count</span>
                    </div>
                    <div class="chart-container" style="min-height: 350px;">
                        <canvas id="topSlangChart"></canvas>
                    </div>
                </div>

                <!-- Emoji Emotion Map -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Emoji Emotion Map</h3>
                        <span class="chart-period">Size indicates frequency</span>
                    </div>
                    <div id="emojiEmotionMapContainer" class="chart-container" style="min-height: 350px; overflow-y: auto;">
                    </div>
                </div>
            </div>

            <!-- Slang Table -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3>Slang Analysis</h3>
                    <span class="chart-period">Detailed breakdown of all slang terms</span>
                </div>
                <div id="slangTableContainer" style="padding: 24px;"></div>
            </div>
        `;
  }

  /**
   * Get loading HTML
   */
  getLoadingHTML() {
    return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading Gen-Z insights...</p>
            </div>
        `;
  }

  /**
   * Get error HTML
   */
  getErrorHTML(message) {
    return `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Failed to Load Dashboard</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn-primary">Retry</button>
            </div>
        `;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.removeEventListeners();
    this.chartManager.destroyAll();
  }
}

// Create global instance
window.genZInsights = new GenZInsights();

export default GenZInsights;
