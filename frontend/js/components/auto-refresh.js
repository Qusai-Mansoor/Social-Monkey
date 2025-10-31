/**
 * Auto-Refresh Manager
 * Handles automatic data refresh and real-time updates
 */

class AutoRefreshManager {
    constructor() {
        this.interval = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.timerId = null;
        this.lastRefresh = null;
        this.enabled = false;
        this.callbacks = [];
        this.storageKey = 'auto_refresh_settings';
        this.loadSettings();
    }

    /**
     * Start auto-refresh
     */
    start() {
        if (this.enabled && !this.timerId) {
            console.log('Starting auto-refresh...');
            this.timerId = setInterval(() => {
                this.refresh();
            }, this.interval);
            this.lastRefresh = new Date();
            this.saveSettings();
            this.notifyCallbacks('started');
        }
    }

    /**
     * Stop auto-refresh
     */
    stop() {
        if (this.timerId) {
            console.log('Stopping auto-refresh...');
            clearInterval(this.timerId);
            this.timerId = null;
            this.notifyCallbacks('stopped');
        }
    }

    /**
     * Toggle auto-refresh
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.start();
        } else {
            this.stop();
        }
        this.saveSettings();
        return this.enabled;
    }

    /**
     * Set refresh interval
     */
    setInterval(minutes) {
        const milliseconds = minutes * 60 * 1000;
        if (milliseconds !== this.interval) {
            this.interval = milliseconds;
            this.saveSettings();
            
            // Restart if currently running
            if (this.timerId) {
                this.stop();
                this.start();
            }
            
            this.notifyCallbacks('interval-changed', minutes);
        }
    }

    /**
     * Get interval in minutes
     */
    getInterval() {
        return this.interval / 60000;
    }

    /**
     * Perform refresh
     */
    async refresh() {
        console.log('Auto-refreshing data...');
        this.lastRefresh = new Date();
        this.notifyCallbacks('refreshing');

        try {
            // Clear data loader cache
            if (window.dataLoader) {
                window.dataLoader.clearCache();
            }

            // Notify all callbacks to refresh
            await this.notifyCallbacks('refresh');

            this.notifyCallbacks('refreshed');
            console.log('Auto-refresh complete');
        } catch (error) {
            console.error('Auto-refresh error:', error);
            this.notifyCallbacks('error', error);
        }
    }

    /**
     * Manual refresh
     */
    async manualRefresh() {
        await this.refresh();
        
        // Reset timer if auto-refresh is enabled
        if (this.enabled && this.timerId) {
            this.stop();
            this.start();
        }
    }

    /**
     * Get time until next refresh
     */
    getTimeUntilRefresh() {
        if (!this.enabled || !this.lastRefresh) return null;
        
        const nextRefresh = new Date(this.lastRefresh.getTime() + this.interval);
        const now = new Date();
        const remaining = nextRefresh - now;
        
        if (remaining < 0) return 0;
        return remaining;
    }

    /**
     * Get formatted time until refresh
     */
    getFormattedTimeUntilRefresh() {
        const remaining = this.getTimeUntilRefresh();
        if (remaining === null) return 'Not scheduled';
        if (remaining === 0) return 'Refreshing...';
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Get last refresh time formatted
     */
    getLastRefreshFormatted() {
        if (!this.lastRefresh) return 'Never';
        
        const now = new Date();
        const diff = now - this.lastRefresh;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Register callback
     */
    onRefresh(callback) {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all callbacks
     */
    async notifyCallbacks(event, data) {
        for (const callback of this.callbacks) {
            try {
                await callback(event, data);
            } catch (error) {
                console.error('Refresh callback error:', error);
            }
        }
    }

    /**
     * Check if auto-refresh is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            interval: this.getInterval(),
            lastRefresh: this.lastRefresh,
            lastRefreshFormatted: this.getLastRefreshFormatted(),
            timeUntilRefresh: this.getTimeUntilRefresh(),
            timeUntilRefreshFormatted: this.getFormattedTimeUntilRefresh(),
            isRunning: this.timerId !== null
        };
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                enabled: this.enabled,
                interval: this.interval,
                lastRefresh: this.lastRefresh
            };
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save auto-refresh settings:', error);
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const settings = JSON.parse(saved);
                this.enabled = settings.enabled || false;
                this.interval = settings.interval || (5 * 60 * 1000);
                this.lastRefresh = settings.lastRefresh ? new Date(settings.lastRefresh) : null;
            }
        } catch (error) {
            console.error('Failed to load auto-refresh settings:', error);
        }
    }

    /**
     * Create status indicator HTML
     */
    createStatusIndicator() {
        const status = this.getStatus();
        const indicatorClass = status.enabled ? 'status-active' : 'status-inactive';
        const icon = status.enabled ? '●' : '○';
        
        return `
            <div class="auto-refresh-status ${indicatorClass}">
                <span class="status-icon">${icon}</span>
                <span class="status-text">
                    ${status.enabled ? 
                        `Auto-refresh: ${status.timeUntilRefreshFormatted}` : 
                        'Auto-refresh: Off'
                    }
                </span>
                <span class="last-update">
                    Last updated: ${status.lastRefreshFormatted}
                </span>
            </div>
        `;
    }

    /**
     * Update status indicator in DOM
     */
    updateStatusIndicator() {
        const container = document.getElementById('autoRefreshStatus');
        if (container) {
            container.innerHTML = this.createStatusIndicator();
        }
    }

    /**
     * Start periodic status updates
     */
    startStatusUpdates() {
        // Update every second
        setInterval(() => {
            this.updateStatusIndicator();
        }, 1000);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.callbacks = [];
    }
}

// Create global instance
window.autoRefreshManager = new AutoRefreshManager();

export default AutoRefreshManager;
