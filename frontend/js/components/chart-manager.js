/**
 * Chart Manager Component
 * Handles Chart.js chart creation and updates
 */

class ChartManager {
  constructor() {
    this.charts = {};
  }

  /**
   * Create or update emotion pie chart
   */
  createEmotionChart(canvasId, data) {
    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Check if data is empty
    if (!data || Object.keys(data).length === 0) {
      // Show empty state
      const chartContainer = ctx.parentElement;
      if (chartContainer) {
        chartContainer.innerHTML = `
                    <div class="empty-chart-state">
                        <div class="empty-icon">📊</div>
                        <p>No emotion data available yet</p>
                        <p class="empty-hint">Click "Run AI Analysis" to analyze your posts</p>
                    </div>
                `;
      }
      return null;
    }

    // Dynamic approach: Show only emotions that exist in the data
    // data format: {"joy": 5, "anger": 2, "curiosity": 3, "fear": 1, ...}

    console.log("Emotion data received:", data);

    // Convert emotion names to title case for display
    const emotionLabels = [];
    const emotionCounts = [];
    const emotionColors = [];

    // Color mapping for all 27 GoEmotions + neutral
    const emotionColorMap = {
      // Positive emotions (pink/magenta tones)
      admiration: "#DA6CFF",
      amusement: "#FF6B9D",
      approval: "#C77DFF",
      caring: "#FF99CC",
      desire: "#FF1493",
      excitement: "#FF69B4",
      gratitude: "#DDA0DD",
      joy: "#FF1493",
      love: "#FF69B4",
      optimism: "#FFB6C1",
      pride: "#DA70D6",
      relief: "#EE82EE",

      // Negative emotions (red/orange tones)
      anger: "#EF4444",
      annoyance: "#F97316",
      disappointment: "#FB923C",
      disapproval: "#DC2626",
      disgust: "#B91C1C",
      embarrassment: "#FCA5A5",
      fear: "#7C2D12",
      grief: "#991B1B",
      nervousness: "#FED7AA",
      remorse: "#EA580C",
      sadness: "#F87171",

      // Ambiguous emotions (blue/purple/gray tones)
      confusion: "#60A5FA",
      curiosity: "#3B82F6",
      realization: "#8B5CF6",
      surprise: "#10B981",

      // Neutral
      neutral: "#6B7280",
    };

    // Sort emotions by count (descending) and build chart data
    const sortedEmotions = Object.entries(data).sort((a, b) => b[1] - a[1]);

    sortedEmotions.forEach(([emotion, count]) => {
      if (count > 0) {
        // Capitalize first letter for display
        const displayName =
          emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
        emotionLabels.push(displayName);
        emotionCounts.push(count);
        emotionColors.push(emotionColorMap[emotion.toLowerCase()] || "#9CA3AF");
      }
    });

    console.log("Dynamic chart data:", {
      labels: emotionLabels,
      counts: emotionCounts,
      colors: emotionColors,
    });

    // If all values are zero, show empty state
    const total = emotionCounts.reduce((a, b) => a + b, 0);
    if (total === 0) {
      const chartContainer = ctx.parentElement;
      if (chartContainer) {
        chartContainer.innerHTML = `
                    <div class="empty-chart-state">
                        <div class="empty-icon">📊</div>
                        <p>No emotion data available yet</p>
                        <p class="empty-hint">Click "Run AI Analysis" to analyze your posts</p>
                    </div>
                `;
      }
      return null;
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: emotionLabels,
        datasets: [
          {
            data: emotionCounts,
            backgroundColor: emotionColors,
            borderWidth: 0,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(255, 255, 255, 0.8)",
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "#111533",
            titleColor: "#FFFFFF",
            bodyColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(124, 58, 237, 0.5)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} posts (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    return this.charts[canvasId];
  }

  /**
   * Create or update slang bar chart
   */
  createSlangChart(canvasId, data) {
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Get top 5 slang terms
    const entries = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const labels = entries.map(([term]) => term);
    const values = entries.map(([, count]) => count);

    this.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Frequency",
            data: values,
            backgroundColor: [
              "#DA6CFF",
              "#A855F7",
              "#7C3AED",
              "#6366F1",
              "#8B5CF6",
            ],
            borderRadius: 8,
            barThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
              stepSize: 50,
            },
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              drawBorder: false,
            },
          },
          x: {
            ticks: {
              color: "rgba(255, 255, 255, 0.8)",
              font: {
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#111533",
            titleColor: "#FFFFFF",
            bodyColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(124, 58, 237, 0.5)",
            borderWidth: 1,
            padding: 12,
          },
        },
      },
    });

    return this.charts[canvasId];
  }

  /**
   * Create line chart for trends
   */
  createTrendChart(canvasId, data) {
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    this.charts[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Engagement",
            data: data.values || [],
            borderColor: "#7C3AED",
            backgroundColor: "rgba(124, 58, 237, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#DA6CFF",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              drawBorder: false,
            },
          },
          x: {
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#111533",
            titleColor: "#FFFFFF",
            bodyColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(124, 58, 237, 0.5)",
            borderWidth: 1,
            padding: 12,
          },
        },
      },
    });

    return this.charts[canvasId];
  }

  /**
   * Create emotion trend chart (multi-line)
   */
  createEmotionTrendChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error("Canvas not found:", canvasId);
      return null;
    }

    const ctx = canvas.getContext("2d");

    // Destroy existing chart if it exists
    this.destroyChart(canvasId);

    // Check if data already has datasets (for backward compatibility)
    let datasets;
    let labels;

    if (data.datasets) {
      // Data already formatted with datasets
      datasets = data.datasets;
      labels = data.labels || [];
    } else if (data.emotions && typeof data.emotions === "object") {
      // New format: { labels: [], emotions: { emotion1: [], emotion2: [] } }
      labels = data.labels || [];

      // Color palette for emotions
      const colorPalette = [
        "#10B981",
        "#3B82F6",
        "#8B5CF6",
        "#EC4899",
        "#F59E0B",
        "#EF4444",
        "#14B8A6",
        "#6366F1",
        "#A855F7",
        "#F97316",
        "#84CC16",
        "#06B6D4",
        "#D946EF",
        "#FBBF24",
        "#FB923C",
      ];

      const emotionColorMap = {
        joy: "#10B981",
        love: "#EC4899",
        admiration: "#8B5CF6",
        anger: "#EF4444",
        fear: "#6366F1",
        sadness: "#3B82F6",
        surprise: "#F59E0B",
        neutral: "#6B7280",
        excitement: "#FBBF24",
        gratitude: "#10B981",
        confusion: "#A855F7",
        curiosity: "#3B82F6",
        disappointment: "#EF4444",
        nervousness: "#F59E0B",
        disgust: "#84CC16",
        annoyance: "#F97316",
      };

      let colorIndex = 0;
      datasets = Object.entries(data.emotions).map(([emotion, emotionData]) => {
        const color =
          emotionColorMap[emotion] ||
          colorPalette[colorIndex % colorPalette.length];
        colorIndex++;

        return {
          label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
          data: emotionData,
          borderColor: color,
          backgroundColor: color + "20", // 20 = 12% opacity
          tension: 0.4,
          pointBackgroundColor: color,
          pointBorderColor: "#FFFFFF",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          borderWidth: 2,
        };
      });
    } else {
      // Old format: { labels: [], joy: [], admiration: [], ... }
      const emotionColors = {
        joy: { color: "#DA6CFF", label: "Joy" },
        admiration: { color: "#7C3AED", label: "Admiration" },
        neutral: { color: "#6B7280", label: "Neutral" },
        sarcasm: { color: "#10B981", label: "Sarcasm" },
        anger: { color: "#EF4444", label: "Anger" },
      };

      datasets = Object.keys(emotionColors).map((emotion) => {
        const emotionData = data[emotion] || [];

        return {
          label: emotionColors[emotion].label,
          data: emotionData,
          borderColor: emotionColors[emotion].color,
          backgroundColor: emotionColors[emotion].color + "20",
          tension: 0.4,
          pointBackgroundColor: emotionColors[emotion].color,
          pointBorderColor: "#FFFFFF",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        };
      });

      labels = data.labels || [];
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
              callback: function (value) {
                return value.toFixed(0);
              },
            },
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              drawBorder: false,
            },
          },
          x: {
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
              maxRotation: 45,
              minRotation: 45,
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              color: "rgba(255, 255, 255, 0.8)",
              padding: 15,
              usePointStyle: true,
              pointStyle: "circle",
              font: {
                size: 12,
                family: "Manrope",
              },
            },
          },
          tooltip: {
            backgroundColor: "#111533",
            titleColor: "#FFFFFF",
            bodyColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(124, 58, 237, 0.5)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                label += context.parsed.y.toFixed(0) + " posts";
                return label;
              },
            },
          },
        },
      },
    });

    return this.charts[canvasId];
  }

  /**
   * Destroy a specific chart
   */
  destroyChart(canvasId) {
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }
  }

  /**
   * Destroy all charts
   */
  destroyAll() {
    Object.keys(this.charts).forEach((canvasId) => {
      this.destroyChart(canvasId);
    });
  }

  /**
   * Create pie chart (generic method)
   */
  createPieChart(canvasId, data, options = {}) {
    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) {
      console.error(`Canvas element '${canvasId}' not found`);
      return null;
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "rgba(255, 255, 255, 0.8)",
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "#111533",
          titleColor: "#FFFFFF",
          bodyColor: "rgba(255, 255, 255, 0.8)",
          borderColor: "rgba(124, 58, 237, 0.5)",
          borderWidth: 1,
          padding: 12,
        },
      },
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: "pie",
      data: data,
      options: { ...defaultOptions, ...options },
    });

    return this.charts[canvasId];
  }

  /**
   * Create bar chart (generic method)
   */
  createBarChart(canvasId, data, options = {}) {
    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) {
      console.error(`Canvas element '${canvasId}' not found`);
      return null;
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#111533",
          titleColor: "#FFFFFF",
          bodyColor: "rgba(255, 255, 255, 0.8)",
          borderColor: "rgba(124, 58, 237, 0.5)",
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            display: false,
          },
        },
      },
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: data,
      options: { ...defaultOptions, ...options },
    });

    return this.charts[canvasId];
  }

  /**
   * Create generic chart (supports any Chart.js type)
   * @param {HTMLCanvasElement|string} canvas - Canvas element or canvas ID
   * @param {string} type - Chart type (pie, doughnut, bar, line, radar, etc.)
   * @param {object} data - Chart data
   * @param {object} options - Chart options
   */
  createChart(canvas, type, data, options = {}) {
    // Get canvas element
    let ctx;
    if (typeof canvas === "string") {
      ctx = document.getElementById(canvas);
    } else if (canvas instanceof HTMLCanvasElement) {
      ctx = canvas;
    } else {
      console.error("Invalid canvas parameter:", canvas);
      return null;
    }

    if (!ctx) {
      console.error("Canvas element not found:", canvas);
      return null;
    }

    // Get canvas ID for chart storage
    const canvasId = ctx.id || `chart_${Date.now()}`;

    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    // Default options based on theme
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "rgba(255, 255, 255, 0.8)",
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "#111533",
          titleColor: "#FFFFFF",
          bodyColor: "rgba(255, 255, 255, 0.8)",
          borderColor: "rgba(124, 58, 237, 0.5)",
          borderWidth: 1,
          padding: 12,
        },
      },
    };

    // Add scales for chart types that need them
    if (["bar", "line", "radar"].includes(type)) {
      defaultOptions.scales = {
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            display: false,
          },
        },
      };
    }

    // Merge options
    const mergedOptions = this.deepMerge(defaultOptions, options);

    // Create chart
    this.charts[canvasId] = new Chart(ctx, {
      type: type,
      data: data,
      options: mergedOptions,
    });

    return this.charts[canvasId];
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }
}

// Create global instance
window.chartManager = new ChartManager();

export default ChartManager;
