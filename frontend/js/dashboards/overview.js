/**
 * Overview Dashboard Page
 * Main dashboard view with stats, navigation cards, charts, and top posts
 */

import DataLoader from '../components/data-loader.js';
import ChartManager from '../components/chart-manager.js';
import StatCards from '../components/stat-cards.js';

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
    }

    /**
     * Render the overview dashboard
     */
    async render() {
        const container = document.getElementById('main-content');
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
            console.error('Error loading overview dashboard:', error);
            container.innerHTML = this.getErrorHTML(error.message);
        }
    }

    setupAnalysisButton() {
        // We'll inject the button into the header actions area if it exists
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('analyze-btn')) {
            const btn = document.createElement('button');
            btn.id = 'analyze-btn';
            btn.className = 'btn btn-primary';
            btn.innerHTML = '<i class="fas fa-magic"></i> Run AI Analysis';
            btn.onclick = async () => {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                try {
                    const result = await window.api.triggerAnalysis();
                    alert(`Analysis Complete! Updated ${result.updated_count} posts.`);
                    // Reload page to show new data
                    window.location.reload();
                } catch (e) {
                    alert('Analysis failed: ' + e.message);
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
            const [overviewData, topPosts, slangData, emotionData] = await Promise.all([
                window.api.request('/api/v1/analytics/overview'),
                window.api.getTopPosts(5),
                window.api.getSlangAnalysis(),
                window.api.request('/api/v1/analytics/emotion-analysis')
            ]);

            console.log('Overview data loaded:', overviewData);
            console.log('Emotion data loaded:', emotionData);

            // Calculate flagged posts (negative emotions)
            const negativeEmotions = ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust',
                                     'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'];

            let flaggedPosts = 0;
            if (emotionData && emotionData.breakdown) {
                negativeEmotions.forEach(emotion => {
                    flaggedPosts += emotionData.breakdown[emotion] || 0;
                });
            }

            // Format stats for StatCards component
            const stats = {
                posts: overviewData.total_posts || 0,
                engagement: overviewData.avg_engagement || 0,
                sentiment: overviewData.avg_sentiment || 0,
                flaggedPosts: flaggedPosts
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
                flaggedPosts: flaggedPosts
            };

        } catch (error) {
            console.error('Error loading overview data:', error);
            return {
                topPosts: [],
                stats: { posts: 0, engagement: 0, sentiment: 0, flaggedPosts: 0 },
                emotionData: {},
                slangData: { top_terms: [] },
                processedStats: {},
                uniqueSlangTerms: 0,
                emojiCount: 0,
                flaggedPosts: 0
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

        posts.forEach(post => {
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
        const statsContainer = document.querySelector('.stats-grid');
        if (statsContainer && this.data && this.data.stats) {
            const cardsHTML = this.statCards.generateOverviewCards(this.data.stats);
            statsContainer.outerHTML = cardsHTML;
        }

        // Initialize emotion chart
        if (this.data && this.data.emotionData) {
            this.chartManager.createEmotionChart('emotionChart', this.data.emotionData);
        }

        // Initialize slang chart
        if (this.data && this.data.slangData && this.data.slangData.top_terms && this.data.slangData.top_terms.length > 0) {
            const slangTermsData = {};
            this.data.slangData.top_terms.forEach(term => {
                slangTermsData[term.term] = term.count;
            });
            this.chartManager.createSlangChart('slangChart', slangTermsData);
        } else {
            // Show empty state for slang chart
            const chartContainer = document.getElementById('slangChart')?.parentElement;
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
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Navigation cards
        const emotionAnalyticsCard = document.getElementById('nav-emotion-analytics');
        if (emotionAnalyticsCard) {
            emotionAnalyticsCard.addEventListener('click', () => {
                window.location.hash = 'emotion-analysis';
            });
        }

        const negativeTriggersCard = document.getElementById('nav-negative-triggers');
        if (negativeTriggersCard) {
            negativeTriggersCard.addEventListener('click', () => {
                window.location.hash = 'negative-triggers';
            });
        }

        const contentHeatmapsCard = document.getElementById('nav-content-heatmaps');
        if (contentHeatmapsCard) {
            contentHeatmapsCard.addEventListener('click', () => {
                window.location.hash = 'heatmap';
            });
        }

        // Post interactions
        const postCards = document.querySelectorAll('.post-card');
        postCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.post-actions')) {
                    const postId = card.dataset.postId;
                    this.viewPostDetails(postId);
                }
            });
        });
    }

    /**
     * Refresh dashboard data
     */
    async refresh() {
        console.log('Refreshing overview dashboard...');
        await this.render();
    }

    /**
     * View post details
     */
    viewPostDetails(postId) {
        console.log('View post details:', postId);
        // TODO: Implement post detail modal or navigation
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
                    <a href="#" class="view-all">View All</a>
                </div>
                <div class="posts-grid">
                    ${this.getTopPostsHTML()}
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
                        <div class="bottom-stat-value">${this.data?.uniqueSlangTerms || 0}</div>
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
                        <div class="bottom-stat-value">${this.data?.emojiCount || 0}</div>
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
                        <div class="bottom-stat-value">${this.data?.flaggedPosts || 0}</div>
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
            'positive': 'joy',
            'joy': 'joy',
            'admiration': 'admiration',
            'neutral': 'neutral',
            'sarcasm': 'sarcasm',
            'negative': 'anger',
            'anger': 'anger'
        };
        return emotionMap[emotion?.toLowerCase()] || 'neutral';
    }

    /**
     * Get emotion metadata (icons and colors)
     */
    getEmotionMetadata() {
        return {
            // Positive emotions
            'joy': { icon: '😊', color: '#10B981' },
            'love': { icon: '❤️', color: '#EC4899' },
            'admiration': { icon: '🤩', color: '#8B5CF6' },
            'approval': { icon: '👍', color: '#10B981' },
            'caring': { icon: '🤗', color: '#EC4899' },
            'excitement': { icon: '🎉', color: '#F59E0B' },
            'gratitude': { icon: '🙏', color: '#10B981' },
            'optimism': { icon: '✨', color: '#3B82F6' },
            'pride': { icon: '😌', color: '#8B5CF6' },
            'relief': { icon: '😮‍💨', color: '#10B981' },
            'desire': { icon: '😍', color: '#EC4899' },
            'amusement': { icon: '😄', color: '#F59E0B' },

            // Negative emotions
            'anger': { icon: '😠', color: '#EF4444' },
            'annoyance': { icon: '😒', color: '#F97316' },
            'disappointment': { icon: '😞', color: '#EF4444' },
            'disapproval': { icon: '👎', color: '#DC2626' },
            'disgust': { icon: '🤢', color: '#84CC16' },
            'embarrassment': { icon: '😳', color: '#EC4899' },
            'fear': { icon: '😨', color: '#8B5CF6' },
            'grief': { icon: '😢', color: '#6366F1' },
            'nervousness': { icon: '😰', color: '#F59E0B' },
            'remorse': { icon: '😔', color: '#6B7280' },
            'sadness': { icon: '😭', color: '#3B82F6' },

            // Neutral/Mixed emotions
            'neutral': { icon: '😐', color: '#6B7280' },
            'surprise': { icon: '😲', color: '#F59E0B' },
            'confusion': { icon: '😕', color: '#A855F7' },
            'curiosity': { icon: '🤔', color: '#3B82F6' },
            'realization': { icon: '💡', color: '#FBBF24' }
        };
    }

    /**
     * Extract top 3 emotions from emotion_scores JSON
     */
    getTop3Emotions(emotionScores) {
        if (!emotionScores || typeof emotionScores !== 'object') {
            return [];
        }

        return Object.entries(emotionScores)
            .map(([emotion, score]) => ({
                name: emotion,
                score: Math.round(score * 100) // Convert to percentage
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
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
            flaggedPosts: 0
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

        return this.data.topPosts.map(post => {
            const emotion = post.emotion || post.dominant_emotion || 'neutral';
            const emotionClass = this.getEmotionClass(emotion);

            // Get top 3 emotions from emotion_scores
            const top3Emotions = this.getTop3Emotions(post.emotion_scores);

            // Get dominant emotion metadata
            const dominantMetadata = emotionMetadata[emotion] || { icon: '😐', color: '#6B7280' };

            // Get dominant emotion score from emotion_scores (0-1 range converted to percentage)
            let dominantScore = 0;
            if (post.emotion_scores && typeof post.emotion_scores === 'object') {
                dominantScore = Math.round((post.emotion_scores[emotion] || 0) * 100);
            }

            return `
            <div class="post-card enhanced" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="platform-badge ${(post.platform || 'twitter').toLowerCase()}">
                        ${post.platform || 'Twitter'}
                    </div>
                    <span class="post-date">${this.formatDate(post.created_at_platform || post.created_at)}</span>
                </div>

                <div class="post-content">
                    <p>${this.truncateText(post.content || '', 120)}</p>
                </div>

                <!-- Top 3 Emotions Section -->
                ${top3Emotions.length > 0 ? `
                <div class="post-top-emotions">
                    <div class="top-emotions-label">Top Emotions Detected:</div>
                    ${top3Emotions.map(emo => {
                        const meta = emotionMetadata[emo.name] || { icon: '😐', color: '#6B7280' };
                        return `
                        <div class="emotion-bar-mini">
                            <div class="emotion-bar-header">
                                <span class="emotion-name-mini">
                                    <span class="emotion-icon-mini">${meta.icon}</span>
                                    <span class="emotion-label-mini">${this.capitalizeEmotion(emo.name)}</span>
                                </span>
                                <span class="emotion-percentage-mini">${emo.score}%</span>
                            </div>
                            <div class="emotion-bar-track">
                                <div class="emotion-bar-progress" style="width: ${emo.score}%; background: ${meta.color};"></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : ''}

                <div class="post-stats">
                    <div class="stat-item">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${this.formatNumber(post.likes_count || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🔄</span>
                        <span class="stat-value">${this.formatNumber(post.retweets_count || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">💬</span>
                        <span class="stat-value">${this.formatNumber(post.replies_count || 0)}</span>
                    </div>
                </div>

                <!-- Dominant Emotion at Bottom -->
                <div class="post-dominant-emotion">
                    <span class="dominant-emotion-label">Dominant Emotion:</span>
                    <span class="emotion-badge ${emotionClass}" style="background: ${dominantMetadata.color}20; border-color: ${dominantMetadata.color}; color: ${dominantMetadata.color};">
                        <span class="emotion-icon">${dominantMetadata.icon}</span>
                        <span class="emotion-name">${this.capitalizeEmotion(emotion)}</span>
                        <span class="emotion-score">${dominantScore}%</span>
                    </span>
                </div>
            </div>
            `;
        }).join('');
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
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Add helper method for formatting numbers
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

// Create global instance
window.overviewDashboard = new OverviewDashboard();

export default OverviewDashboard;
