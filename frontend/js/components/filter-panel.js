/**
 * Advanced Filter Panel Component
 * UI for the unified filtering system
 */

class FilterPanel {
    constructor(filterManager) {
        this.filterManager = filterManager || window.filterManager;
        this.isOpen = false;
        this.boundHandlers = {};
    }

    /**
     * Render filter panel
     */
    render(containerId = 'filterPanel') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Filter panel container not found:', containerId);
            return;
        }

        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.updatePreview();
    }

    /**
     * Get filter panel HTML
     */
    getHTML() {
        const filters = this.filterManager.getAllFilters();
        const presets = this.filterManager.presets;

        return `
            <div class="filter-panel ${this.isOpen ? 'open' : ''}">
                <div class="filter-panel-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>
                        <h3>Advanced Filters</h3>
                    </div>
                    <button id="closeFilterPanel" class="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="filter-panel-body">
                    <!-- Presets -->
                    <div class="filter-section">
                        <label class="filter-label">Quick Presets</label>
                        <div class="filter-presets">
                            ${Object.entries(presets).map(([key, preset]) => `
                                <button class="preset-btn" data-preset="${key}">
                                    <span class="preset-name">${preset.name}</span>
                                    <span class="preset-desc">${preset.description}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Date Range -->
                    <div class="filter-section">
                        <label class="filter-label">Date Range</label>
                        <div class="filter-tabs">
                            <button class="filter-tab ${filters.dateRange.type === 'preset' ? 'active' : ''}" data-tab="preset">
                                Preset
                            </button>
                            <button class="filter-tab ${filters.dateRange.type === 'custom' ? 'active' : ''}" data-tab="custom">
                                Custom
                            </button>
                        </div>
                        
                        <div id="presetDateRange" class="filter-content ${filters.dateRange.type === 'preset' ? 'active' : ''}">
                            <select id="dateRangePreset" class="filter-select">
                                <option value="7" ${filters.dateRange.preset === 7 ? 'selected' : ''}>Last 7 days</option>
                                <option value="30" ${filters.dateRange.preset === 30 ? 'selected' : ''}>Last 30 days</option>
                                <option value="60" ${filters.dateRange.preset === 60 ? 'selected' : ''}>Last 60 days</option>
                                <option value="90" ${filters.dateRange.preset === 90 ? 'selected' : ''}>Last 90 days</option>
                                <option value="180" ${filters.dateRange.preset === 180 ? 'selected' : ''}>Last 6 months</option>
                                <option value="365" ${filters.dateRange.preset === 365 ? 'selected' : ''}>Last year</option>
                            </select>
                        </div>
                        
                        <div id="customDateRange" class="filter-content ${filters.dateRange.type === 'custom' ? 'active' : ''}">
                            <div class="date-inputs">
                                <div class="date-input-group">
                                    <label>Start Date</label>
                                    <input type="date" id="startDate" class="filter-input" value="${filters.dateRange.start || ''}">
                                </div>
                                <div class="date-input-group">
                                    <label>End Date</label>
                                    <input type="date" id="endDate" class="filter-input" value="${filters.dateRange.end || ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Platforms -->
                    <div class="filter-section">
                        <label class="filter-label">Platforms</label>
                        <div class="filter-checkboxes">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="all" ${filters.platforms.includes('all') ? 'checked' : ''}>
                                <span>All Platforms</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="twitter" ${filters.platforms.includes('twitter') ? 'checked' : ''}>
                                <span>Twitter</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="instagram" ${filters.platforms.includes('instagram') ? 'checked' : ''}>
                                <span>Instagram</span>
                            </label>
                        </div>
                    </div>

                    <!-- Emotions/Sentiment -->
                    <div class="filter-section">
                        <label class="filter-label">Sentiment</label>
                        <div class="filter-checkboxes">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="all" ${filters.emotions.includes('all') ? 'checked' : ''}>
                                <span>All Sentiments</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="positive" ${filters.emotions.includes('positive') ? 'checked' : ''}>
                                <span>Positive</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="negative" ${filters.emotions.includes('negative') ? 'checked' : ''}>
                                <span>Negative</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="neutral" ${filters.emotions.includes('neutral') ? 'checked' : ''}>
                                <span>Neutral</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="excited" ${filters.emotions.includes('excited') ? 'checked' : ''}>
                                <span>Excited</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="sad" ${filters.emotions.includes('sad') ? 'checked' : ''}>
                                <span>Sad</span>
                            </label>
                        </div>
                    </div>

                    <!-- Severity -->
                    <div class="filter-section">
                        <label class="filter-label">Severity Level</label>
                        <div class="filter-checkboxes">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="all" ${filters.severity.includes('all') ? 'checked' : ''}>
                                <span>All Levels</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="high" ${filters.severity.includes('high') ? 'checked' : ''}>
                                <span>High (100+ engagement)</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="medium" ${filters.severity.includes('medium') ? 'checked' : ''}>
                                <span>Medium (50-100 engagement)</span>
                            </label>
                            <label class="filter-checkbox">
                                <input type="checkbox" value="low" ${filters.severity.includes('low') ? 'checked' : ''}>
                                <span>Low (&lt;50 engagement)</span>
                            </label>
                        </div>
                    </div>

                    <!-- Engagement Range -->
                    <div class="filter-section">
                        <label class="filter-label">Engagement Range</label>
                        <div class="range-inputs">
                            <div class="range-input-group">
                                <label>Min</label>
                                <input type="number" id="engagementMin" class="filter-input" 
                                       value="${filters.engagement.min}" min="0" placeholder="0">
                            </div>
                            <div class="range-input-group">
                                <label>Max</label>
                                <input type="number" id="engagementMax" class="filter-input" 
                                       value="${filters.engagement.max || ''}" min="0" placeholder="Unlimited">
                            </div>
                        </div>
                    </div>

                    <!-- Sort Options -->
                    <div class="filter-section">
                        <label class="filter-label">Sort By</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <select id="sortBy" class="filter-select">
                                <option value="date" ${filters.sortBy === 'date' ? 'selected' : ''}>Date</option>
                                <option value="engagement" ${filters.sortBy === 'engagement' ? 'selected' : ''}>Engagement</option>
                                <option value="sentiment" ${filters.sortBy === 'sentiment' ? 'selected' : ''}>Sentiment</option>
                            </select>
                            <select id="sortOrder" class="filter-select">
                                <option value="desc" ${filters.sortOrder === 'desc' ? 'selected' : ''}>Descending</option>
                                <option value="asc" ${filters.sortOrder === 'asc' ? 'selected' : ''}>Ascending</option>
                            </select>
                        </div>
                    </div>

                    <!-- Active Filters Preview -->
                    <div class="filter-section">
                        <label class="filter-label">Active Filters</label>
                        <div id="filterPreview" class="filter-preview"></div>
                    </div>
                </div>

                <div class="filter-panel-footer">
                    <button id="resetFilters" class="btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        Reset
                    </button>
                    <button id="applyFilters" class="btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Apply Filters
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.removeEventListeners();

        // Close button
        const closeBtn = document.getElementById('closeFilterPanel');
        if (closeBtn) {
            this.boundHandlers.close = () => this.close();
            closeBtn.addEventListener('click', this.boundHandlers.close);
        }

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const handler = () => {
                const preset = btn.dataset.preset;
                this.filterManager.applyPreset(preset);
                this.render();
            };
            this.boundHandlers[`preset-${btn.dataset.preset}`] = handler;
            btn.addEventListener('click', handler);
        });

        // Date range tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            const handler = () => {
                const type = tab.dataset.tab;
                this.filterManager.setFilter('dateRange.type', type);
                this.render();
            };
            this.boundHandlers[`tab-${tab.dataset.tab}`] = handler;
            tab.addEventListener('click', handler);
        });

        // Date range preset
        const dateRangePreset = document.getElementById('dateRangePreset');
        if (dateRangePreset) {
            this.boundHandlers.dateRangePreset = (e) => {
                this.filterManager.setFilter('dateRange.preset', parseInt(e.target.value));
                this.updatePreview();
            };
            dateRangePreset.addEventListener('change', this.boundHandlers.dateRangePreset);
        }

        // Custom date range
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) {
            this.boundHandlers.startDate = (e) => {
                this.filterManager.setFilter('dateRange.start', e.target.value);
                this.updatePreview();
            };
            startDate.addEventListener('change', this.boundHandlers.startDate);
        }
        if (endDate) {
            this.boundHandlers.endDate = (e) => {
                this.filterManager.setFilter('dateRange.end', e.target.value);
                this.updatePreview();
            };
            endDate.addEventListener('change', this.boundHandlers.endDate);
        }

        // Platform checkboxes
        this.attachCheckboxHandlers('platforms');

        // Emotion checkboxes
        this.attachCheckboxHandlers('emotions');

        // Severity checkboxes
        this.attachCheckboxHandlers('severity');

        // Engagement range
        const engagementMin = document.getElementById('engagementMin');
        const engagementMax = document.getElementById('engagementMax');
        if (engagementMin) {
            this.boundHandlers.engagementMin = (e) => {
                this.filterManager.setFilter('engagement.min', parseInt(e.target.value) || 0);
                this.updatePreview();
            };
            engagementMin.addEventListener('change', this.boundHandlers.engagementMin);
        }
        if (engagementMax) {
            this.boundHandlers.engagementMax = (e) => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                this.filterManager.setFilter('engagement.max', value);
                this.updatePreview();
            };
            engagementMax.addEventListener('change', this.boundHandlers.engagementMax);
        }

        // Sort options
        const sortBy = document.getElementById('sortBy');
        const sortOrder = document.getElementById('sortOrder');
        if (sortBy) {
            this.boundHandlers.sortBy = (e) => {
                this.filterManager.setFilter('sortBy', e.target.value);
                this.updatePreview();
            };
            sortBy.addEventListener('change', this.boundHandlers.sortBy);
        }
        if (sortOrder) {
            this.boundHandlers.sortOrder = (e) => {
                this.filterManager.setFilter('sortOrder', e.target.value);
                this.updatePreview();
            };
            sortOrder.addEventListener('change', this.boundHandlers.sortOrder);
        }

        // Reset button
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            this.boundHandlers.reset = () => {
                this.filterManager.reset();
                this.render();
            };
            resetBtn.addEventListener('click', this.boundHandlers.reset);
        }

        // Apply button
        const applyBtn = document.getElementById('applyFilters');
        if (applyBtn) {
            this.boundHandlers.apply = () => this.close();
            applyBtn.addEventListener('click', this.boundHandlers.apply);
        }
    }

    /**
     * Attach checkbox handlers for a filter type
     */
    attachCheckboxHandlers(filterKey) {
        const section = document.querySelector(`[class*="${filterKey}"]`)?.closest('.filter-section');
        if (!section) return;

        const checkboxes = section.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const handler = (e) => {
                const value = e.target.value;
                const checked = e.target.checked;
                const currentValues = this.filterManager.getFilter(filterKey);

                let newValues;
                if (value === 'all') {
                    newValues = checked ? ['all'] : [];
                } else {
                    newValues = checked 
                        ? [...currentValues.filter(v => v !== 'all'), value]
                        : currentValues.filter(v => v !== value);
                    
                    if (newValues.length === 0) {
                        newValues = ['all'];
                    }
                }

                this.filterManager.setFilter(filterKey, newValues);
                this.render();
            };
            this.boundHandlers[`${filterKey}-${checkbox.value}`] = handler;
            checkbox.addEventListener('change', handler);
        });
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        Object.values(this.boundHandlers).forEach(handler => {
            // Remove from all possible elements
            document.querySelectorAll('button, input, select').forEach(el => {
                el.removeEventListener('click', handler);
                el.removeEventListener('change', handler);
            });
        });
        this.boundHandlers = {};
    }

    /**
     * Update filter preview
     */
    updatePreview() {
        const preview = document.getElementById('filterPreview');
        if (!preview) return;

        const summary = this.filterManager.getSummary();
        preview.innerHTML = `<p class="filter-summary">${summary}</p>`;
    }

    /**
     * Open panel
     */
    open() {
        this.isOpen = true;
        const panel = document.querySelector('.filter-panel');
        if (panel) {
            panel.classList.add('open');
        }
    }

    /**
     * Close panel
     */
    close() {
        this.isOpen = false;
        const panel = document.querySelector('.filter-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    }

    /**
     * Toggle panel
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Destroy
     */
    destroy() {
        this.removeEventListeners();
    }
}

// Create global instance
window.filterPanel = new FilterPanel();

export default FilterPanel;
