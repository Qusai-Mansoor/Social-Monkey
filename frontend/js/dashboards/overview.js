/**
 * Overview Dashboard Page
 * Main dashboard view with stats, navigation cards, charts, and top posts
 */

import DataLoader from "../components/data-loader.js";
import ChartManager from "../components/chart-manager.js";
import StatCards from "../components/stat-cards.js";

class OverviewDashboard {
  constructor() {
    this.dataLoader = window.dataLoader || new DataLoader();
    // Ensure chartManager is initialized
    if (!window.chartManager) {
      window.chartManager = new ChartManager();
    }
    this.chartManager = window.chartManager;
    this.statCards = window.statCards || new StatCards();
    this.data = null;
    this.postsDisplayLimit = 5; // Start with 5 posts
  }

  /**
   * Render the overview dashboard
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

      // Add Analysis Button Listener
      this.setupAnalysisButton();
    } catch (error) {
      console.error("Error loading overview dashboard:", error);
      container.innerHTML = this.getErrorHTML(error.message);
    }
  }

  setupAnalysisButton() {
    // We'll inject the button into the header actions area if it exists
    const headerActions = document.querySelector(".header-actions");
    if (headerActions && !document.getElementById("analyze-btn")) {
      const btn = document.createElement("button");
      btn.id = "analyze-btn";
      btn.className = "btn btn-primary";
      btn.innerHTML = '<i class="fas fa-magic"></i> Run AI Analysis';
      btn.onclick = async () => {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        try {
          const result = await window.api.triggerAnalysis();
          const totalUpdated =
            result.total_updated || result.updated_count || 0;
          const postsUpdated = result.updated_count || 0;
          const commentsUpdated = result.comments_updated || 0;

          let message = `Analysis Complete!\n\n`;
          message += `✓ ${postsUpdated} posts analyzed\n`;
          message += `✓ ${commentsUpdated} comments analyzed\n`;
          message += `✓ Total: ${totalUpdated} items updated`;

          alert(message);
          // Reload page to show new data
          window.location.reload();
        } catch (e) {
          alert("Analysis failed: " + e.message);
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-magic"></i> Run AI Analysis';
        }
      };
      headerActions.prepend(btn);
    }
  }

  /**
   * Load all necessary data
   */
  async loadData() {
    try {
      // Fetch real overview data from the new endpoint
      const [overviewData, topPosts, slangData, emotionData] =
        await Promise.all([
          window.api.request("/api/v1/analytics/overview"),
          window.api.getTopPosts(100), // Load more posts to enable Show More functionality
          window.api.getSlangAnalysis(),
          window.api.request("/api/v1/analytics/emotion-analysis"),
        ]);

      console.log("Overview data loaded:", overviewData);
      console.log("Emotion data loaded:", emotionData);

      // Calculate flagged posts (negative emotions)
      const negativeEmotions = [
        "anger",
        "annoyance",
        "disappointment",
        "disapproval",
        "disgust",
        "embarrassment",
        "fear",
        "grief",
        "nervousness",
        "remorse",
        "sadness",
      ];

      let flaggedPosts = 0;
      if (emotionData && emotionData.breakdown) {
        negativeEmotions.forEach((emotion) => {
          flaggedPosts += emotionData.breakdown[emotion] || 0;
        });
      }

      // Format stats for StatCards component
      const stats = {
        posts: overviewData.total_posts || 0,
        engagement: overviewData.avg_engagement || 0,
        sentiment: overviewData.avg_sentiment || 0,
        flaggedPosts: flaggedPosts,
      };

      // Count unique slang terms
      const uniqueSlangTerms = slangData?.top_terms?.length || 0;

      // Count emojis from top posts
      const emojiCount = this.countEmojis(topPosts);

      // Ensure slangData is clean
      if (!slangData || !slangData.top_terms) {
        slangData = { top_terms: [] };
      }

      return {
        topPosts: topPosts || [],
        stats: stats,
        emotionData: overviewData.emotion_distribution,
        slangData: slangData,
        processedStats: overviewData,
        uniqueSlangTerms: uniqueSlangTerms,
        emojiCount: emojiCount,
        flaggedPosts: flaggedPosts,
      };
    } catch (error) {
      console.error("Error loading overview data:", error);
      return {
        topPosts: [],
        stats: { posts: 0, engagement: 0, sentiment: 0, flaggedPosts: 0 },
        emotionData: {},
        slangData: { top_terms: [] },
        processedStats: {},
        uniqueSlangTerms: 0,
        emojiCount: 0,
        flaggedPosts: 0,
      };
    }
  }

  /**
   * Count emojis in posts
   */
  countEmojis(posts) {
    if (!posts || posts.length === 0) return 0;

    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    let count = 0;

    posts.forEach((post) => {
      const matches = post.content?.match(emojiRegex);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  /**
   * Initialize charts and interactive components
   */
  initializeComponents() {
    // Render stat cards using the new generateOverviewCards method
    const statsContainer = document.querySelector(".stats-grid");
    if (statsContainer && this.data && this.data.stats) {
      const cardsHTML = this.statCards.generateOverviewCards(this.data.stats);
      statsContainer.outerHTML = cardsHTML;
    }

    // Initialize emotion chart
    // Always call createEmotionChart - it will handle empty data internally
    if (this.data) {
      this.chartManager.createEmotionChart(
        "emotionChart",
        this.data.emotionData || {}
      );
    }

    // Initialize slang chart
    if (
      this.data &&
      this.data.slangData &&
      this.data.slangData.top_terms &&
      this.data.slangData.top_terms.length > 0
    ) {
      const slangTermsData = {};
      this.data.slangData.top_terms.forEach((term) => {
        slangTermsData[term.term] = term.count;
      });
      this.chartManager.createSlangChart("slangChart", slangTermsData);
    } else {
      // Show empty state for slang chart
      const chartContainer =
        document.getElementById("slangChart")?.parentElement;
      if (chartContainer) {
        chartContainer.innerHTML = `
                    <div class="empty-chart-state">
                        <div class="empty-icon">💬</div>
                        <p>No slang terms detected yet</p>
                    </div>
                `;
      }
    }

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("refresh-dashboard");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refresh());
    }

    // Navigation cards
    const emotionAnalyticsCard = document.getElementById(
      "nav-emotion-analytics"
    );
    if (emotionAnalyticsCard) {
      emotionAnalyticsCard.addEventListener("click", () => {
        window.location.hash = "emotion-analysis";
      });
    }

    const negativeTriggersCard = document.getElementById(
      "nav-negative-triggers"
    );
    if (negativeTriggersCard) {
      negativeTriggersCard.addEventListener("click", () => {
        window.location.hash = "negative-triggers";
      });
    }

    const contentHeatmapsCard = document.getElementById("nav-content-heatmaps");
    if (contentHeatmapsCard) {
      contentHeatmapsCard.addEventListener("click", () => {
        window.location.hash = "heatmap";
      });
    }

    // View Comments buttons
    const commentButtons = document.querySelectorAll(".btn-view-comments");
    commentButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent card click
        const postId = btn.dataset.postId;
        await this.viewPostComments(postId);
      });
    });

    // Show More/Less Posts buttons
    this.attachPostsToggleHandlers();

    // Close comments modal
    const modalClose = document.getElementById("close-comments-modal");
    if (modalClose) {
      modalClose.addEventListener("click", () => this.closeCommentsModal());
    }

    // Close modal on background click
    const modal = document.getElementById("comments-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeCommentsModal();
        }
      });
    }
  }

  /**
   * Attach Show More/Less posts handlers
   */
  attachPostsToggleHandlers() {
    const showMoreBtn = document.getElementById("showMorePosts");
    if (showMoreBtn) {
      showMoreBtn.addEventListener("click", () => this.showMorePosts());
    }

    const showLessBtn = document.getElementById("showLessPosts");
    if (showLessBtn) {
      showLessBtn.addEventListener("click", () => this.showLessPosts());
    }
  }

  /**
   * Show more posts (increase limit by 5)
   */
  showMorePosts() {
    this.postsDisplayLimit += 5;
    this.updatePostsDisplay();
  }

  /**
   * Show less posts (decrease limit by 5, minimum 5)
   */
  showLessPosts() {
    this.postsDisplayLimit = Math.max(5, this.postsDisplayLimit - 5);
    this.updatePostsDisplay();
  }

  /**
   * Update posts display after changing limit
   */
  updatePostsDisplay() {
    const postsContainer = document.querySelector(".posts-grid");
    if (postsContainer) {
      postsContainer.innerHTML = this.getTopPostsHTML();
      // Reattach event listeners for comment buttons
      const commentButtons = document.querySelectorAll(".btn-view-comments");
      commentButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const postId = btn.dataset.postId;
          await this.viewPostComments(postId);
        });
      });
    }

    // Update the buttons container
    const buttonsContainer = document.querySelector(".posts-toggle-buttons");
    if (buttonsContainer) {
      buttonsContainer.innerHTML = this.getPostsToggleButtonsHTML();
      this.attachPostsToggleHandlers();
    }
  }

  /**
   * Refresh dashboard data
   */
  async refresh() {
    console.log("Refreshing overview dashboard...");
    await this.render();
  }

  /**
   * View post details
   */
  viewPostDetails(postId) {
    console.log("View post details:", postId);
    // TODO: Implement post detail modal or navigation
  }

  /**
   * View post comments
   */
  async viewPostComments(postId) {
    console.log("viewPostComments called with postId:", postId);
    // Navigate to comments view page
    window.location.hash = `post-comments/${postId}`;
    console.log("Hash set to:", window.location.hash);
  }

  showCommentsModal(postId, data, isLoading) {
    // Remove existing modal if any
    const existingModal = document.getElementById("comments-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
            <div id="comments-modal" class="modal-overlay">
                <div class="modal-container comments-modal">
                    <div class="modal-header">
                        <h2>Post Comments & Engagement</h2>
                        <button class="close-modal-btn" id="close-comments-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${
                          isLoading
                            ? this.renderCommentsLoading()
                            : this.renderCommentsContent(data)
                        }
                    </div>
                </div>
            </div>
        `;

    // Append to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listeners
    document
      .getElementById("close-comments-modal")
      .addEventListener("click", () => {
        this.closeCommentsModal();
      });

    // Close on overlay click
    document.getElementById("comments-modal").addEventListener("click", (e) => {
      if (e.target.id === "comments-modal") {
        this.closeCommentsModal();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.closeCommentsModal();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  renderCommentsLoading() {
    return `
            <div class="comments-loading">
                <div class="spinner"></div>
                <p>Loading comments...</p>
            </div>
        `;
  }

  renderCommentsContent(data) {
    if (!data || !data.post) {
      return '<p class="no-data">No data available</p>';
    }

    const { post, comments, stats } = data;

    return `
            <div class="comments-content">
                <!-- Post Summary -->
                <div class="post-summary-card">
                    <h3>Original Post</h3>
                    <p class="post-text">${this.escapeHtml(post.content)}</p>
                    <div class="post-meta">
                        <span><i class="fas fa-heart"></i> ${
                          post.likes_count
                        }</span>
                        <span><i class="fas fa-retweet"></i> ${
                          post.retweets_count
                        }</span>
                        <span><i class="fas fa-comment"></i> ${
                          post.replies_count
                        }</span>
                        <span class="dominant-emotion">
                            ${this.getEmotionIcon(post.dominant_emotion)} ${
      post.dominant_emotion || "neutral"
    }
                        </span>
                    </div>
                </div>

                <!-- Comments Statistics -->
                <div class="comments-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-value">${
                              stats.total_comments
                            }</div>
                            <div class="stat-label">Total Comments</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-value">${stats.total_likes}</div>
                            <div class="stat-label">Comment Likes</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            ${this.getEmotionIcon(stats.dominant_emotion)}
                        </div>
                        <div class="stat-details">
                            <div class="stat-value">${
                              stats.dominant_emotion || "neutral"
                            }</div>
                            <div class="stat-label">Dominant Emotion</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-value">${
                              stats.avg_sentiment
                                ? stats.avg_sentiment.toFixed(2)
                                : "N/A"
                            }</div>
                            <div class="stat-label">Avg Sentiment</div>
                        </div>
                    </div>
                </div>

                <!-- Emotion Breakdown Chart -->
                ${this.renderEmotionBreakdown(stats.emotion_breakdown)}

                <!-- Comments List -->
                <div class="comments-list-section">
                    <h3>Comments (${comments.length})</h3>
                    ${
                      comments.length === 0
                        ? '<p class="no-comments">No comments yet</p>'
                        : this.renderCommentsList(comments)
                    }
                </div>
            </div>
        `;
  }

  renderEmotionBreakdown(emotionBreakdown) {
    if (!emotionBreakdown || Object.keys(emotionBreakdown).length === 0) {
      return "";
    }

    const emotions = Object.entries(emotionBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6); // Top 6 emotions

    const maxCount = Math.max(...emotions.map(([, count]) => count));

    return `
            <div class="emotion-breakdown-section">
                <h3>Comment Emotions Breakdown</h3>
                <div class="emotion-bars">
                    ${emotions
                      .map(([emotion, count]) => {
                        const percentage = (count / maxCount) * 100;
                        return `
                            <div class="emotion-bar-item">
                                <div class="emotion-label">
                                    ${this.getEmotionIcon(emotion)}
                                    <span>${emotion}</span>
                                </div>
                                <div class="emotion-bar-container">
                                    <div class="emotion-bar" style="width: ${percentage}%"></div>
                                </div>
                                <div class="emotion-count">${count}</div>
                            </div>
                        `;
                      })
                      .join("")}
                </div>
            </div>
        `;
  }

  renderCommentsList(comments) {
    return `
            <div class="comments-list">
                ${comments
                  .map(
                    (comment) => `
                    <div class="comment-item">
                        <div class="comment-header">
                            <div class="comment-author">
                                <i class="fas fa-user-circle"></i>
                                <span>@${this.escapeHtml(
                                  comment.author_username
                                )}</span>
                            </div>
                            <div class="comment-meta">
                                <span class="comment-date">
                                    ${new Date(
                                      comment.created_at_platform
                                    ).toLocaleDateString()}
                            </span>
                            </div>
                        </div>
                        <div class="comment-content">
                            <p>${this.escapeHtml(comment.content)}</p>
                        </div>
                        <div class="comment-footer">
                            <div class="comment-stats">
                                <span><i class="fas fa-heart"></i> ${
                                  comment.likes_count
                                }</span>
                            </div>
                            ${
                              comment.dominant_emotion
                                ? `
                                <div class="comment-emotion">
                                    ${this.getEmotionIcon(
                                      comment.dominant_emotion
                                    )}
                                    <span>${comment.dominant_emotion}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              comment.sentiment_score !== null
                                ? `
                                <div class="comment-sentiment ${this.getSentimentClass(
                                  comment.sentiment_score
                                )}">
                                    <i class="fas ${this.getSentimentIcon(
                                      comment.sentiment_score
                                    )}"></i>
                                    <span>${this.getSentimentLabel(
                                      comment.sentiment_score
                                    )}</span>
                                </div>
                            `
                                : ""
                            }
                        </div>
                        ${
                          comment.detected_slang &&
                          comment.detected_slang.length > 0
                            ? `
                            <div class="comment-slang">
                                <i class="fas fa-language"></i>
                                <span>Slang detected: ${comment.detected_slang
                                  .map((s) => s.term)
                                  .join(", ")}</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  closeCommentsModal() {
    const modal = document.getElementById("comments-modal");
    if (modal) {
      modal.classList.add("fade-out");
      setTimeout(() => modal.remove(), 300);
    }
  }

  // Helper methods for sentiment display
  getSentimentClass(score) {
    if (score > 0.3) return "positive";
    if (score < -0.3) return "negative";
    return "neutral";
  }

  getSentimentIcon(score) {
    if (score > 0.3) return "fa-smile";
    if (score < -0.3) return "fa-frown";
    return "fa-meh";
  }

  getSentimentLabel(score) {
    if (score > 0.3) return "Positive";
    if (score < -0.3) return "Negative";
    return "Neutral";
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get main HTML structure
   */
  getHTML() {
    return `
            <div class="dashboard-header">
                <div>
                    <h1>Dashboard Overview</h1>
                    <p class="subtitle">Track your social media performance</p>
                </div>
                <div class="header-actions">
                    <button id="refresh-dashboard" class="btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <!-- Stats cards will be inserted here by StatCards component -->
            </div>

            <!-- Navigation Cards -->
            <div class="navigation-cards-section">
                <h2 class="section-title">Quick Access</h2>
                <div class="navigation-cards-grid">
                    ${this.getNavigationCardsHTML()}
                </div>
            </div>

            <!-- Charts Row -->
            <div class="charts-row">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Emotion Distribution</h3>
                        <span class="chart-period">Last 30 days</span>
                    </div>
                    <div class="chart-container">
                        <canvas id="emotionChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Top Gen-Z Slang Terms</h3>
                        <span class="chart-period">Most used</span>
                    </div>
                    <div class="chart-container">
                        <canvas id="slangChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top Performing Posts -->
            <div class="section">
                <div class="section-header">
                    <h2>Top Performing Posts</h2>
                </div>
                <div class="posts-grid">
                    ${this.getTopPostsHTML()}
                </div>
                <div class="posts-toggle-buttons">
                    ${this.getPostsToggleButtonsHTML()}
                </div>
            </div>

            <!-- Bottom Stats Section -->
            <div class="bottom-stats-section">
                ${this.getBottomStatsHTML()}
            </div>
        `;
  }

  /**
   * Get navigation cards HTML
   */
  getNavigationCardsHTML() {
    return `
            <div class="nav-card emotion-analytics" id="nav-emotion-analytics">
                <div class="nav-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                </div>
                <div class="nav-card-content">
                    <h3>Emotion Analytics</h3>
                    <p>View detailed emotion breakdowns and trends</p>
                </div>
                <div class="nav-card-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>

            <div class="nav-card negative-triggers" id="nav-negative-triggers">
                <div class="nav-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="nav-card-content">
                    <h3>Negative Triggers</h3>
                    <p>Identify and analyze negative sentiment triggers</p>
                </div>
                <div class="nav-card-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>

            <div class="nav-card content-heatmaps" id="nav-content-heatmaps">
                <div class="nav-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </div>
                <div class="nav-card-content">
                    <h3>Content Heatmaps</h3>
                    <p>Discover optimal posting times and patterns</p>
                </div>
                <div class="nav-card-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>
        `;
  }

  /**
   * Get bottom stats HTML
   */
  getBottomStatsHTML() {
    return `
            <div class="bottom-stats-grid">
                <div class="bottom-stat-card slang-detected">
                    <div class="bottom-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="bottom-stat-content">
                        <div class="bottom-stat-value">${
                          this.data?.uniqueSlangTerms || 0
                        }</div>
                        <div class="bottom-stat-label">Slang Detected</div>
                    </div>
                </div>

                <div class="bottom-stat-card emoji-used">
                    <div class="bottom-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                    </div>
                    <div class="bottom-stat-content">
                        <div class="bottom-stat-value">${
                          this.data?.emojiCount || 0
                        }</div>
                        <div class="bottom-stat-label">Emoji Used</div>
                    </div>
                </div>

                <div class="bottom-stat-card active-alerts">
                    <div class="bottom-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div class="bottom-stat-content">
                        <div class="bottom-stat-value">${
                          this.data?.flaggedPosts || 0
                        }</div>
                        <div class="bottom-stat-label">Active Alerts</div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Get emotion class for styling
   */
  getEmotionClass(emotion) {
    const emotionMap = {
      positive: "joy",
      joy: "joy",
      admiration: "admiration",
      neutral: "neutral",
      sarcasm: "sarcasm",
      negative: "anger",
      anger: "anger",
    };
    return emotionMap[emotion?.toLowerCase()] || "neutral";
  }

  /**
   * Get emotion metadata (icons and colors)
   */
  getEmotionMetadata() {
    return {
      // Positive emotions
      joy: { icon: "😊", color: "#10B981" },
      love: { icon: "❤️", color: "#EC4899" },
      admiration: { icon: "🤩", color: "#8B5CF6" },
      approval: { icon: "👍", color: "#10B981" },
      caring: { icon: "🤗", color: "#EC4899" },
      excitement: { icon: "🎉", color: "#F59E0B" },
      gratitude: { icon: "🙏", color: "#10B981" },
      optimism: { icon: "✨", color: "#3B82F6" },
      pride: { icon: "😌", color: "#8B5CF6" },
      relief: { icon: "😮‍💨", color: "#10B981" },
      desire: { icon: "😍", color: "#EC4899" },
      amusement: { icon: "😄", color: "#F59E0B" },

      // Negative emotions
      anger: { icon: "😠", color: "#EF4444" },
      annoyance: { icon: "😒", color: "#F97316" },
      disappointment: { icon: "😞", color: "#EF4444" },
      disapproval: { icon: "👎", color: "#DC2626" },
      disgust: { icon: "🤢", color: "#84CC16" },
      embarrassment: { icon: "😳", color: "#EC4899" },
      fear: { icon: "😨", color: "#8B5CF6" },
      grief: { icon: "😢", color: "#6366F1" },
      nervousness: { icon: "😰", color: "#F59E0B" },
      remorse: { icon: "😔", color: "#6B7280" },
      sadness: { icon: "😭", color: "#3B82F6" },

      // Neutral/Mixed emotions
      neutral: { icon: "😐", color: "#6B7280" },
      surprise: { icon: "😲", color: "#F59E0B" },
      confusion: { icon: "😕", color: "#A855F7" },
      curiosity: { icon: "🤔", color: "#3B82F6" },
      realization: { icon: "💡", color: "#FBBF24" },
    };
  }

  /**
   * Get emotion icon for a specific emotion
   */
  getEmotionIcon(emotion) {
    if (!emotion) return "😐";
    const metadata = this.getEmotionMetadata();
    return metadata[emotion.toLowerCase()]?.icon || "😐";
  }

  /**
   * Extract top 3 emotions from emotion_scores JSON
   */
  getTop3Emotions(emotionScores) {
    if (!emotionScores || typeof emotionScores !== "object") {
      return [];
    }

    return Object.entries(emotionScores)
      .map(([emotion, score]) => ({
        name: emotion,
        score: Math.round(score * 100), // Convert to percentage
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  /**
   * Get posts toggle buttons HTML
   */
  getPostsToggleButtonsHTML() {
    if (!this.data || !this.data.topPosts || this.data.topPosts.length === 0) {
      return "";
    }

    const totalPosts = this.data.topPosts.length;
    const hasMore = totalPosts > this.postsDisplayLimit;
    const canShowLess = this.postsDisplayLimit > 5;

    if (!hasMore && !canShowLess) {
      return "";
    }

    return `
      <div style="text-align: center; margin-top: 24px; display: flex; gap: 12px; justify-content: center;">
        ${
          canShowLess
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
          <button id="showMorePosts" class="btn-secondary" style="padding: 12px 24px;">
            Show More Posts (${totalPosts - this.postsDisplayLimit} remaining)
          </button>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return "Unknown date";
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
   * Escape HTML to prevent XSS
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
                <p>Loading dashboard...</p>
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
                <h3>Failed to Load Dashboard</h3>
                <p>${this.escapeHtml(message)}</p>
                <button onclick="window.location.reload()" class="btn-primary">Retry</button>
            </div>
        `;
  }

  /**
   * Cleanup when leaving page
   */
  destroy() {
    // Destroy all charts
    this.chartManager.destroyAll();
  }

  /**
   * Get default stats for error/empty states
   */
  getDefaultStats() {
    return {
      posts: 0,
      engagement: 0,
      sentiment: 0,
      flaggedPosts: 0,
    };
  }

  /**
   * Get top posts HTML with enhanced emotion display
   */
  getTopPostsHTML() {
    if (!this.data || !this.data.topPosts || this.data.topPosts.length === 0) {
      return `
                <div class="no-posts-message">
                    <div class="no-posts-icon">📝</div>
                    <h3>No posts yet</h3>
                    <p>Connect your social accounts and sync data to see your top performing posts here.</p>
                    <button class="btn-primary" onclick="window.location.hash = 'settings'">
                        Connect Accounts
                    </button>
                </div>
            `;
    }

    const emotionMetadata = this.getEmotionMetadata();

    // Slice posts based on current display limit
    const postsToDisplay = this.data.topPosts.slice(0, this.postsDisplayLimit);

    return postsToDisplay
      .map((post) => {
        const emotion = post.emotion || post.dominant_emotion || "neutral";
        const emotionClass = this.getEmotionClass(emotion);

        // Get top 3 emotions from emotion_scores
        const top3Emotions = this.getTop3Emotions(post.emotion_scores);

        // Get dominant emotion metadata
        const dominantMetadata = emotionMetadata[emotion] || {
          icon: "😐",
          color: "#6B7280",
        };

        // Get dominant emotion score from emotion_scores (0-1 range converted to percentage)
        let dominantScore = 0;
        if (post.emotion_scores && typeof post.emotion_scores === "object") {
          dominantScore = Math.round((post.emotion_scores[emotion] || 0) * 100);
        }

        return `
            <div class="post-card enhanced" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="platform-badge ${(
                      post.platform || "twitter"
                    ).toLowerCase()}">
                        ${post.platform || "Twitter"}
                    </div>
                    <span class="post-date">${this.formatDate(
                      post.created_at_platform || post.created_at
                    )}</span>
                </div>

                <div class="post-content">
                    <p>${this.truncateText(post.content || "", 120)}</p>
                </div>

                <!-- Top 3 Emotions Section -->
                ${
                  top3Emotions.length > 0
                    ? `
                <div class="post-top-emotions">
                    <div class="top-emotions-label">Top Emotions Detected:</div>
                    ${top3Emotions
                      .map((emo) => {
                        const meta = emotionMetadata[emo.name] || {
                          icon: "😐",
                          color: "#6B7280",
                        };
                        return `
                        <div class="emotion-bar-mini">
                            <div class="emotion-bar-header">
                                <span class="emotion-name-mini">
                                    <span class="emotion-icon-mini">${
                                      meta.icon
                                    }</span>
                                    <span class="emotion-label-mini">${this.capitalizeEmotion(
                                      emo.name
                                    )}</span>
                                </span>
                                <span class="emotion-percentage-mini">${
                                  emo.score
                                }%</span>
                            </div>
                            <div class="emotion-bar-track">
                                <div class="emotion-bar-progress" style="width: ${
                                  emo.score
                                }%; background: ${meta.color};"></div>
                            </div>
                        </div>
                        `;
                      })
                      .join("")}
                </div>
                `
                    : ""
                }

                <div class="post-stats">
                    <div class="stat-item">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${this.formatNumber(
                          post.likes_count || 0
                        )}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🔄</span>
                        <span class="stat-value">${this.formatNumber(
                          post.retweets_count || 0
                        )}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">💬</span>
                        <span class="stat-value">${this.formatNumber(
                          post.replies_count || 0
                        )}</span>
                    </div>
                </div>

                <!-- Dominant Emotion at Bottom -->
                <div class="post-dominant-emotion">
                    <span class="dominant-emotion-label">Dominant Emotion:</span>
                    <span class="emotion-badge ${emotionClass}" style="background: ${
          dominantMetadata.color
        }20; border-color: ${dominantMetadata.color}; color: ${
          dominantMetadata.color
        };">
                        <span class="emotion-icon">${
                          dominantMetadata.icon
                        }</span>
                        <span class="emotion-name">${this.capitalizeEmotion(
                          emotion
                        )}</span>
                        <span class="emotion-score">${dominantScore}%</span>
                    </span>
                </div>

                <!-- View Comments Button -->
                ${
                  post.replies_count > 0
                    ? `
                <button class="btn-view-comments btn-secondary" data-post-id="${
                  post.id
                }" style="width: 100%; margin-top: 12px; justify-content: center; display: inline-flex; align-items: center; gap: 8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    View ${post.replies_count} ${
                        post.replies_count === 1 ? "Comment" : "Comments"
                      }
                </button>
                `
                    : ""
                }
            </div>
            `;
      })
      .join("");
  }

  /**
   * Capitalize emotion name
   */
  capitalizeEmotion(emotion) {
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  }

  /**
   * Add missing truncateText method
   */
  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Add helper method for formatting numbers
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }
}

// Create global instance
window.overviewDashboard = new OverviewDashboard();

export default OverviewDashboard;
