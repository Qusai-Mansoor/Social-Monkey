/**
 * Filter Manager Component
 * Unified filtering system across all dashboards
 */

class FilterManager {
    constructor() {
        this.filters = this.getDefaultFilters();
        this.presets = this.getPresets();
        this.listeners = [];
        this.storageKey = 'dashboard_filters';
        this.loadFromStorage();
    }

    /**
     * Get default filter values
     */
    getDefaultFilters() {
        return {
            dateRange: {
                type: 'preset', // 'preset' or 'custom'
                preset: 30, // days
                start: null,
                end: null
            },
            platforms: ['all'], // ['all', 'twitter', 'instagram']
            emotions: ['all'], // ['all', 'positive', 'negative', 'neutral', 'excited', 'sad']
            severity: ['all'], // ['all', 'high', 'medium', 'low']
            engagement: {
                min: 0,
                max: null
            },
            sortBy: 'date', // 'date', 'engagement', 'sentiment'
            sortOrder: 'desc' // 'asc', 'desc'
        };
    }

    /**
     * Get filter presets
     */
    getPresets() {
        return {
            'last-7-days': {
                name: 'Last 7 Days',
                description: 'Recent activity',
                filters: {
                    dateRange: { type: 'preset', preset: 7 }
                }
            },
            'last-30-days': {
                name: 'Last 30 Days',
                description: 'Monthly overview',
                filters: {
                    dateRange: { type: 'preset', preset: 30 }
                }
            },
            'last-90-days': {
                name: 'Last 90 Days',
                description: 'Quarterly analysis',
                filters: {
                    dateRange: { type: 'preset', preset: 90 }
                }
            },
            'high-engagement': {
                name: 'High Engagement',
                description: 'Posts with 100+ engagement',
                filters: {
                    engagement: { min: 100, max: null },
                    sortBy: 'engagement',
                    sortOrder: 'desc'
                }
            },
            'negative-only': {
                name: 'Negative Posts',
                description: 'Filter negative sentiment',
                filters: {
                    emotions: ['negative'],
                    sortBy: 'engagement',
                    sortOrder: 'desc'
                }
            },
            'twitter-only': {
                name: 'Twitter Only',
                description: 'Twitter posts',
                filters: {
                    platforms: ['twitter']
                }
            },
            'instagram-only': {
                name: 'Instagram Only',
                description: 'Instagram posts',
                filters: {
                    platforms: ['instagram']
                }
            },
            'critical-triggers': {
                name: 'Critical Triggers',
                description: 'High severity negative posts',
                filters: {
                    emotions: ['negative'],
                    severity: ['high'],
                    dateRange: { type: 'preset', preset: 7 }
                }
            }
        };
    }

    /**
     * Set filter value
     */
    setFilter(key, value) {
        if (key.includes('.')) {
            // Nested property (e.g., 'dateRange.preset')
            const [parent, child] = key.split('.');
            if (!this.filters[parent]) {
                this.filters[parent] = {};
            }
            this.filters[parent][child] = value;
        } else {
            this.filters[key] = value;
        }
        
        this.saveToStorage();
        this.notifyListeners(key, value);
    }

    /**
     * Get filter value
     */
    getFilter(key) {
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            return this.filters[parent]?.[child];
        }
        return this.filters[key];
    }

    /**
     * Get all filters
     */
    getAllFilters() {
        return { ...this.filters };
    }

    /**
     * Apply preset
     */
    applyPreset(presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) {
            console.warn('Preset not found:', presetKey);
            return;
        }

        // Merge preset filters with current filters
        Object.entries(preset.filters).forEach(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) {
                this.filters[key] = { ...this.filters[key], ...value };
            } else {
                this.filters[key] = value;
            }
        });

        this.saveToStorage();
        this.notifyListeners('preset', presetKey);
    }

    /**
     * Reset filters to default
     */
    reset() {
        this.filters = this.getDefaultFilters();
        this.saveToStorage();
        this.notifyListeners('reset', null);
    }

    /**
     * Add change listener
     */
    onChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners(key, value) {
        this.listeners.forEach(callback => {
            try {
                callback(key, value, this.filters);
            } catch (error) {
                console.error('Filter listener error:', error);
            }
        });
    }

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.filters));
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    }

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.filters = { ...this.getDefaultFilters(), ...parsed };
            }
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
    }

    /**
     * Filter posts based on current filters
     */
    filterPosts(posts) {
        return posts.filter(post => {
            // Date range filter
            if (!this.matchesDateRange(post)) return false;

            // Platform filter
            if (!this.matchesPlatform(post)) return false;

            // Emotion filter
            if (!this.matchesEmotion(post)) return false;

            // Severity filter
            if (!this.matchesSeverity(post)) return false;

            // Engagement filter
            if (!this.matchesEngagement(post)) return false;

            return true;
        });
    }

    /**
     * Check if post matches date range
     */
    matchesDateRange(post) {
        const postDate = new Date(post.created_at);
        const now = new Date();

        if (this.filters.dateRange.type === 'preset') {
            const days = this.filters.dateRange.preset;
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            return postDate >= cutoff;
        } else if (this.filters.dateRange.type === 'custom') {
            const start = this.filters.dateRange.start ? new Date(this.filters.dateRange.start) : null;
            const end = this.filters.dateRange.end ? new Date(this.filters.dateRange.end) : null;
            
            if (start && postDate < start) return false;
            if (end && postDate > end) return false;
            return true;
        }

        return true;
    }

    /**
     * Check if post matches platform filter
     */
    matchesPlatform(post) {
        const platforms = this.filters.platforms;
        if (platforms.includes('all')) return true;
        
        const postPlatform = (post.platform || '').toLowerCase();
        return platforms.some(p => p.toLowerCase() === postPlatform);
    }

    /**
     * Check if post matches emotion filter
     */
    matchesEmotion(post) {
        const emotions = this.filters.emotions;
        if (emotions.includes('all')) return true;
        
        const postEmotion = (post.emotion || post.sentiment || '').toLowerCase();
        return emotions.some(e => e.toLowerCase() === postEmotion);
    }

    /**
     * Check if post matches severity filter
     */
    matchesSeverity(post) {
        const severities = this.filters.severity;
        if (severities.includes('all')) return true;
        
        // Calculate severity based on engagement
        const engagement = post.engagement || 0;
        let postSeverity = 'low';
        if (engagement > 100) postSeverity = 'high';
        else if (engagement > 50) postSeverity = 'medium';
        
        return severities.includes(postSeverity);
    }

    /**
     * Check if post matches engagement filter
     */
    matchesEngagement(post) {
        const engagement = post.engagement || 0;
        const min = this.filters.engagement.min;
        const max = this.filters.engagement.max;

        if (min && engagement < min) return false;
        if (max && engagement > max) return false;

        return true;
    }

    /**
     * Sort posts based on current sort settings
     */
    sortPosts(posts) {
        const sortBy = this.filters.sortBy;
        const order = this.filters.sortOrder;
        const multiplier = order === 'desc' ? -1 : 1;

        return [...posts].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'date':
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                    break;
                case 'engagement':
                    aVal = a.engagement || 0;
                    bVal = b.engagement || 0;
                    break;
                case 'sentiment':
                    aVal = a.sentiment_score || 0;
                    bVal = b.sentiment_score || 0;
                    break;
                default:
                    return 0;
            }

            return (aVal - bVal) * multiplier;
        });
    }

    /**
     * Apply all filters and sorting
     */
    applyAll(posts) {
        const filtered = this.filterPosts(posts);
        return this.sortPosts(filtered);
    }

    /**
     * Get filter summary for display
     */
    getSummary() {
        const summary = [];

        // Date range
        if (this.filters.dateRange.type === 'preset') {
            summary.push(`Last ${this.filters.dateRange.preset} days`);
        } else if (this.filters.dateRange.type === 'custom') {
            const start = this.filters.dateRange.start ? new Date(this.filters.dateRange.start).toLocaleDateString() : 'start';
            const end = this.filters.dateRange.end ? new Date(this.filters.dateRange.end).toLocaleDateString() : 'end';
            summary.push(`${start} to ${end}`);
        }

        // Platforms
        if (!this.filters.platforms.includes('all')) {
            summary.push(`${this.filters.platforms.join(', ')}`);
        }

        // Emotions
        if (!this.filters.emotions.includes('all')) {
            summary.push(`${this.filters.emotions.join(', ')} sentiment`);
        }

        // Severity
        if (!this.filters.severity.includes('all')) {
            summary.push(`${this.filters.severity.join(', ')} severity`);
        }

        // Engagement
        if (this.filters.engagement.min > 0 || this.filters.engagement.max) {
            const min = this.filters.engagement.min;
            const max = this.filters.engagement.max || '∞';
            summary.push(`${min}-${max} engagement`);
        }

        return summary.length > 0 ? summary.join(' • ') : 'All posts';
    }

    /**
     * Export current filters
     */
    exportFilters() {
        return JSON.stringify(this.filters, null, 2);
    }

    /**
     * Import filters
     */
    importFilters(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.filters = { ...this.getDefaultFilters(), ...imported };
            this.saveToStorage();
            this.notifyListeners('import', null);
            return true;
        } catch (error) {
            console.error('Failed to import filters:', error);
            return false;
        }
    }
}

// Create global instance
window.filterManager = new FilterManager();

export default FilterManager;
