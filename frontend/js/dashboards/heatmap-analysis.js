/**
 * Heatmap Analysis Dashboard
 * Visual analysis of posting patterns and engagement by time/day
 */

import DataLoader from '../components/data-loader.js';
import ChartManager from '../components/chart-manager.js';
import StatCards from '../components/stat-cards.js';

class HeatmapAnalysis {
    constructor() {
        this.dataLoader = window.dataLoader || new DataLoader();
        this.chartManager = window.chartManager || new ChartManager();
        this.statCards = window.statCards || new StatCards();
        this.data = null;
        this.filters = {
            dateRange: 30,
            platform: 'all',
            metric: 'engagement' // engagement, posts, reach
        };
        this.boundHandlers = {};
    }

    /**
     * Render the heatmap dashboard
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
            console.error('Error loading heatmap dashboard:', error);
            container.innerHTML = this.getErrorHTML(error.message);
        }
    }

    /**
     * Load all necessary data
     */
    async loadData() {
        const [posts, engagementTrends] = await Promise.all([
            this.dataLoader.loadPosts(),
            window.api.getEngagementTrends(this.filters.dateRange)
        ]);

        return {
            posts,
            engagementTrends,
            processedStats: this.processHeatmapData(posts)
        };
    }

    /**
     * Process data for heatmap visualization
     */
    processHeatmapData(posts) {
        // Initialize heatmap data structure
        const heatmapData = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Initialize all slots to 0
        days.forEach(day => {
            heatmapData[day] = {};
            hours.forEach(hour => {
                heatmapData[day][hour] = { posts: 0, engagement: 0, reach: 0 };
            });
        });

        // Populate heatmap with actual data
        posts.forEach(post => {
            const date = new Date(post.created_at);
            const day = days[date.getDay()];
            const hour = date.getHours();

            if (heatmapData[day] && heatmapData[day][hour]) {
                heatmapData[day][hour].posts += 1;
                heatmapData[day][hour].engagement += (post.engagement || 0);
                heatmapData[day][hour].reach += (post.likes_count || 0) + (post.retweets_count || 0);
            }
        });

        // Find peak times
        const peakTimes = this.findPeakTimes(heatmapData);

        // Calculate hourly distribution
        const hourlyDistribution = this.calculateHourlyDistribution(heatmapData);

        // Calculate daily distribution
        const dailyDistribution = this.calculateDailyDistribution(heatmapData);

        return {
            heatmapData,
            peakTimes,
            hourlyDistribution,
            dailyDistribution,
            totalPosts: posts.length,
            avgPostsPerDay: (posts.length / 30).toFixed(1),
            bestPostingTime: peakTimes.engagement.time
        };
    }

    /**
     * Find peak times for different metrics
     */
    findPeakTimes(heatmapData) {
        let maxEngagement = { value: 0, day: '', hour: 0, time: '' };
        let maxPosts = { value: 0, day: '', hour: 0, time: '' };

        Object.entries(heatmapData).forEach(([day, hours]) => {
            Object.entries(hours).forEach(([hour, metrics]) => {
                if (metrics.engagement > maxEngagement.value) {
                    maxEngagement = {
                        value: metrics.engagement,
                        day,
                        hour: parseInt(hour),
                        time: `${day} at ${this.formatHour(parseInt(hour))}`
                    };
                }
                if (metrics.posts > maxPosts.value) {
                    maxPosts = {
                        value: metrics.posts,
                        day,
                        hour: parseInt(hour),
                        time: `${day} at ${this.formatHour(parseInt(hour))}`
                    };
                }
            });
        });

        return { engagement: maxEngagement, posts: maxPosts };
    }

    /**
     * Calculate hourly distribution
     */
    calculateHourlyDistribution(heatmapData) {
        const hourlyTotals = Array(24).fill(0).map(() => ({ posts: 0, engagement: 0 }));

        Object.values(heatmapData).forEach(day => {
            Object.entries(day).forEach(([hour, metrics]) => {
                hourlyTotals[hour].posts += metrics.posts;
                hourlyTotals[hour].engagement += metrics.engagement;
            });
        });

        return hourlyTotals;
    }

    /**
     * Calculate daily distribution
     */
    calculateDailyDistribution(heatmapData) {
        const dailyTotals = {};

        Object.entries(heatmapData).forEach(([day, hours]) => {
            dailyTotals[day] = { posts: 0, engagement: 0 };
            Object.values(hours).forEach(metrics => {
                dailyTotals[day].posts += metrics.posts;
                dailyTotals[day].engagement += metrics.engagement;
            });
        });

        return dailyTotals;
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        this.renderStatCards();
        this.renderHeatmap();
        this.renderHourlyChart();
        this.renderDailyChart();
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
                'Total Posts',
                this.statCards.formatNumber(stats.totalPosts),
                `${stats.avgPostsPerDay} per day`,
                'message-circle',
                'neutral'
            ),
            this.statCards.createCard(
                'Best Posting Time',
                stats.bestPostingTime.split(' at ')[1] || 'N/A',
                stats.bestPostingTime.split(' at ')[0] || '',
                'clock',
                'positive'
            ),
            this.statCards.createCard(
                'Peak Engagement',
                this.statCards.formatNumber(stats.peakTimes.engagement.value),
                stats.peakTimes.engagement.time,
                'trending-up',
                'positive'
            )
        ];

        statsContainer.innerHTML = cards.join('');
    }

    /**
     * Render heatmap visualization
     */
    renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        if (!container || !this.data) return;

        const stats = this.data.processedStats;
        const metric = this.filters.metric;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Find max value for normalization
        let maxValue = 0;
        Object.values(stats.heatmapData).forEach(day => {
            Object.values(day).forEach(hour => {
                if (hour[metric] > maxValue) maxValue = hour[metric];
            });
        });

        // Generate heatmap HTML
        container.innerHTML = `
            <div class="heatmap-grid">
                <div class="heatmap-labels-y">
                    ${days.map(day => `<div class="heatmap-label">${day.substring(0, 3)}</div>`).join('')}
                </div>
                <div class="heatmap-content">
                    <div class="heatmap-labels-x">
                        ${hours.filter(h => h % 3 === 0).map(h => 
                            `<div class="heatmap-label-x" style="grid-column: ${h + 1}">${this.formatHour(h)}</div>`
                        ).join('')}
                    </div>
                    <div class="heatmap-cells">
                        ${days.map(day => {
                            return hours.map(hour => {
                                const value = stats.heatmapData[day]?.[hour]?.[metric] || 0;
                                const intensity = maxValue > 0 ? (value / maxValue) : 0;
                                const color = this.getHeatmapColor(intensity);
                                
                                return `
                                    <div class="heatmap-cell" 
                                         style="background-color: ${color}"
                                         data-day="${day}"
                                         data-hour="${hour}"
                                         data-value="${value}"
                                         title="${day} ${this.formatHour(hour)}: ${value}">
                                    </div>
                                `;
                            }).join('');
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="heatmap-legend">
                <span class="heatmap-legend-label">Less</span>
                <div class="heatmap-legend-gradient"></div>
                <span class="heatmap-legend-label">More</span>
            </div>
        `;
    }

    /**
     * Get color for heatmap cell based on intensity
     */
    getHeatmapColor(intensity) {
        if (intensity === 0) return 'rgba(124, 58, 237, 0.05)';
        if (intensity < 0.2) return 'rgba(124, 58, 237, 0.2)';
        if (intensity < 0.4) return 'rgba(124, 58, 237, 0.4)';
        if (intensity < 0.6) return 'rgba(124, 58, 237, 0.6)';
        if (intensity < 0.8) return 'rgba(124, 58, 237, 0.8)';
        return 'rgba(124, 58, 237, 1)';
    }

    /**
     * Render hourly distribution chart
     */
    renderHourlyChart() {
        if (!this.data) return;

        const hourly = this.data.processedStats.hourlyDistribution;
        const metric = this.filters.metric;

        const chartData = {
            labels: Array.from({ length: 24 }, (_, i) => this.formatHour(i)),
            datasets: [{
                label: metric.charAt(0).toUpperCase() + metric.slice(1),
                data: hourly.map(h => h[metric === 'engagement' ? 'engagement' : 'posts']),
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                borderColor: '#7C3AED',
                borderWidth: 2,
                tension: 0.4
            }]
        };

        this.chartManager.createTrendChart('hourlyChart', chartData);
    }

    /**
     * Render daily distribution chart
     */
    renderDailyChart() {
        if (!this.data) return;

        const daily = this.data.processedStats.dailyDistribution;
        const metric = this.filters.metric;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const chartData = {
            labels: days.map(d => d.substring(0, 3)),
            datasets: [{
                label: metric.charAt(0).toUpperCase() + metric.slice(1),
                data: days.map(day => daily[day]?.[metric === 'engagement' ? 'engagement' : 'posts'] || 0),
                backgroundColor: [
                    'rgba(124, 58, 237, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(167, 139, 250, 0.8)',
                    'rgba(196, 181, 253, 0.8)',
                    'rgba(167, 139, 250, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(124, 58, 237, 0.8)'
                ],
                borderWidth: 0
            }]
        };

        this.chartManager.createSlangChart('dailyChart', chartData);
    }

    /**
     * Format hour for display
     */
    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}${period}`;
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

        // Metric filter
        const metricSelect = document.getElementById('metricFilter');
        if (metricSelect) {
            this.boundHandlers.metric = (e) => this.handleMetricChange(e.target.value);
            metricSelect.addEventListener('change', this.boundHandlers.metric);
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshHeatmap');
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
            { id: 'metricFilter', handler: 'metric' },
            { id: 'refreshHeatmap', handler: 'refresh' }
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
     * Handle metric change
     */
    async handleMetricChange(metric) {
        this.filters.metric = metric;
        this.renderHeatmap();
        this.renderHourlyChart();
        this.renderDailyChart();
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
                    <h1>Heatmap Analysis</h1>
                    <p class="subtitle">Visualize posting patterns and engagement by time and day</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="refreshHeatmap" class="btn-primary">
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
                    <label for="metricFilter">Metric:</label>
                    <select id="metricFilter" class="filter-select">
                        <option value="engagement">Engagement</option>
                        <option value="posts">Post Count</option>
                        <option value="reach">Reach</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid"></div>

            <!-- Heatmap -->
            <div class="chart-card" style="margin-bottom: 32px;">
                <div class="chart-header">
                    <h3>Activity Heatmap</h3>
                    <span class="chart-period">By day and hour</span>
                </div>
                <div id="heatmapContainer" style="padding: 24px;"></div>
            </div>

            <!-- Distribution Charts -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px;">
                <!-- Hourly Distribution -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Hourly Distribution</h3>
                    </div>
                    <div class="chart-container" style="min-height: 300px;">
                        <canvas id="hourlyChart"></canvas>
                    </div>
                </div>

                <!-- Daily Distribution -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Daily Distribution</h3>
                    </div>
                    <div class="chart-container" style="min-height: 300px;">
                        <canvas id="dailyChart"></canvas>
                    </div>
                </div>
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
                <p>Loading heatmap analysis...</p>
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
window.heatmapAnalysis = new HeatmapAnalysis();

export default HeatmapAnalysis;
