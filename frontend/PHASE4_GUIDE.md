# Phase 4: Advanced Features Implementation

## 🎯 Overview

Phase 4 adds powerful enterprise-grade features to the Social Monkey dashboard, including unified filtering, real-time data updates, filter presets, custom date ranges, and multi-platform selection.

---

## ✨ Features Implemented

### 1. **Advanced Filter Manager** (`filter-manager.js`)

Centralized filtering system that works across all dashboards.

#### Key Features:

- **Unified Filter State**: Single source of truth for all filter settings
- **LocalStorage Persistence**: Filters survive page reloads
- **Smart Filtering**: Applies multiple filter criteria simultaneously
- **Automatic Sorting**: Sort by date, engagement, or sentiment

#### Filter Options:

```javascript
{
  dateRange: {
    type: 'preset',      // 'preset' or 'custom'
    preset: 30,          // 7, 30, 60, 90, 180, 365 days
    start: null,         // Custom start date
    end: null            // Custom end date
  },
  platforms: ['all'],    // ['all', 'twitter', 'instagram']
  emotions: ['all'],     // ['all', 'positive', 'negative', 'neutral', 'excited', 'sad']
  severity: ['all'],     // ['all', 'high', 'medium', 'low']
  engagement: {
    min: 0,              // Minimum engagement
    max: null            // Maximum engagement (null = unlimited)
  },
  sortBy: 'date',        // 'date', 'engagement', 'sentiment'
  sortOrder: 'desc'      // 'asc', 'desc'
}
```

#### Usage Example:

```javascript
// Get filter manager instance
const filterManager = window.filterManager;

// Set a filter
filterManager.setFilter("platforms", ["twitter"]);
filterManager.setFilter("dateRange.preset", 7);

// Apply preset
filterManager.applyPreset("high-engagement");

// Listen for changes
filterManager.onChange((key, value, allFilters) => {
  console.log("Filter changed:", key, value);
  refreshDashboard();
});

// Filter posts
const filtered = filterManager.filterPosts(posts);
const sorted = filterManager.sortPosts(filtered);
// Or combine: const results = filterManager.applyAll(posts);
```

---

### 2. **Auto-Refresh Manager** (`auto-refresh.js`)

Automatic data refreshing with configurable intervals.

#### Key Features:

- **Automatic Refresh**: Refreshes every 5 minutes (configurable)
- **Manual Refresh**: Force refresh anytime
- **Status Indicator**: Real-time countdown display
- **Smart Cache Clearing**: Clears data loader cache on refresh
- **LocalStorage Persistence**: Remembers enabled/disabled state

#### Configuration:

```javascript
const autoRefresh = window.autoRefreshManager;

// Enable/disable auto-refresh
autoRefresh.toggle(); // Toggle on/off
autoRefresh.start(); // Start auto-refresh
autoRefresh.stop(); // Stop auto-refresh

// Set interval (in minutes)
autoRefresh.setInterval(5); // Refresh every 5 minutes
autoRefresh.setInterval(10); // Refresh every 10 minutes

// Manual refresh
await autoRefresh.manualRefresh(); // Force immediate refresh

// Get status
const status = autoRefresh.getStatus();
console.log(status.enabled); // true/false
console.log(status.lastRefreshFormatted); // "2 minutes ago"
console.log(status.timeUntilRefreshFormatted); // "3m 45s"

// Register callback
autoRefresh.onRefresh(async (event, data) => {
  if (event === "refresh") {
    // Refresh your dashboard
    await dashboard.render();
  }
});
```

---

### 3. **Filter Panel UI** (`filter-panel.js`)

Beautiful slide-out panel for advanced filtering.

#### Key Features:

- **Quick Presets**: 8 pre-configured filter combinations
- **Date Range Tabs**: Switch between preset and custom dates
- **Multi-Select**: Select multiple platforms, emotions, severities
- **Engagement Range**: Set min/max engagement thresholds
- **Live Preview**: See active filters before applying
- **Responsive Design**: Works on desktop and mobile

#### Presets Available:

1. **Last 7 Days** - Recent activity
2. **Last 30 Days** - Monthly overview
3. **Last 90 Days** - Quarterly analysis
4. **High Engagement** - Posts with 100+ engagement
5. **Negative Only** - Filter negative sentiment
6. **Twitter Only** - Twitter posts
7. **Instagram Only** - Instagram posts
8. **Critical Triggers** - High severity negative posts (last 7 days)

#### Usage:

```javascript
const filterPanel = window.filterPanel;

// Open/close panel
filterPanel.open();
filterPanel.close();
filterPanel.toggle();

// Render in specific container
filterPanel.render("filterPanelContainer");

// Check if open
if (filterPanel.isOpen) {
  console.log("Panel is open");
}
```

---

## 🎨 UI Components

### Filter Button

Gradient button that opens the filter panel:

```html
<button id="openFilterPanel" class="btn-filter">
  <svg>...</svg>
  Advanced Filters
</button>
```

### Auto-Refresh Status

Live status indicator with countdown:

```html
<div class="auto-refresh-status status-active">
  <span class="status-icon">●</span>
  <span class="status-text">Auto-refresh: 4m 23s</span>
  <span class="last-update">Last updated: Just now</span>
</div>
```

### Toggle Auto-Refresh Button

```html
<button id="toggleAutoRefresh" class="btn-secondary">
  <svg>...</svg>
  Enable Auto-Refresh
</button>
```

---

## 🔧 Integration Guide

### Step 1: Add Phase 4 Controls to Dashboard Headers

Update your dashboard's `getHTML()` method to include Phase 4 controls:

```javascript
getHTML() {
  return `
    <div class="dashboard-header">
      <div>
        <h1>Dashboard Name</h1>
        <p class="subtitle">Description</p>
      </div>

      <!-- Add Phase 4 Controls -->
      ${window.dashboardApp?.getPhase4ControlsHTML() || ''}
    </div>

    <!-- Rest of your dashboard HTML -->
  `;
}
```

### Step 2: Attach Event Handlers After Render

After rendering your dashboard HTML, attach Phase 4 handlers:

```javascript
async render() {
  const container = document.getElementById('main-content');
  container.innerHTML = this.getHTML();

  this.initializeComponents();

  // Attach Phase 4 control handlers
  if (window.dashboardApp) {
    window.dashboardApp.attachPhase4ControlHandlers();
  }
}
```

### Step 3: Use Filters in Your Dashboard

Apply filters to your data:

```javascript
async loadData() {
  const posts = await this.dataLoader.loadPosts();

  // Apply filters
  const filteredPosts = window.filterManager.applyAll(posts);

  return {
    posts: filteredPosts,
    // ... other data
  };
}
```

### Step 4: Listen for Filter Changes

React to filter changes:

```javascript
constructor() {
  // ... other initialization

  // Listen for filter changes
  this.unsubscribeFilters = window.filterManager.onChange(() => {
    this.render(); // Re-render when filters change
  });
}

destroy() {
  // Cleanup
  if (this.unsubscribeFilters) {
    this.unsubscribeFilters();
  }
}
```

---

## 📊 Filter Logic

### Date Range Filtering

```javascript
matchesDateRange(post) {
  const postDate = new Date(post.created_at);

  if (type === 'preset') {
    const cutoff = new Date(now - preset_days * 24 * 60 * 60 * 1000);
    return postDate >= cutoff;
  } else {
    return postDate >= start && postDate <= end;
  }
}
```

### Platform Filtering

```javascript
matchesPlatform(post) {
  if (platforms.includes('all')) return true;
  return platforms.includes(post.platform.toLowerCase());
}
```

### Severity Calculation

```javascript
calculateSeverity(post) {
  const engagement = post.engagement || 0;
  if (engagement > 100) return 'high';
  if (engagement > 50) return 'medium';
  return 'low';
}
```

---

## 🎭 CSS Classes

### Filter Panel

- `.filter-panel` - Main container
- `.filter-panel.open` - When panel is visible
- `.filter-section` - Individual filter section
- `.filter-presets` - Preset buttons grid
- `.preset-btn` - Individual preset button
- `.filter-tabs` - Tab switcher
- `.filter-checkboxes` - Checkbox group
- `.filter-preview` - Active filters summary

### Auto-Refresh

- `.auto-refresh-status` - Status container
- `.status-active` - Green pulsing indicator
- `.status-inactive` - Red indicator
- `.status-icon` - Animated dot
- `.status-text` - Main status text
- `.last-update` - Timestamp

### Buttons

- `.btn-filter` - Gradient filter button
- `.btn-filter.active` - When filter panel is open
- `.btn-secondary` - Secondary action button

---

## 🚀 Performance

### Filter Caching

- Filter state cached in localStorage
- Survives page reloads and browser restarts

### Smart Refresh

- Only refreshes current dashboard
- Clears cache before fetching new data
- Maintains scroll position

### Optimized Filtering

- Early returns for 'all' selections
- Single pass through data array
- Efficient date comparisons

---

## 🎯 Best Practices

### 1. Always Apply Filters

```javascript
// ❌ Don't use raw posts
const posts = await dataLoader.loadPosts();
this.renderTable(posts);

// ✅ Apply filters first
const posts = await dataLoader.loadPosts();
const filtered = filterManager.applyAll(posts);
this.renderTable(filtered);
```

### 2. Listen for Changes

```javascript
// ❌ Don't check filters manually
setInterval(() => {
  const filters = filterManager.getAllFilters();
  if (filtersChanged(filters)) {
    this.render();
  }
}, 1000);

// ✅ Use onChange listener
filterManager.onChange(() => {
  this.render();
});
```

### 3. Cleanup Listeners

```javascript
// ❌ Memory leak
constructor() {
  filterManager.onChange(() => this.render());
}

// ✅ Proper cleanup
constructor() {
  this.unsubscribe = filterManager.onChange(() => this.render());
}

destroy() {
  this.unsubscribe();
}
```

---

## 🐛 Troubleshooting

### Filters Not Applied

- Check if `filterManager.applyAll()` is called
- Verify filter values with `filterManager.getAllFilters()`
- Check console for errors

### Auto-Refresh Not Working

- Check if auto-refresh is enabled: `autoRefreshManager.isEnabled()`
- Verify callback is registered: `autoRefreshManager.onRefresh()`
- Check console for timer ID

### Filter Panel Not Opening

- Verify `filter-panel.js` is imported
- Check if container exists: `document.getElementById('filterPanel')`
- Verify event listeners are attached

---

## 📚 API Reference

### FilterManager

#### Methods

- `setFilter(key, value)` - Set filter value
- `getFilter(key)` - Get filter value
- `getAllFilters()` - Get all filters
- `applyPreset(key)` - Apply preset
- `reset()` - Reset to defaults
- `onChange(callback)` - Register listener
- `filterPosts(posts)` - Filter posts
- `sortPosts(posts)` - Sort posts
- `applyAll(posts)` - Filter + sort
- `getSummary()` - Get text summary

### AutoRefreshManager

#### Methods

- `start()` - Start auto-refresh
- `stop()` - Stop auto-refresh
- `toggle()` - Toggle on/off
- `setInterval(minutes)` - Set interval
- `manualRefresh()` - Force refresh
- `onRefresh(callback)` - Register callback
- `getStatus()` - Get current status
- `isEnabled()` - Check if enabled

### FilterPanel

#### Methods

- `render(containerId)` - Render panel
- `open()` - Open panel
- `close()` - Close panel
- `toggle()` - Toggle open/close
- `destroy()` - Cleanup

---

## 🎉 Summary

Phase 4 adds production-ready features that transform the Social Monkey dashboard into a professional analytics platform:

✅ **Unified Filtering** - One filter system for all dashboards  
✅ **Auto-Refresh** - Real-time data updates every 5 minutes  
✅ **Quick Presets** - 8 pre-configured filter combinations  
✅ **Custom Dates** - Pick any date range  
✅ **Multi-Select** - Choose multiple platforms/emotions/severities  
✅ **Live Preview** - See active filters before applying  
✅ **LocalStorage** - Settings persist across sessions  
✅ **Clean UI** - Beautiful slide-out panel with animations

All features are fully integrated and ready to use! 🚀
