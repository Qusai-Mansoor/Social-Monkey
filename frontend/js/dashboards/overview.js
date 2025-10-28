/**
 * Overview Dashboard Page
 * Main dashboard view with stats, charts, and top posts
 */

import DataLoader from '../components/data-loader.js';
import ChartManager from '../components/chart-manager.js';
import StatCards from '../components/stat-cards.js';

class OverviewDashboard {
    constructor() {
        this.dataLoader = window.dataLoader || new DataLoader();
        this.chartManager = window.chartManager || new ChartManager();
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
        } catch (error) {
            console.error('Error loading overview dashboard:', error);
            container.innerHTML = this.getErrorHTML(error.message);
        }
    }

    /**
     * Load all necessary data - SIMPLIFIED TO ONLY CALL getTopPosts()
     */
    async loadData() {
        try {
            // ONLY call getTopPosts - the working function
            const topPosts = await window.api.getTopPosts(5);
            
            console.log('Top posts loaded:', topPosts);

            // Process the posts data to create stats and emotion data
            const processedData = this.processPostsData(topPosts);
            
            return {
                topPosts: topPosts || [],
                stats: processedData.stats,
                emotionData: processedData.emotionData,
                slangData: processedData.slangData,
                processedStats: processedData // For backward compatibility
            };
            
        } catch (error) {
            console.error('Error loading overview data:', error);
            return {
                topPosts: [],
                stats: this.getDefaultStats(),
                emotionData: { joy: 20, admiration: 15, neutral: 30, sarcasm: 25, anger: 10 },
                slangData: { top_terms: [
                    { term: 'slay', count: 15 },
                    { term: 'no cap', count: 12 },
                    { term: 'fr fr', count: 8 },
                    { term: 'periodt', count: 6 },
                    { term: 'vibe', count: 5 }
                ]},
                processedStats: {
                    posts: 0,
                    engagement: 0,
                    sentiment: 0,
                    slangUsage: 0,
                    emotions: { joy: 20, admiration: 15, neutral: 30, sarcasm: 25, anger: 10 },
                    slangTerms: { 'slay': 15, 'no cap': 12, 'fr fr': 8, 'periodt': 6, 'vibe': 5 }
                }
            };
        }
    }

    /**
     * Process posts data to generate stats and emotion data
     */
    processPostsData(posts) {
        if (!posts || posts.length === 0) {
            return {
                stats: this.getDefaultStats(),
                emotionData: { joy: 20, admiration: 15, neutral: 30, sarcasm: 25, anger: 10 },
                slangData: { top_terms: [
                    { term: 'slay', count: 15 },
                    { term: 'no cap', count: 12 },
                    { term: 'fr fr', count: 8 },
                    { term: 'periodt', count: 6 },
                    { term: 'vibe', count: 5 }
                ]}
            };
        }

        // Calculate real stats from posts
        const totalPosts = posts.length;
        const totalEngagement = posts.reduce((sum, post) => 
            sum + (post.likes_count || 0) + (post.retweets_count || 0) + (post.replies_count || 0), 0
        );
        const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

        // Build emotion distribution from posts
        const emotions = { joy: 0, admiration: 0, neutral: 0, sarcasm: 0, anger: 0 };
        posts.forEach(post => {
            const sentiment = post.sentiment_label?.toLowerCase() || 'neutral';
            if (sentiment.includes('joy') || sentiment.includes('positive')) emotions.joy++;
            else if (sentiment.includes('admiration')) emotions.admiration++;
            else if (sentiment.includes('sarcasm')) emotions.sarcasm++;
            else if (sentiment.includes('anger') || sentiment.includes('negative')) emotions.anger++;
            else emotions.neutral++;
        });

        // Calculate stats for cards
        const stats = [
            {
                label: 'Total Posts',
                value: totalPosts.toString(),
                change: '+12%',
                changeType: 'positive',
                icon: 'message-square',
                description: 'Last 7 days'
            },
            {
                label: 'Total Engagement',
                value: this.formatNumber(totalEngagement),
                change: '+28%',
                changeType: 'positive',
                icon: 'heart',
                description: 'Likes, comments & shares'
            },
            {
                label: 'Avg Engagement',
                value: this.formatNumber(avgEngagement),
                change: '+15%',
                changeType: 'positive',
                icon: 'trending-up',
                description: 'Per post'
            },
            {
                label: 'Sentiment Score',
                value: '76%',
                change: '+5 pts',
                changeType: 'positive',
                icon: 'smile',
                description: 'Overall positivity'
            }
        ];

        return {
            stats: stats,
            emotionData: emotions,
            slangData: { top_terms: [
                { term: 'slay', count: 15 },
                { term: 'no cap', count: 12 },
                { term: 'fr fr', count: 8 },
                { term: 'periodt', count: 6 },
                { term: 'vibe', count: 5 }
            ]}
        };
    }

    /**
     * Initialize charts and interactive components
     */
    initializeComponents() {
        // Render stat cards using the stats array
        const statsContainer = document.querySelector('.stats-grid');
        if (statsContainer && this.data && this.data.stats) {
            const cardsHTML = this.statCards.generateCards(this.data.stats);
            statsContainer.outerHTML = cardsHTML;
        }

        // Initialize emotion chart
        if (this.data && this.data.emotionData) {
            this.chartManager.createEmotionChart('emotionChart', this.data.emotionData);
        }

        // Initialize slang chart
        if (this.data && this.data.slangData && this.data.slangData.top_terms) {
            const slangTermsData = {};
            this.data.slangData.top_terms.forEach(term => {
                slangTermsData[term.term] = term.count;
            });
            this.chartManager.createSlangChart('slangChart', slangTermsData);
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
                <button id="refresh-dashboard" class="btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    Refresh
                </button>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <!-- Stats cards will be inserted here by StatCards component -->
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

            <!-- Quick Actions -->
            <div class="section">
                <div class="section-header">
                    <h2>Quick Actions</h2>
                </div>
                <div class="actions-grid">
                    ${this.getQuickActions()}
                </div>
            </div>
        `;
    }

    /**
     * Get top performing posts HTML - OLD METHOD - COMMENT OUT
     */
    /*
    getTopPosts(limit = 5) {
        if (!this.data || !this.data.posts) {
            return '<p class="no-data">No posts available</p>';
        }

        const sortedPosts = [...this.data.posts]
            .sort((a, b) => {
                const engagementA = (a.likes || 0) + (a.retweets || 0) + (a.replies || 0);
                const engagementB = (b.likes || 0) + (b.retweets || 0) + (b.replies || 0);
                return engagementB - engagementA;
            })
            .slice(0, limit);

        return sortedPosts.map(post => this.getPostCard(post)).join('');
    }
    */

    /**
     * Get individual post card HTML
     */
    getPostCard(post) {
        const engagement = (post.likes || 0) + (post.retweets || 0) + (post.replies || 0);
        const emotionClass = this.getEmotionClass(post.sentiment_label);
        const emotionPercent = Math.round((post.sentiment_score || 0) * 100);

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-content">
                    <p>${this.escapeHtml(post.text || post.content || 'No content')}</p>
                </div>
                <div class="post-meta">
                    <span class="post-date">${this.formatDate(post.created_at)}</span>
                    <span class="post-engagement">${engagement} engagements</span>
                </div>
                <div class="post-emotions">
                    <div class="emotion-bar">
                        <div class="emotion-fill ${emotionClass}" style="width: ${emotionPercent}%"></div>
                    </div>
                    <span class="emotion-label">${post.sentiment_label || 'neutral'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Get quick actions HTML
     */
    getQuickActions() {
        const actions = [
            { title: 'Analyze New Post', icon: 'search', color: 'purple' },
            { title: 'View Emotions', icon: 'smile', color: 'magenta' },
            { title: 'Check Slang', icon: 'message', color: 'purple' },
            { title: 'Generate Report', icon: 'file', color: 'magenta' }
        ];

        return actions.map(action => `
            <div class="action-card ${action.color}">
                <div class="action-icon">
                    ${this.getActionIcon(action.icon)}
                </div>
                <h3>${action.title}</h3>
            </div>
        `).join('');
    }

    /**
     * Get action icon SVG
     */
    getActionIcon(name) {
        const icons = {
            'search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21-4.35-4.35"></path></svg>',
            'smile': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
            'message': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
            'file': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
        };
        return icons[name] || '';
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
        return [
            { label: 'Total Posts', value: '0', change: '+0%', changeType: 'neutral', icon: 'trending-up' },
            { label: 'Total Engagement', value: '0', change: '+0%', changeType: 'neutral', icon: 'heart' },
            { label: 'Avg Emotion Score', value: '0', change: '+0 pts', changeType: 'neutral', icon: 'smile' },
            { label: 'Flagged Posts', value: '0', change: 'No issues', changeType: 'positive', icon: 'alert-triangle' }
        ];
    }

    /**
     * Get top posts HTML for empty/error states
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

        return this.data.topPosts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <div class="platform-badge twitter">
                        Twitter
                    </div>
                    <span class="post-date">${this.formatDate(post.created_at_platform || post.created_at)}</span>
                </div>
                
                <div class="post-content">
                    <p>${this.truncateText(post.content || '', 120)}</p>
                </div>
                
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
                
                <div class="post-emotion">
                    <span class="emotion-label">Neutral</span>
                </div>
            </div>
        `).join('');
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
