/**
 * Post Comments View
 * Displays all comments for a specific post with emotion analysis
 */

class PostCommentsView {
  constructor() {
    this.postId = null;
    this.data = null;
  }

  /**
   * Render the comments view
   */
  async render(postId) {
    this.postId = postId;
    const container = document.getElementById("main-content");
    if (!container) return;

    // Show loading state
    container.innerHTML = this.getLoadingHTML();

    try {
      // Fetch comments data
      this.data = await this.fetchComments(postId);

      // Render comments content
      container.innerHTML = this.getHTML();
    } catch (error) {
      console.error("Error loading comments:", error);
      container.innerHTML = this.getErrorHTML(error.message);
    }
  }

  /**
   * Fetch comments from API
   */
  async fetchComments(postId) {
    const response = await fetch(`/api/v1/analytics/post-comments/${postId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }

    return await response.json();
  }

  /**
   * Get main HTML structure
   */
  getHTML() {
    if (!this.data || !this.data.post) {
      return this.getErrorHTML("No data available");
    }

    const { post, comments, stats } = this.data;

    return `
            <div class="comments-view-page">
                <!-- Header with Back Button -->
                <div class="comments-header">
                    <button class="btn-back" onclick="window.location.hash = 'overview'">
                        <i class="fas fa-arrow-left"></i>
                        Back to Overview
                    </button>
                    <h1>Post Comments & Engagement</h1>
                </div>

                <!-- Post Summary Card -->
                <div class="post-summary-section">
                    <h2>Original Post</h2>
                    <div class="post-summary-card">
                        <p class="post-text">${this.escapeHtml(
                          post.content
                        )}</p>
                        <div class="post-meta-row">
                            <div class="post-meta-item">
                                <i class="fas fa-heart"></i>
                                <span>${this.formatNumber(
                                  post.likes_count
                                )}</span>
                                <span class="meta-label">Likes</span>
                            </div>
                            <div class="post-meta-item">
                                <i class="fas fa-retweet"></i>
                                <span>${this.formatNumber(
                                  post.retweets_count
                                )}</span>
                                <span class="meta-label">Retweets</span>
                            </div>
                            <div class="post-meta-item">
                                <i class="fas fa-comment"></i>
                                <span>${this.formatNumber(
                                  post.replies_count
                                )}</span>
                                <span class="meta-label">Replies</span>
                            </div>
                            <div class="post-meta-item emotion-meta">
                                <span class="emotion-icon">${this.getEmotionIcon(
                                  post.dominant_emotion
                                )}</span>
                                <span class="emotion-name">${this.capitalizeEmotion(
                                  post.dominant_emotion || "neutral"
                                )}</span>
                                <span class="meta-label">Emotion</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="comments-stats-section">
                    <div class="stats-grid-4">
                        <div class="stat-card-modern">
                            <div class="stat-icon-wrapper blue">
                                <i class="fas fa-comments"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${
                                  stats.total_comments
                                }</div>
                                <div class="stat-label">Total Comments</div>
                            </div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-icon-wrapper pink">
                                <i class="fas fa-heart"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${this.formatNumber(
                                  stats.total_likes
                                )}</div>
                                <div class="stat-label">Comment Likes</div>
                            </div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-icon-wrapper purple">
                                <span class="emotion-icon-stat">${this.getEmotionIcon(
                                  stats.dominant_emotion
                                )}</span>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${this.capitalizeEmotion(
                                  stats.dominant_emotion || "neutral"
                                )}</div>
                                <div class="stat-label">Dominant Emotion</div>
                            </div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-icon-wrapper ${this.getSentimentClass(
                              stats.avg_sentiment
                            )}">
                                <i class="fas ${this.getSentimentIcon(
                                  stats.avg_sentiment
                                )}"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${
                                  stats.avg_sentiment
                                    ? stats.avg_sentiment.toFixed(2)
                                    : "N/A"
                                }</div>
                                <div class="stat-label">Avg Sentiment</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Emotion Breakdown -->
                ${this.renderEmotionBreakdown(stats.emotion_breakdown)}

                <!-- Comments List -->
                <div class="comments-list-section">
                    <h2>Comments (${comments.length})</h2>
                    ${
                      comments.length === 0
                        ? this.getNoCommentsHTML()
                        : this.renderCommentsList(comments)
                    }
                </div>
            </div>
        `;
  }

  /**
   * Render emotion breakdown chart
   */
  renderEmotionBreakdown(emotionBreakdown) {
    if (!emotionBreakdown || Object.keys(emotionBreakdown).length === 0) {
      return "";
    }

    const emotions = Object.entries(emotionBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8); // Top 8 emotions

    const total = emotions.reduce((sum, [, count]) => sum + count, 0);

    return `
            <div class="emotion-breakdown-section">
                <h2>Emotion Breakdown</h2>
                <div class="emotion-breakdown-grid">
                    ${emotions
                      .map(([emotion, count]) => {
                        const percentage = ((count / total) * 100).toFixed(1);
                        const metadata = this.getEmotionMetadata()[
                          emotion.toLowerCase()
                        ] || {
                          icon: "😐",
                          color: "#6B7280",
                        };
                        return `
                            <div class="emotion-breakdown-card">
                                <div class="emotion-breakdown-header">
                                    <span class="emotion-icon-large">${
                                      metadata.icon
                                    }</span>
                                    <div class="emotion-info">
                                        <div class="emotion-name-large">${this.capitalizeEmotion(
                                          emotion
                                        )}</div>
                                        <div class="emotion-stats">
                                            <span class="emotion-count">${count} ${
                          count === 1 ? "comment" : "comments"
                        }</span>
                                            <span class="emotion-percentage">${percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="emotion-bar-track">
                                    <div class="emotion-bar-fill" style="width: ${percentage}%; background: ${
                          metadata.color
                        };"></div>
                                </div>
                            </div>
                        `;
                      })
                      .join("")}
                </div>
            </div>
        `;
  }

  /**
   * Render comments list
   */
  renderCommentsList(comments) {
    return `
            <div class="comments-grid">
                ${comments
                  .map((comment) => {
                    const metadata = this.getEmotionMetadata()[
                      comment.dominant_emotion?.toLowerCase()
                    ] || { icon: "😐", color: "#6B7280" };

                    return `
                        <div class="comment-card">
                            <div class="comment-header">
                                <div class="comment-author">
                                    <div class="author-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="author-info">
                                        <div class="author-name">@${this.escapeHtml(
                                          comment.author_username
                                        )}</div>
                                        <div class="comment-date">${this.formatDate(
                                          comment.created_at_platform
                                        )}</div>
                                    </div>
                                </div>
                                <div class="comment-likes">
                                    <i class="fas fa-heart"></i>
                                    <span>${this.formatNumber(
                                      comment.likes_count || 0
                                    )}</span>
                                </div>
                            </div>
                            
                            <div class="comment-content">
                                <p>${this.escapeHtml(comment.content)}</p>
                            </div>
                            
                            <div class="comment-footer">
                                <div class="comment-emotion-badge" style="background: ${
                                  metadata.color
                                }20; border-color: ${metadata.color}; color: ${
                      metadata.color
                    };">
                                    <span class="emotion-icon">${
                                      metadata.icon
                                    }</span>
                                    <span class="emotion-label">${this.capitalizeEmotion(
                                      comment.dominant_emotion || "neutral"
                                    )}</span>
                                </div>
                                
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
                                
                                ${
                                  comment.detected_slang &&
                                  comment.detected_slang.length > 0
                                    ? `
                                    <div class="comment-slang">
                                        <i class="fas fa-language"></i>
                                        <span>${
                                          comment.detected_slang.length
                                        } slang ${
                                        comment.detected_slang.length === 1
                                          ? "term"
                                          : "terms"
                                      }</span>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `;
  }

  /**
   * Helper Methods
   */
  getEmotionMetadata() {
    return {
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
      neutral: { icon: "😐", color: "#6B7280" },
      surprise: { icon: "😲", color: "#F59E0B" },
      confusion: { icon: "😕", color: "#A855F7" },
      curiosity: { icon: "🤔", color: "#3B82F6" },
      realization: { icon: "💡", color: "#FBBF24" },
    };
  }

  getEmotionIcon(emotion) {
    if (!emotion) return "😐";
    const metadata = this.getEmotionMetadata();
    return metadata[emotion.toLowerCase()]?.icon || "😐";
  }

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

  capitalizeEmotion(emotion) {
    if (!emotion) return "Neutral";
    return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  formatDate(dateString) {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Loading state
   */
  getLoadingHTML() {
    return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading comments...</p>
            </div>
        `;
  }

  /**
   * Error state
   */
  getErrorHTML(message) {
    return `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Failed to Load Comments</h3>
                <p>${this.escapeHtml(message)}</p>
                <button onclick="window.location.hash = 'overview'" class="btn-primary">
                    <i class="fas fa-arrow-left"></i> Back to Overview
                </button>
            </div>
        `;
  }

  /**
   * No comments state
   */
  getNoCommentsHTML() {
    return `
            <div class="no-comments-state">
                <div class="no-comments-icon">💬</div>
                <h3>No Comments Yet</h3>
                <p>This post doesn't have any comments yet.</p>
            </div>
        `;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.postId = null;
    this.data = null;
  }
}

// Create global instance
window.postCommentsView = new PostCommentsView();

export default PostCommentsView;
