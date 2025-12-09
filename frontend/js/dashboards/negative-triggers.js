/**
 * Negative Triggers Dashboard
 * Identifies and analyzes posts that triggered negative reactions based on comment emotions
 */

import DataLoader from "../components/data-loader.js";
import ChartManager from "../components/chart-manager.js";
import StatCards from "../components/stat-cards.js";

class NegativeTriggersBoard {
  constructor() {
    this.dataLoader = window.dataLoader || new DataLoader();
    this.chartManager = window.chartManager || new ChartManager();
    this.statCards = window.statCards || new StatCards();
    this.data = null;
    this.filters = {
      dateRange: 30,
      platform: "all",
      severity: "all",
    };
    this.boundHandlers = {};
  }

  /**
   * Render the negative triggers dashboard
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
      console.error("Error loading negative triggers dashboard:", error);
      container.innerHTML = this.getErrorHTML(error.message);
    }
  }

  /**
   * Load all necessary data
   */
  async loadData() {
    try {
      const data = await this.dataLoader.loadNegativeTriggersData(
        this.filters.dateRange,
        this.filters.platform,
        this.filters.severity
      );

      console.log("Raw API Response:", data);

      return {
        negativeTriggers: data.negativeTriggers || [],
        stats: data.stats || this.getDefaultStats(),
      };
    } catch (error) {
      console.error("Error loading negative triggers data:", error);
      return {
        negativeTriggers: [],
        stats: this.getDefaultStats(),
      };
    }
  }

  /**
   * Get default stats structure
   */
  getDefaultStats() {
    return {
      totalNegative: 0,
      negativeRate: 0,
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      lowSeverityCount: 0,
    };
  }

  /**
   * Initialize components
   */
  initializeComponents() {
    this.renderStatCards();
    this.renderSeverityChart();
    this.attachEventListeners();
    this.attachPostCommentListeners();
  }

  /**
   * Render stat cards
   */
  renderStatCards() {
    const statsContainer = document.querySelector(".stats-grid");
    if (!statsContainer || !this.data) return;

    const stats = this.data.stats;

    const cards = [
      this.statCards.createCard(
        "Negative Posts",
        this.statCards.formatNumber(stats.totalNegative),
        "Based on comment negativity",
        "alert-triangle",
        "negative"
      ),
      this.statCards.createCard(
        "Negative Rate",
        stats.negativeRate + "%",
        "Of total posts",
        "trending-down",
        stats.negativeRate > 30 ? "negative" : "neutral"
      ),
      this.statCards.createCard(
        "High Severity Triggers",
        this.statCards.formatNumber(stats.highSeverityCount),
        "60%+ negative comments",
        "alert-circle",
        "negative"
      ),
    ];

    statsContainer.innerHTML = cards.join("");
  }

  /**
   * Render severity distribution chart
   */
  renderSeverityChart() {
    if (!this.data) return;

    const stats = this.data.stats;
    console.log("Severity Distribution Stats:", stats);
    console.log("Negative Triggers:", this.data.negativeTriggers);

    // Check if we have any data to display
    const total =
      stats.highSeverityCount +
      stats.mediumSeverityCount +
      stats.lowSeverityCount;

    if (total === 0) {
      // Display a message if no data
      const canvas = document.getElementById("severityChart");
      if (canvas) {
        const container = canvas.parentElement;
        container.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.5;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No Negative Triggers Found</p>
            <p style="font-size: 14px; margin-top: 8px;">No posts with ≥25% negative comments in the selected period</p>
            <p style="font-size: 13px; margin-top: 4px; opacity: 0.7;">Try changing the date range or filters</p>
          </div>
        `;
      }
      return;
    }

    const chartData = {
      labels: ["High Severity", "Medium Severity", "Low Severity"],
      datasets: [
        {
          data: [
            stats.highSeverityCount,
            stats.mediumSeverityCount,
            stats.lowSeverityCount,
          ],
          backgroundColor: ["#EF4444", "#F59E0B", "#10B981"],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    };

    // Use createPieChart for Chart.js formatted data
    this.chartManager.createPieChart("severityChart", chartData);
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
    }

    // Platform filter
    const platformSelect = document.getElementById("platformFilter");
    if (platformSelect) {
      this.boundHandlers.platform = (e) =>
        this.handlePlatformFilter(e.target.value);
      platformSelect.addEventListener("change", this.boundHandlers.platform);
    }

    // Severity filter
    const severitySelect = document.getElementById("severityFilter");
    if (severitySelect) {
      this.boundHandlers.severity = (e) =>
        this.handleSeverityFilter(e.target.value);
      severitySelect.addEventListener("change", this.boundHandlers.severity);
    }

    // Export button
    const exportBtn = document.getElementById("exportTriggersCSV");
    if (exportBtn) {
      this.boundHandlers.export = () => this.exportToCSV();
      exportBtn.addEventListener("click", this.boundHandlers.export);
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshTriggers");
    if (refreshBtn) {
      this.boundHandlers.refresh = () => this.refresh();
      refreshBtn.addEventListener("click", this.boundHandlers.refresh);
    }
  }

  /**
   * Attach listeners for view negative comments buttons
   */
  attachPostCommentListeners() {
    const viewCommentsButtons = document.querySelectorAll(
      ".view-negative-comments-btn"
    );
    viewCommentsButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const postId = parseInt(e.target.dataset.postId);
        this.showNegativeComments(postId);
      });
    });
  }

  /**
   * Show negative comments for a post
   */
  async showNegativeComments(postId) {
    try {
      const commentsData = await this.dataLoader.loadPostNegativeComments(
        postId
      );
      this.displayCommentsModal(commentsData);
    } catch (error) {
      console.error("Error loading negative comments:", error);
      alert("Failed to load negative comments. Please try again.");
    }
  }

  /**
   * Display comments in a modal
   */
  displayCommentsModal(commentsData) {
    const { post, negativeComments, stats } = commentsData;

    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Negative Comments Analysis</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Post Info -->
                <div class="post-info-card">
                    <h3>Original Post</h3>
                    <p>${this.escapeHtml(post.content)}</p>
                    <div class="post-meta">
                        <span>${new Date(
                          post.created_at_platform
                        ).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>${post.platform}</span>
                        <span>•</span>
                        <span>${post.likes_count || 0} likes</span>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="comments-stats-grid">
                    <div class="stat-mini-card">
                        <h4>Total Comments</h4>
                        <p class="stat-value">${stats.totalComments}</p>
                    </div>
                    <div class="stat-mini-card negative">
                        <h4>Negative Comments</h4>
                        <p class="stat-value">${stats.negativeCount}</p>
                    </div>
                    <div class="stat-mini-card">
                        <h4>Negativity Rate</h4>
                        <p class="stat-value">${stats.negativePercentage}%</p>
                    </div>
                    <div class="stat-mini-card">
                        <h4>Avg Sentiment</h4>
                        <p class="stat-value">${stats.avgSentiment.toFixed(
                          2
                        )}</p>
                    </div>
                </div>

                <!-- Comments List -->
                <div class="comments-list">
                    <h3>Negative Comments (${negativeComments.length})</h3>
                    ${negativeComments
                      .map(
                        (comment) => `
                        <div class="comment-card">
                            <div class="comment-header">
                                <span class="comment-author">@${this.escapeHtml(
                                  comment.author_username
                                )}</span>
                                <span class="comment-date">${new Date(
                                  comment.created_at_platform
                                ).toLocaleDateString()}</span>
                            </div>
                            <p class="comment-content">${this.escapeHtml(
                              comment.content
                            )}</p>
                            <div class="comment-footer">
                                <span class="emotion-badge emotion-${
                                  comment.dominant_emotion
                                }">
                                    ${comment.dominant_emotion}
                                </span>
                                <span class="sentiment-score">
                                    Sentiment: ${
                                      comment.sentiment_score
                                        ? comment.sentiment_score.toFixed(2)
                                        : "N/A"
                                    }
                                </span>
                                <span class="likes-count">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                    </svg>
                                    ${comment.likes_count || 0}
                                </span>
                            </div>
                            ${
                              comment.detected_slang &&
                              comment.detected_slang.length > 0
                                ? `
                                <div class="slang-detected">
                                    <strong>Slang detected:</strong> 
                                    ${comment.detected_slang
                                      .map((s) => s.term)
                                      .join(", ")}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    const elements = [
      { id: "dateRangeFilter", handler: "dateRange" },
      { id: "platformFilter", handler: "platform" },
      { id: "severityFilter", handler: "severity" },
      { id: "exportTriggersCSV", handler: "export" },
      { id: "refreshTriggers", handler: "refresh" },
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
    await this.refresh();
  }

  /**
   * Handle platform filter
   */
  async handlePlatformFilter(platform) {
    this.filters.platform = platform;
    await this.refresh();
  }

  /**
   * Handle severity filter
   */
  async handleSeverityFilter(severity) {
    this.filters.severity = severity;
    await this.refresh();
  }

  /**
   * Export triggers to CSV
   */
  exportToCSV() {
    if (!this.data) return;

    const triggers = this.data.negativeTriggers;
    const headers = [
      "Content",
      "Platform",
      "Date",
      "Severity",
      "Trigger Score",
      "Negative %",
      "Total Comments",
      "Negative Comments",
      "Engagement",
    ];
    const rows = triggers.map((post) => [
      `"${(post.content || "").replace(/"/g, '""')}"`,
      post.platform || "twitter",
      new Date(post.created_at).toLocaleDateString(),
      post.severity,
      post.triggerScore.toFixed(2),
      post.negativePercentage.toFixed(1) + "%",
      post.totalComments || 0,
      post.negativeComments || 0,
      post.engagement || 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negative-triggers-${
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
    await this.render();
  }

  /**
   * Get main HTML structure
   */
  getHTML() {
    return `
            <div class="dashboard-header">
                <div>
                    <h1>Negative Triggers</h1>
                    <p class="subtitle">Posts flagged based on negative comment emotions (≥25% threshold)</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="exportTriggersCSV" class="btn-export">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export CSV
                    </button>
                    <button id="refreshTriggers" class="btn-primary">
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
                        <option value="7" ${
                          this.filters.dateRange === 7 ? "selected" : ""
                        }>Last 7 days</option>
                        <option value="30" ${
                          this.filters.dateRange === 30 ? "selected" : ""
                        }>Last 30 days</option>
                        <option value="90" ${
                          this.filters.dateRange === 90 ? "selected" : ""
                        }>Last 90 days</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="platformFilter">PLATFORM:</label>
                    <select id="platformFilter" class="filter-select">
                        <option value="all" ${
                          this.filters.platform === "all" ? "selected" : ""
                        }>All Platforms</option>
                        <option value="twitter" ${
                          this.filters.platform === "twitter" ? "selected" : ""
                        }>Twitter</option>
                        <option value="instagram" ${
                          this.filters.platform === "instagram"
                            ? "selected"
                            : ""
                        }>Instagram</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="severityFilter">SEVERITY:</label>
                    <select id="severityFilter" class="filter-select">
                        <option value="all" ${
                          this.filters.severity === "all" ? "selected" : ""
                        }>All Severity</option>
                        <option value="high" ${
                          this.filters.severity === "high" ? "selected" : ""
                        }>High</option>
                        <option value="medium" ${
                          this.filters.severity === "medium" ? "selected" : ""
                        }>Medium</option>
                        <option value="low" ${
                          this.filters.severity === "low" ? "selected" : ""
                        }>Low</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid"></div>

            <!-- Severity Distribution Chart -->
            <div class="chart-card" style="margin-bottom: 32px;">
                <div class="chart-header">
                    <h3>Severity Distribution</h3>
                    <p class="chart-subtitle">High: ≥60% negative | Medium: 40-60% | Low: 25-40%</p>
                </div>
                <div class="chart-container" style="min-height: 300px;">
                    <canvas id="severityChart"></canvas>
                </div>
            </div>

            <!-- Triggers Table -->
            <div class="section">
                <div class="section-header">
                    <h2>Negative Trigger Posts</h2>
                    <p class="section-subtitle">Posts with ≥25% negative comments</p>
                </div>
                ${this.getTriggersTableHTML()}
            </div>
        `;
  }

  /**
   * Get triggers table HTML
   */
  getTriggersTableHTML() {
    const triggers = this.data.negativeTriggers || [];

    if (triggers.length === 0) {
      return '<p class="no-data">No negative triggers found for the selected filters</p>';
    }

    return `
            <table class="posts-table">
                <thead>
                    <tr class="table-header">
                        <th>Post Content</th>
                        <th>Severity</th>
                        <th>Negative %</th>
                        <th>Comments</th>
                        <th>Platform</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${triggers
                      .map(
                        (post) => `
                        <tr class="table-row">
                            <td class="content-cell">
                                ${this.escapeHtml(
                                  (post.content || "").substring(0, 100)
                                )}${
                          (post.content || "").length > 100 ? "..." : ""
                        }
                            </td>
                            <td>
                                <span class="severity-badge severity-${
                                  post.severity
                                }">
                                    ${post.severity}
                                </span>
                            </td>
                            <td>
                                <strong>${post.negativePercentage.toFixed(
                                  1
                                )}%</strong>
                                <br/>
                                <small class="text-muted">(${
                                  post.negativeComments
                                }/${post.totalComments})</small>
                            </td>
                            <td>${post.totalComments}</td>
                            <td>
                                <span class="platform-badge ${
                                  post.platform || "twitter"
                                }">
                                    ${post.platform || "twitter"}
                                </span>
                            </td>
                            <td>${new Date(
                              post.created_at
                            ).toLocaleDateString()}</td>
                            <td>
                                <button class="view-negative-comments-btn btn-small" data-post-id="${
                                  post.id
                                }">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    View Comments
                                </button>
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
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
   * Get loading HTML
   */
  getLoadingHTML() {
    return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading negative triggers analysis...</p>
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
                <p>${this.escapeHtml(message)}</p>
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
window.negativeTriggersBoard = new NegativeTriggersBoard();

export default NegativeTriggersBoard;
