/**
 * Stat Cards Component
 * Generates and updates statistics cards
 */

class StatCards {
  constructor() {
    this.stats = {
      posts: 0,
      engagement: 0,
      sentiment: 0,
      slangUsage: 0,
    };
  }

  /**
   * Generate all stat cards HTML
   */
  generateCards(statsData) {
    this.stats = statsData;

    const cards = [
      this.createCard(
        "Total Posts",
        this.formatNumber(statsData.posts || 0),
        "Total analyzed",
        "message-circle",
        "neutral"
      ),
      this.createCard(
        "Avg Engagement",
        this.formatEngagement(statsData.engagement || 0),
        "Per post",
        "heart",
        "neutral"
      ),
      this.createCard(
        "Sentiment Score",
        this.formatPercent(statsData.sentiment || 0),
        this.getSentimentTrend(statsData.sentiment),
        "smile",
        this.getSentimentStatus(statsData.sentiment)
      ),
      this.createCard(
        "Gen-Z Slang Usage",
        this.formatPercent(statsData.slangUsage || 0),
        this.getSlangTrend(statsData.slangUsage),
        "message-circle",
        this.getSlangStatus(statsData.slangUsage)
      ),
    ];

    return `
            <div class="stats-grid">
                ${cards.join("")}
            </div>
        `;
  }

  /**
   * Create individual stat card - UPDATED TO MATCH DESIGN
   */
  createCard(title, value, trend, iconName, status) {
    const icon = this.getIcon(iconName);
    // Only show trend icon if trend text is not empty/generic
    const showTrendIcon =
      trend &&
      (trend.includes("+") ||
        trend.includes("-") ||
        trend.includes("Outlook") ||
        trend.includes("Usage"));

    let trendIcon = "";
    let trendClass = status || "neutral";

    if (showTrendIcon) {
      if (
        trend.includes("+") ||
        trend.includes("Positive") ||
        trend.includes("High")
      ) {
        trendIcon = this.getIcon("arrow-up");
        trendClass = "positive";
      } else if (
        trend.includes("-") ||
        trend.includes("Negative") ||
        trend.includes("Low")
      ) {
        trendIcon = this.getIcon("arrow-down");
        trendClass = "negative";
      } else {
        trendIcon = ""; // No icon for neutral
        trendClass = "neutral";
      }
    }

    return `
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-info">
                        <h3 class="stat-card-title">${title}</h3>
                        <div class="stat-card-value">${value}</div>
                    </div>
                    <div class="stat-card-icon">
                        ${icon}
                    </div>
                </div>
                <div class="stat-card-trend ${trendClass}">
                    ${trendIcon}
                    <span class="trend-text">${trend}</span>
                </div>
            </div>
        `;
  }

  /**
   * Update existing stat cards
   */
  updateCards(statsData) {
    this.stats = statsData;

    const statCards = document.querySelectorAll(".stat-card");
    if (statCards.length === 0) return;

    // Update posts
    if (statCards[0]) {
      const valueEl = statCards[0].querySelector(".stat-value");
      if (valueEl) {
        this.animateValue(
          valueEl,
          this.stats.posts,
          this.formatNumber(statsData.posts || 0)
        );
      }
    }

    // Update engagement
    if (statCards[1]) {
      const valueEl = statCards[1].querySelector(".stat-value");
      if (valueEl) {
        this.animateValue(
          valueEl,
          this.stats.engagement,
          this.formatEngagement(statsData.engagement || 0)
        );
      }
    }

    // Update sentiment
    if (statCards[2]) {
      const valueEl = statCards[2].querySelector(".stat-value");
      if (valueEl) {
        valueEl.textContent = this.formatPercent(statsData.sentiment || 0);
      }
    }

    // Update slang usage
    if (statCards[3]) {
      const valueEl = statCards[3].querySelector(".stat-value");
      if (valueEl) {
        valueEl.textContent = this.formatPercent(statsData.slangUsage || 0);
      }
    }
  }

  /**
   * Animate value change
   */
  animateValue(element, oldValue, newValue) {
    element.style.opacity = "0.5";
    setTimeout(() => {
      element.textContent = newValue;
      element.style.opacity = "1";
    }, 150);
  }

  /**
   * Format numbers with K/M suffix
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  /**
   * Format engagement with K suffix
   */
  formatEngagement(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(1);
  }

  /**
   * Format as percentage
   */
  formatPercent(num) {
    return Math.round(num * 100) / 100 + "%";
  }

  /**
   * Get sentiment trend text
   */
  getSentimentTrend(score) {
    if (score === 0) return "No data";
    if (score >= 70) return "Positive Outlook";
    if (score >= 50) return "Neutral Outlook";
    return "Negative Outlook";
  }

  /**
   * Get sentiment status class
   */
  getSentimentStatus(score) {
    if (score === 0) return "neutral";
    if (score >= 70) return "positive";
    if (score >= 50) return "neutral";
    return "negative";
  }

  /**
   * Get slang usage trend
   */
  getSlangTrend(usage) {
    if (usage === 0) return "No usage detected";
    if (usage >= 40) return "High Usage";
    if (usage >= 25) return "Moderate Usage";
    return "Low Usage";
  }

  /**
   * Get slang status class
   */
  getSlangStatus(usage) {
    if (usage >= 40) return "positive";
    if (usage >= 25) return "neutral";
    return "warning";
  }

  /**
   * Get SVG icon by name
   */
  getIcon(name) {
    const icons = {
      "trending-up":
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
      heart:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      smile:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
      "message-circle":
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
      alert:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      "arrow-up":
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
      "arrow-down":
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
    };
    return icons[name] || "";
  }

  /**
   * Generate overview-specific stat cards (for main dashboard)
   */
  generateOverviewCards(statsData) {
    const cards = [
      {
        title: "Total Posts",
        value: this.formatNumber(statsData.posts || 0),
        trend: "Total analyzed",
        icon: "message-circle",
        trendType: "neutral",
      },
      {
        title: "Avg Engagement",
        value: this.formatEngagement(statsData.engagement || 0),
        trend: "Per post",
        icon: "heart",
        trendType: "neutral",
      },
      {
        title: "Avg Emotion Score",
        value: this.formatPercent(statsData.sentiment || 0),
        trend: this.getSentimentTrend(statsData.sentiment),
        icon: "smile",
        trendType: this.getSentimentStatus(statsData.sentiment),
      },
      {
        title: "Flagged Posts",
        value: this.formatNumber(statsData.flaggedPosts || 0),
        trend: "Needs attention",
        icon: "alert",
        trendType: statsData.flaggedPosts > 0 ? "negative" : "neutral",
      },
    ];

    const cardsHTML = cards
      .map((card) =>
        this.createCard(
          card.title,
          card.value,
          card.trend,
          card.icon,
          card.trendType
        )
      )
      .join("");

    return `<div class="stats-grid">${cardsHTML}</div>`;
  }

  /**
   * Generate emotion-specific stat cards
   */
  generateEmotionCards(statsData) {
    const cards = [
      {
        title: "Total Posts Analyzed",
        value: this.formatNumber(statsData.totalPosts || 0),
        trend: statsData.changeMetrics?.postsChange || "+0%",
        icon: "message-circle",
        trendType: "positive",
      },
      {
        title: "Total Engagement",
        value: this.formatEngagement(statsData.totalEngagement || 0),
        trend: statsData.changeMetrics?.engagementChange || "+0%",
        icon: "heart",
        trendType: "positive",
      },
      {
        title: "Avg Emotion Score",
        value: this.formatPercentValue(statsData.avgEmotionScore || 0),
        trend: statsData.changeMetrics?.scoreChange || "+0%",
        icon: "smile",
        trendType: this.getEmotionScoreStatus(statsData.avgEmotionScore || 0),
      },
    ];

    // Build custom cards grid
    const cardsHTML = cards
      .map((card) =>
        this.createCard(
          card.title,
          card.value,
          card.trend,
          card.icon,
          card.trendType
        )
      )
      .join("");

    return `<div class="stats-grid">${cardsHTML}</div>`;
  }

  /**
   * Format value as percentage with % sign (0-100 range)
   */
  formatPercentValue(value) {
    if (typeof value !== "number") return "0.0%";
    return value.toFixed(1) + "%";
  }

  /**
   * Get emotion score status (positive/neutral/negative)
   */
  getEmotionScoreStatus(score) {
    if (score >= 70) return "positive";
    if (score >= 40) return "neutral";
    return "negative";
  }
}

// Create global instance
window.statCards = new StatCards();

export default StatCards;
