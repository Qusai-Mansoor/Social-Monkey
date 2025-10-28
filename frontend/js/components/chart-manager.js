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

        const { positive = 0, neutral = 0, negative = 0 } = data;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Joy', 'Admiration', 'Neutral', 'Sarcasm', 'Anger'],
                datasets: [{
                    data: [
                        Math.floor(positive * 0.7),  // Joy
                        Math.floor(positive * 0.3),  // Admiration  
                        neutral,                      // Neutral
                        Math.floor(negative * 0.6),  // Sarcasm
                        Math.floor(negative * 0.4)   // Anger
                    ],
                    backgroundColor: [
                        '#DA6CFF',  // Joy - Magenta
                        '#7C3AED',  // Admiration - Purple
                        '#6B7280',  // Neutral - Gray
                        '#10B981',  // Sarcasm - Green
                        '#EF4444'   // Anger - Red
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111533',
                        titleColor: '#FFFFFF',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true
                    }
                }
            }
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
        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const labels = entries.map(([term]) => term);
        const values = entries.map(([, count]) => count);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: values,
                    backgroundColor: [
                        '#DA6CFF',
                        '#A855F7',
                        '#7C3AED',
                        '#6366F1',
                        '#8B5CF6'
                    ],
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            stepSize: 50
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#111533',
                        titleColor: '#FFFFFF',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                }
            }
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
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Engagement',
                    data: data.values || [],
                    borderColor: '#7C3AED',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#DA6CFF',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#111533',
                        titleColor: '#FFFFFF',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Create emotion trend chart (multi-line)
     */
    createEmotionTrendChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas not found:', canvasId);
            return null;
        }

        const ctx = canvas.getContext('2d');

        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        // Check if data already has datasets (for backward compatibility)
        let datasets;
        let labels;

        if (data.datasets) {
            // Data already formatted with datasets
            datasets = data.datasets;
            labels = data.labels || [];
        } else {
            // Build datasets from emotion keys
            const emotionColors = {
                joy: { color: '#DA6CFF', label: 'Joy' },
                admiration: { color: '#7C3AED', label: 'Admiration' },
                neutral: { color: '#6B7280', label: 'Neutral' },
                sarcasm: { color: '#10B981', label: 'Sarcasm' },
                anger: { color: '#EF4444', label: 'Anger' }
            };

            datasets = Object.keys(emotionColors).map(emotion => {
                const emotionData = data[emotion] || [];
                
                return {
                    label: emotionColors[emotion].label,
                    data: emotionData,
                    borderColor: emotionColors[emotion].color,
                    backgroundColor: emotionColors[emotion].color + '20', // 20 = 12% opacity
                    tension: 0.4,
                    pointBackgroundColor: emotionColors[emotion].color,
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                };
            });
            
            labels = data.labels || [];
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            callback: function(value) {
                                return value.toFixed(0);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12,
                                family: 'Manrope'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111533',
                        titleColor: '#FFFFFF',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(124, 58, 237, 0.5)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(0) + ' posts';
                                return label;
                            }
                        }
                    }
                }
            }
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
        Object.keys(this.charts).forEach(canvasId => {
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
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#111533',
                    titleColor: '#FFFFFF',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(124, 58, 237, 0.5)',
                    borderWidth: 1,
                    padding: 12
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: { ...defaultOptions, ...options }
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
                    display: false
                },
                tooltip: {
                    backgroundColor: '#111533',
                    titleColor: '#FFFFFF',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(124, 58, 237, 0.5)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        return this.charts[canvasId];
    }
}

// Create global instance
window.chartManager = new ChartManager();

export default ChartManager;

