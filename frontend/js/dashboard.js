/**
 * Main Dashboard Controller
 * Orchestrates page loading and component initialization
 */

// Check authentication
if (!localStorage.getItem("access_token")) {
  window.location.href = "/login.html";
}

// Import modules
import SidebarController from "./sidebar.js";
import DataLoader from "./components/data-loader.js";
import ChartManager from "./components/chart-manager.js";
import StatCards from "./components/stat-cards.js";
import FilterManager from "./components/filter-manager.js";
import AutoRefreshManager from "./components/auto-refresh.js";
import FilterPanel from "./components/filter-panel.js";
import OverviewDashboard from "./dashboards/overview.js";
import EmotionDashboard from "./dashboards/emotion-dashboard.js";
import NegativeTriggersBoard from "./dashboards/negative-triggers.js";
import HeatmapAnalysis from "./dashboards/heatmap-analysis.js";
import GenZInsights from "./dashboards/genz-insights.js";
import PostCommentsView from "./dashboards/post-comments.js";

// Global instances
let currentPage = "overview";
let currentDashboard = null;

/**
 * Initialize Dashboard Application
 */
class DashboardApp {
  constructor() {
    this.sidebar = new SidebarController();
    this.dataLoader = new DataLoader();
    this.chartManager = new ChartManager();
    this.statCards = new StatCards();
    this.filterManager = window.filterManager || new FilterManager();
    this.autoRefreshManager =
      window.autoRefreshManager || new AutoRefreshManager();
    this.filterPanel =
      window.filterPanel || new FilterPanel(this.filterManager);

    this.currentPage = "overview";
    this.currentDashboard = null;

    // Valid routes
    this.validRoutes = [
      "overview",
      "emotion-analysis",
      "negative-triggers",
      "heatmap",
      "genz-insights",
      "post-comments",
      "settings",
    ];

    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    // Initialize sidebar
    await this.sidebar.init();

    // Render sidebar
    this.sidebar.renderSidebar();

    // Attach sidebar event listeners
    this.sidebar.attachEventListeners();

    // Initialize Phase 4 features
    this.initPhase4Features();

    // Listen for page navigation events
    document.addEventListener("pageChange", (e) => {
      this.navigateToPage(e.detail.page);
    });

    // Listen for hash changes (browser back/forward)
    window.addEventListener("hashchange", () => {
      this.handleHashChange();
    });

    // Check for OAuth callback
    this.checkOAuthCallback();

    // Load initial page based on hash, last visited, or default to overview
    const initialPage = this.getInitialPage();
    await this.navigateToPage(initialPage);

    // Hide loading overlay
    this.hideLoading();
  }

  /**
   * Initialize Phase 4 Features
   * - Advanced filtering
   * - Auto-refresh
   * - Filter panel UI
   */
  initPhase4Features() {
    // Setup filter panel
    this.setupFilterPanel();

    // Setup auto-refresh
    this.setupAutoRefresh();

    // Add filter and refresh controls to header
    this.addPhase4Controls();
  }

  /**
   * Setup filter panel
   */
  setupFilterPanel() {
    // Create filter panel container if it doesn't exist
    let container = document.getElementById("filterPanel");
    if (!container) {
      container = document.createElement("div");
      container.id = "filterPanel";
      document.body.appendChild(container);
    }

    // Render filter panel
    this.filterPanel.render("filterPanel");

    // Listen for filter changes
    this.filterManager.onChange((key, value, filters) => {
      console.log("Filter changed:", key, value);

      // Refresh current dashboard with new filters
      if (this.currentDashboard && this.currentDashboard.render) {
        this.currentDashboard.render();
      }
    });
  }

  /**
   * Setup auto-refresh
   */
  setupAutoRefresh() {
    // Register refresh callback
    this.autoRefreshManager.onRefresh(async (event, data) => {
      if (
        event === "refresh" &&
        this.currentDashboard &&
        this.currentDashboard.render
      ) {
        console.log("Auto-refreshing current dashboard...");
        await this.currentDashboard.render();
      }
    });

    // Start auto-refresh if enabled
    if (this.autoRefreshManager.isEnabled()) {
      this.autoRefreshManager.start();
    }

    // Start status updates
    this.autoRefreshManager.startStatusUpdates();
  }

  /**
   * Add Phase 4 controls to dashboard header
   */
  addPhase4Controls() {
    // This will be injected into each dashboard's header
    // Dashboards will call this method to get the controls HTML
  }

  /**
   * Get Phase 4 controls HTML
   */
  getPhase4ControlsHTML() {
    const autoRefreshStatus = this.autoRefreshManager.getStatus();

    return `
            <div class="phase4-controls" style="display: flex; align-items: center; gap: 12px;">
                <!-- Auto-Refresh Status -->
                <div id="autoRefreshStatus">
                    ${this.autoRefreshManager.createStatusIndicator()}
                </div>
                
                <!-- Auto-Refresh Toggle -->
                <button id="toggleAutoRefresh" class="btn-secondary" title="Toggle Auto-Refresh">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    ${
                      autoRefreshStatus.enabled ? "Disable" : "Enable"
                    } Auto-Refresh
                </button>
                
                <!-- Advanced Filters Button -->
                <button id="openFilterPanel" class="btn-filter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    Advanced Filters
                </button>
            </div>
        `;
  }

  /**
   * Attach Phase 4 control handlers
   */
  attachPhase4ControlHandlers() {
    // Toggle auto-refresh
    const toggleBtn = document.getElementById("toggleAutoRefresh");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.autoRefreshManager.toggle();
        // Update button text
        const isEnabled = this.autoRefreshManager.isEnabled();
        toggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    ${isEnabled ? "Disable" : "Enable"} Auto-Refresh
                `;
      });
    }

    // Open filter panel
    const filterBtn = document.getElementById("openFilterPanel");
    if (filterBtn) {
      filterBtn.addEventListener("click", () => {
        this.filterPanel.toggle();
        filterBtn.classList.toggle("active");
      });
    }
  }

  /**
   * Get initial page to load
   */
  getInitialPage() {
    // Priority 1: Check URL hash (most important - respects direct navigation)
    const hashPage = this.getPageFromHash();
    if (hashPage && this.isValidRoute(hashPage)) {
      console.log("Loading page from URL hash:", hashPage);
      return hashPage;
    }

    // Priority 2: Check last visited page from localStorage (only if no hash)
    const lastPage = localStorage.getItem("lastVisitedPage");
    if (lastPage && this.isValidRoute(lastPage)) {
      console.log("Loading last visited page:", lastPage);
      return lastPage;
    }

    // Priority 3: Default to overview
    console.log("Loading default page: overview");
    return "overview";
  }

  /**
   * Validate if a route is valid
   */
  isValidRoute(route) {
    return this.validRoutes.includes(route);
  }

  /**
   * Get page name from URL hash
   */
  getPageFromHash() {
    const hash = window.location.hash.slice(1); // Remove #
    // Extract page name from hash (e.g., "post-comments/14" -> "post-comments")
    const pageName = hash.split("/")[0];
    return pageName || null;
  }

  /**
   * Handle hash change (browser back/forward)
   */
  handleHashChange() {
    const page = this.getPageFromHash();

    // If no hash or invalid route, redirect to overview
    if (!page || !this.isValidRoute(page)) {
      window.location.hash = "overview";
      return;
    }

    // Update sidebar active state
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) {
      activeItem.classList.add("active");
    }

    // Navigate without triggering hash change again
    this.navigateToPage(page);
  }

  /**
   * Show 404 page for invalid routes
   */
  show404Page(attemptedRoute) {
    const container = document.getElementById("main-content");
    if (!container) return;

    container.innerHTML = `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <h2 style="font-size: 72px; margin: 16px 0; background: linear-gradient(135deg, var(--accent-purple), var(--accent-magenta)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">404</h2>
                <h3>Page Not Found</h3>
                <p>The route <code style="background: rgba(124, 58, 237, 0.2); padding: 4px 8px; border-radius: 4px;">#${attemptedRoute}</code> does not exist.</p>
                <button onclick="window.location.hash='overview'" class="btn-primary" style="margin-top: 16px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    Go to Overview
                </button>
            </div>
        `;
  }

  /**
   * Navigate to a specific page
   */
  async navigateToPage(pageName) {
    // Validate route
    if (!this.isValidRoute(pageName)) {
      console.warn("Invalid route:", pageName);
      this.show404Page(pageName);
      return;
    }

    // Prevent redundant navigation (except for post-comments which may have different postId)
    if (
      this.currentPage === pageName &&
      this.currentDashboard &&
      pageName !== "post-comments"
    ) {
      return;
    }

    // Destroy previous dashboard if exists
    if (this.currentDashboard && this.currentDashboard.destroy) {
      this.currentDashboard.destroy();
    }

    // Add exit animation
    const container = document.getElementById("main-content");
    if (container) {
      container.classList.add("content-area-exit");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.currentPage = pageName;

    // Save to localStorage for persistence
    localStorage.setItem("lastVisitedPage", pageName);

    // Update URL hash without triggering hashchange (skip for routes with parameters)
    const currentHash = window.location.hash.slice(1);
    if (currentHash !== pageName && !currentHash.startsWith(pageName + "/")) {
      history.replaceState(null, "", `#${pageName}`);
    }

    // Show loading and progress bar
    this.showLoading();
    this.showProgressBar();

    try {
      // Remove exit animation class
      if (container) {
        container.classList.remove("content-area-exit");
      }

      // Update progress
      this.updateProgressBar(30);

      switch (pageName) {
        case "overview":
          this.currentDashboard = window.overviewDashboard;
          this.updateProgressBar(60);
          await this.currentDashboard.render();
          break;

        case "emotion-analysis":
          this.currentDashboard = window.emotionDashboard;
          this.updateProgressBar(60);
          await this.currentDashboard.render();
          break;

        case "negative-triggers":
          this.currentDashboard = window.negativeTriggersBoard;
          this.updateProgressBar(60);
          await this.currentDashboard.render();
          break;

        case "heatmap":
          this.currentDashboard = window.heatmapAnalysis;
          this.updateProgressBar(60);
          await this.currentDashboard.render();
          break;

        case "genz-insights":
          this.currentDashboard = window.genZInsights;
          this.updateProgressBar(60);
          await this.currentDashboard.render();
          break;

        case "post-comments":
          console.log(
            "Navigating to post-comments, hash:",
            window.location.hash
          );
          // Extract postId from hash (e.g., #post-comments/14)
          const hashParts = window.location.hash.slice(1).split("/"); // Remove # and split
          const postId = hashParts[1];
          console.log("Extracted postId:", postId);
          if (!postId) {
            console.warn("No postId found, redirecting to overview");
            window.location.hash = "overview";
            return;
          }
          console.log("Creating postCommentsView instance");
          this.currentDashboard = window.postCommentsView;
          this.updateProgressBar(60);
          console.log("Rendering post comments for postId:", postId);
          await this.currentDashboard.render(postId);
          break;

        case "settings":
          this.updateProgressBar(60);
          this.showSettings();
          break;

        default:
          console.warn("Unknown page:", pageName);
          this.show404Page(pageName);
      }

      this.updateProgressBar(100);
    } catch (error) {
      console.error("Error navigating to page:", error);
      this.showError(error.message);
    } finally {
      this.hideLoading();
      this.hideProgressBar();
    }
  }

  /**
   * Show placeholder page
   */
  showPlaceholder(title, message) {
    const container = document.getElementById("main-content");
    if (!container) return;

    container.innerHTML = `
            <div class="placeholder-page">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                </svg>
                <h2>${title}</h2>
                <p>${message}</p>
            </div>
        `;
  }

  /**
   * Show settings page
   */
  showSettings() {
    const container = document.getElementById("main-content");
    if (!container) return;

    container.innerHTML = `
            <div class="settings-page">
                <div class="dashboard-header">
                    <h1>Settings</h1>
                    <p class="subtitle">Manage your account and preferences</p>
                </div>

                <div class="settings-section">
                    <h3>Connected Accounts</h3>
                    <div id="connected-accounts">
                        <p>Loading accounts...</p>
                    </div>
                    <button class="btn-primary" onclick="window.dashboardApp.connectTwitter()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                        </svg>
                        Connect Twitter Account
                    </button>
                </div>

                <div class="settings-section">
                    <h3>Account</h3>
                    <button class="btn-danger" onclick="window.dashboardApp.logout()">Logout</button>
                </div>
            </div>
        `;

    // Load connected accounts
    this.loadConnectedAccounts();
  }

  /**
   * Load connected accounts
   */
  async loadConnectedAccounts() {
    try {
      const accounts = await this.dataLoader.loadAccounts();
      const container = document.getElementById("connected-accounts");

      if (!container) return;

      if (accounts.length === 0) {
        container.innerHTML =
          '<p class="no-data">No accounts connected yet</p>';
        return;
      }

      container.innerHTML = accounts
        .map(
          (account) => `
                <div class="account-item">
                    <div class="account-info">
                        <span class="platform-badge">${account.platform}</span>
                        <span>@${
                          account.username || account.platform_username
                        }</span>
                    </div>
                    <div class="account-actions">
                        <button class="btn-secondary" onclick="window.dashboardApp.syncPosts(${
                          account.id
                        })" title="Fetch new posts only">
                            <i class="fas fa-file-alt"></i> Sync Posts
                        </button>
                         
                    </div>
                </div>
            `
        )
        .join("");
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  }

  /**
   * Connect Twitter account
   */
  async connectTwitter() {
    try {
      const response = await fetch("/api/v1/oauth/twitter/authorize", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.authorization_url) {
        const win = window.open(
          data.authorization_url,
          "_blank",
          "noopener,noreferrer"
        );
        if (win) {
          win.opener = null;
          win.focus();
        } else {
          // popup blocked — fallback to same tab
          //window.location.href = data.authorization_url;
        }
      }
    } catch (error) {
      console.error("Error connecting Twitter:", error);
      alert("Failed to connect Twitter account");
    }
  }

  /**
   * Sync account data with options
   */
  async syncAccount(
    accountId,
    options = { fetchPosts: true, fetchReplies: true }
  ) {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        fetch_posts: options.fetchPosts,
        fetch_replies: options.fetchReplies,
      });

      const response = await fetch(
        `/api/v1/ingestion/ingest/${accountId}?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sync account");
      }

      const result = await response.json();
      console.log("Sync result:", result);

      // Show success message
      this.showNotification(
        "success",
        result.message || "Data synced successfully"
      );

      // Refresh dashboard data to show new posts
      if (this.currentDashboard && this.currentDashboard.refresh) {
        await this.currentDashboard.refresh();
      }

      return result;
    } catch (error) {
      console.error("Sync error:", error);
      this.showNotification("error", error.message || "Failed to sync data");
      throw error;
    }
  }

  /**
   * Sync only posts (no replies)
   */
  async syncPosts(accountId) {
    return this.syncAccount(accountId, {
      fetchPosts: true,
      fetchReplies: false,
    });
  }

  /**
   * Sync only replies (no new posts)
   */
  async syncReplies(accountId) {
    return this.syncAccount(accountId, {
      fetchPosts: false,
      fetchReplies: true,
    });
  }

  /**
   * Sync both posts and replies
   */
  async syncAll(accountId) {
    return this.syncAccount(accountId, {
      fetchPosts: true,
      fetchReplies: true,
    });
  }

  /**
   * Logout user
   */
  logout() {
    if (!confirm("Are you sure you want to logout?")) return;

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_info");
    window.location.href = "/login";
  }

  /**
   * Check OAuth callback
   */
  checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get("connected");
    const username = urlParams.get("username");

    if (connected === "twitter" && username) {
      alert(`Twitter account @${username} connected successfully!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Show loading overlay
   */
  showLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.display = "flex";
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById("main-content");
    if (!container) return;

    container.innerHTML = `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn-primary">Reload Page</button>
            </div>
        `;
  }

  /**
   * Show navigation progress bar
   */
  showProgressBar() {
    const progress = document.getElementById("navProgress");
    const bar = document.getElementById("navProgressBar");
    if (progress && bar) {
      progress.classList.add("active");
      bar.style.width = "0%";
    }
  }

  /**
   * Update navigation progress bar
   */
  updateProgressBar(percent) {
    const bar = document.getElementById("navProgressBar");
    if (bar) {
      bar.style.width = `${percent}%`;
    }
  }

  /**
   * Hide navigation progress bar
   */
  hideProgressBar() {
    const progress = document.getElementById("navProgress");
    const bar = document.getElementById("navProgressBar");
    if (progress && bar) {
      setTimeout(() => {
        progress.classList.remove("active");
        bar.style.width = "0%";
      }, 300);
    }
  }

  /**
   * Get page title from route
   */
  getPageTitle(route) {
    const titles = {
      overview: "Overview",
      "emotion-analysis": "Emotion Dashboard",
      "negative-triggers": "Negative Triggers",
      heatmap: "Heatmap Analysis",
      "genz-insights": "Gen-Z Insights",
      settings: "Settings",
    };
    return titles[route] || "Dashboard";
  }

  /**
   * Show notification
   */
  showNotification(type, message) {
    // Remove existing notifications
    const existing = document.querySelector(".notification");
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${
                  type === "success" ? "✅" : "❌"
                }</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

    // Add to DOM
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification) notification.remove();
    }, 3000);
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.dashboardApp = new DashboardApp();
});

export default DashboardApp;
