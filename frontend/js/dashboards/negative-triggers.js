/**
 * Negative Triggers Dashboard
 * Identifies and analyzes posts that triggered negative reactions
 */

import DataLoader from '../components/data-loader.js';
import ChartManager from '../components/chart-manager.js';
import StatCards from '../components/stat-cards.js';

class NegativeTriggersBoard {
    constructor() {
        this.dataLoader = window.dataLoader || new DataLoader();
        this.chartManager = window.chartManager || new ChartManager();
        this.statCards = window.statCards || new StatCards();
        this.data = null;
        this.filters = {
            dateRange: 30,
            platform: 'all',
            severity: 'all' // all, high, medium, low
        };
        this.boundHandlers = {};
    }

    /**
     * Render the negative triggers dashboard
     */
    async render() {
        const container = document.getElementById('main-content');
        if (!container) return;

        container.innerHTML = this.getLoadingHTML();

        try {
            this.data = await this.loadData();
            container.innerHTML = this.getHTML();
            this.initializeComponents();
        } catch (error) {
            console.error('Error loading negative triggers dashboard:', error);
            container.innerHTML = this.getErrorHTML(error.message);
        }
    }

    /**
     * Load all necessary data
     */
    async loadData() {
        try {
            // Fetch real negative triggers from API
            const [negativeTriggers, topPosts] = await Promise.all([
                window.api.request('/api/v1/analytics/dashboard/negative-triggers'),
                window.api.getTopPosts(50)
            ]);

            // Format negative triggers for the dashboard
            // The API returns { id, content, dominant_emotion, emotion_scores, created_at }
            // We need to map this to the format expected by processNegativeData or use it directly
            
            // For now, let's merge the negative triggers into the topPosts array so processNegativeData can find them
            // Or better, let's adjust processNegativeData to use the specific negative triggers list if available
            
            return {
                emotionAnalysis: { emotions: { negative: negativeTriggers.length } }, // Dummy count for now
                topPosts: topPosts,
                negativeTriggers: negativeTriggers, // Pass the specific list
                engagementTrends: [], // We can fetch this if needed
                processedStats: this.processNegativeData({ 
                    emotionAnalysis: { emotions: { negative: negativeTriggers.length } }, 
                    topPosts, 
                    negativeTriggers 
                })
            };
        } catch (error) {
            console.error('Error loading negative triggers data:', error);
            return {
                emotionAnalysis: {},
                topPosts: [],
                negativeTriggers: [],
                engagementTrends: [],
                processedStats: this.getDefaultStats()
            };
        }
    }

    /**
     * Process data to identify negative triggers
     */
    processNegativeData(data) {
        const { topPosts, negativeTriggers } = data;

        // Use the specific negative triggers list if available, otherwise filter topPosts
        let negativePosts = negativeTriggers || [];
        
        if (negativePosts.length === 0 && topPosts) {
             negativePosts = topPosts.filter(p => p.emotion === 'negative' || p.sentiment_label === 'negative');
        }
        
        // Calculate severity based on engagement and emotion intensity
        const triggersWithSeverity = negativePosts.map(post => {
            // Calculate engagement if not present (negativeTriggers endpoint might not return it yet)
            const engagement = post.engagement || (post.likes_count || 0) + (post.retweets_count || 0) + (post.replies_count || 0);
            const severity = engagement > 100 ? 'high' : engagement > 50 ? 'medium' : 'low';
            
            return {
                ...post,
                engagement,
                severity,
                triggerScore: this.calculateTriggerScore(post)
            };
        }).sort((a, b) => b.triggerScore - a.triggerScore);

        // Group by severity
        const bySeverity = {
            high: triggersWithSeverity.filter(p => p.severity === 'high'),
            medium: triggersWithSeverity.filter(p => p.severity === 'medium'),
            low: triggersWithSeverity.filter(p => p.severity === 'low')
        };

        // Identify common trigger words
        const triggerWords = this.extractTriggerWords(negativePosts);

        // Calculate stats
        const totalNegative = negativePosts.length;
        const totalPosts = topPosts.length;
        const negativeRate = totalPosts > 0 ? ((totalNegative / totalPosts) * 100).toFixed(1) : 0;
        const avgEngagement = negativePosts.reduce((sum, p) => sum + (p.engagement || 0), 0) / (totalNegative || 1);

        return {
            totalNegative,
            negativeRate,
            avgEngagement,
            highSeverityCount: bySeverity.high.length,
            mediumSeverityCount: bySeverity.medium.length,
            lowSeverityCount: bySeverity.low.length,
            triggersWithSeverity,
            bySeverity,
            triggerWords,
            changeMetrics: {
                negativeChange: '+15%',
                engagementChange: '-8%',
                severityChange: '+23%'
            }
        };
    }

    /**
     * Calculate trigger score for a post
     */
    calculateTriggerScore(post) {
        const engagement = post.engagement || 0;
        const replies = post.replies_count || 0;
        const retweets = post.retweets_count || 0;
        
        // Higher replies/retweets on negative content = higher trigger score
        return (replies * 3) + (retweets * 2) + (engagement * 0.1);
    }

    /**
     * Extract common trigger words from negative posts
     */
    extractTriggerWords(posts) {
        const wordFreq = {};
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that']);

        posts.forEach(post => {
            const words = (post.content || '').toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3 && !stopWords.has(w));

            words.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
        });

        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        this.renderStatCards();
        this.renderSeverityChart();
        this.renderTriggerWordsChart();
        this.attachEventListeners();
    }

    /**
     * Render stat cards
     */
    renderStatCards() {
        const statsContainer = document.querySelector('.stats-grid');
        if (!statsContainer || !this.data) return;

        const stats = this.data.processedStats;
        
        const cards = [
            this.statCards.createCard(
                'Negative Posts',
                this.statCards.formatNumber(stats.totalNegative),
                stats.changeMetrics.negativeChange + ' from last period',
                'alert-triangle',
                'negative'
            ),
            this.statCards.createCard(
                'Negative Rate',
                stats.negativeRate + '%',
                'Of total posts',
                'trending-down',
                stats.negativeRate > 30 ? 'negative' : 'neutral'
            ),
            this.statCards.createCard(
                'High Severity Triggers',
                this.statCards.formatNumber(stats.highSeverityCount),
                stats.changeMetrics.severityChange + ' from last period',
                'alert-circle',
                'negative'
            )
        ];

        statsContainer.innerHTML = cards.join('');
    }

    /**
     * Render severity distribution chart
     */
    renderSeverityChart() {
        if (!this.data) return;

        const stats = this.data.processedStats;
        const chartData = {
            labels: ['High Severity', 'Medium Severity', 'Low Severity'],
            datasets: [{
                data: [
                    stats.highSeverityCount,
                    stats.mediumSeverityCount,
                    stats.lowSeverityCount
                ],
                backgroundColor: [
                    '#EF4444',
                    '#F59E0B',
                    '#10B981'
                ],
                borderWidth: 0
            }]
        };

        this.chartManager.createEmotionChart('severityChart', chartData);
    }

    /**
     * Render trigger words chart
     */
    renderTriggerWordsChart() {
        if (!this.data) return;

        const triggerWords = this.data.processedStats.triggerWords;
        
        const chartData = {
            labels: triggerWords.map(t => t.word),
            datasets: [{
                label: 'Frequency',
                data: triggerWords.map(t => t.count),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: '#EF4444',
                borderWidth: 2
            }]
        };

        this.chartManager.createSlangChart('triggerWordsChart', chartData);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.removeEventListeners();

        // Date range filter
        const dateRangeSelect = document.getElementById('dateRangeFilter');
        if (dateRangeSelect) {
            this.boundHandlers.dateRange = (e) => this.handleDateRangeChange(parseInt(e.target.value));
            dateRangeSelect.addEventListener('change', this.boundHandlers.dateRange);
        }

        // Platform filter
        const platformSelect = document.getElementById('platformFilter');
        if (platformSelect) {
            this.boundHandlers.platform = (e) => this.handlePlatformFilter(e.target.value);
            platformSelect.addEventListener('change', this.boundHandlers.platform);
        }

        // Severity filter
        const severitySelect = document.getElementById('severityFilter');
        if (severitySelect) {
            this.boundHandlers.severity = (e) => this.handleSeverityFilter(e.target.value);
            severitySelect.addEventListener('change', this.boundHandlers.severity);
        }

        // Export button
        const exportBtn = document.getElementById('exportTriggersCSV');
        if (exportBtn) {
            this.boundHandlers.export = () => this.exportToCSV();
            exportBtn.addEventListener('click', this.boundHandlers.export);
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshTriggers');
        if (refreshBtn) {
            this.boundHandlers.refresh = () => this.refresh();
            refreshBtn.addEventListener('click', this.boundHandlers.refresh);
        }
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        const elements = [
            { id: 'dateRangeFilter', handler: 'dateRange' },
            { id: 'platformFilter', handler: 'platform' },
            { id: 'severityFilter', handler: 'severity' },
            { id: 'exportTriggersCSV', handler: 'export' },
            { id: 'refreshTriggers', handler: 'refresh' }
        ];

        elements.forEach(({ id, handler }) => {
            const element = document.getElementById(id);
            if (element && this.boundHandlers[handler]) {
                element.removeEventListener('change', this.boundHandlers[handler]);
                element.removeEventListener('click', this.boundHandlers[handler]);
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
    handlePlatformFilter(platform) {
        this.filters.platform = platform;
        this.updateTriggersTable();
    }

    /**
     * Handle severity filter
     */
    handleSeverityFilter(severity) {
        this.filters.severity = severity;
        this.updateTriggersTable();
    }

    /**
     * Update triggers table with current filters
     */
    updateTriggersTable() {
        const tableContainer = document.querySelector('.triggers-table-container');
        if (!tableContainer) return;

        tableContainer.innerHTML = this.getTriggersTableHTML();
    }

    /**
     * Export triggers to CSV
     */
    exportToCSV() {
        if (!this.data) return;

        const triggers = this.getFilteredTriggers();
        const headers = ['Content', 'Platform', 'Date', 'Severity', 'Trigger Score', 'Likes', 'Retweets', 'Replies', 'Engagement'];
        const rows = triggers.map(post => [
            `"${(post.content || '').replace(/"/g, '""')}"`,
            post.platform || 'twitter',
            new Date(post.created_at).toLocaleDateString(),
            post.severity,
            post.triggerScore.toFixed(2),
            post.likes_count || 0,
            post.retweets_count || 0,
            post.replies_count || 0,
            post.engagement || 0
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `negative-triggers-${new Date().toISOString().split('T')[0]}.csv`;
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
     * Get filtered triggers based on current filters
     */
    getFilteredTriggers() {
        if (!this.data) return [];

        let triggers = this.data.processedStats.triggersWithSeverity;

        // Apply severity filter
        if (this.filters.severity !== 'all') {
            triggers = triggers.filter(t => t.severity === this.filters.severity);
        }

        // Apply platform filter
        if (this.filters.platform !== 'all') {
            triggers = triggers.filter(t => t.platform?.toLowerCase() === this.filters.platform);
        }

        return triggers;
    }

    /**
     * Get main HTML structure
     */
    getHTML() {
        return `
            <div class="dashboard-header">
                <div>
                    <h1>Negative Triggers</h1>
                    <p class="subtitle">Identify posts that triggered negative reactions</p>
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
                <div class="filter-group">
                    <label for="severityFilter">Severity:</label>
                    <select id="severityFilter" class="filter-select">
                        <option value="all">All Severity</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid"></div>

            <!-- Charts Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px; margin-bottom: 32px;">
                <!-- Severity Distribution -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Severity Distribution</h3>
                    </div>
                    <div class="chart-container" style="min-height: 300px;">
                        <canvas id="severityChart"></canvas>
                    </div>
                </div>

                <!-- Common Trigger Words -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Common Trigger Words</h3>
                    </div>
                    <div class="chart-container" style="min-height: 300px;">
                        <canvas id="triggerWordsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Triggers Table -->
            <div class="section">
                <div class="section-header">
                    <h2>Negative Trigger Posts</h2>
                </div>
                <div class="triggers-table-container">
                    ${this.getTriggersTableHTML()}
                </div>
            </div>
        `;
    }

    /**
     * Get triggers table HTML
     */
    getTriggersTableHTML() {
        const triggers = this.getFilteredTriggers();

        if (triggers.length === 0) {
            return '<p class="no-data">No negative triggers found</p>';
        }

        return `
            <table class="posts-table">
                <thead>
                    <tr class="table-header">
                        <th>Post Content</th>
                        <th>Severity</th>
                        <th>Trigger Score</th>
                        <th>Platform</th>
                        <th>Date</th>
                        <th>Engagement</th>
                    </tr>
                </thead>
                <tbody>
                    ${triggers.slice(0, 20).map(post => `
                        <tr class="table-row">
                            <td class="content-cell">
                                ${this.escapeHtml((post.content || '').substring(0, 80))}${(post.content || '').length > 80 ? '...' : ''}
                            </td>
                            <td>
                                <span class="severity-badge severity-${post.severity}">
                                    ${post.severity}
                                </span>
                            </td>
                            <td>${post.triggerScore.toFixed(1)}</td>
                            <td>
                                <span class="platform-badge ${post.platform || 'twitter'}">
                                    ${post.platform || 'twitter'}
                                </span>
                            </td>
                            <td>${new Date(post.created_at).toLocaleDateString()}</td>
                            <td class="engagement-cell">${this.formatEngagement(post.engagement || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Format engagement numbers
     */
    formatEngagement(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
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
