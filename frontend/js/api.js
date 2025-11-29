import { API_ENDPOINTS } from './config.js';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('access_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('access_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('access_token');
    }

    async request(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============================================
    // AUTH METHODS
    // ============================================

    async register(email, username, password) {
        return this.request(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ email, username, password })
        });
    }

    async login(email, password) {
        const data = await this.request(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.access_token) {
            this.setToken(data.access_token);
        }
        
        return data;
    }

    // ============================================
    // OVERVIEW DATA METHODS
    // ============================================

    /**
     * Get top performing posts from ingestion endpoint (REAL DATA FROM DATABASE)
     */
    async getTopPosts(limit = 5) {
        try {
            // Call ingestion endpoint which fetches real posts from database
            const posts = await this.request(`/api/v1/ingestion/posts?limit=${limit}`);
            return Array.isArray(posts) ? posts : [];
        } catch (error) {
            console.error('Error fetching top posts:', error);
            return [];
        }
    }

    // ============================================
    // OAUTH METHODS
    // ============================================

    async getTwitterAuthUrl() {
        return this.request(API_ENDPOINTS.TWITTER_AUTH);
    }

    // ============================================
    // ANALYTICS METHODS
    // ============================================

    async triggerAnalysis() {
        return this.request('/api/v1/analytics/analyze-existing', {
            method: 'POST'
        });
    }

    // ============================================
    // DATA METHODS
    // ============================================

    async getAccounts() {
        return this.request(API_ENDPOINTS.ACCOUNTS);
    }

    async getPosts(accountId = null) {
        const url = accountId 
            ? `${API_ENDPOINTS.POSTS}?account_id=${accountId}`
            : API_ENDPOINTS.POSTS;
        return this.request(url);
    }

    async getStats() {
        return this.request(API_ENDPOINTS.STATS);
    }

    async ingestData(accountId, maxPosts = 100) {
        return this.request(API_ENDPOINTS.INGEST(accountId) + `?max_posts=${maxPosts}`, {
            method: 'POST'
        });
    }

    // ============================================
    // ANALYTICS METHODS
    // ============================================

    async getEmotionAnalysis() {
        try {
            return await this.request(API_ENDPOINTS.EMOTION_ANALYSIS);
        } catch (error) {
            console.error('Error fetching emotion analysis:', error);
            return { emotion_distribution: { joy: 0, admiration: 0, neutral: 0, sarcasm: 0, anger: 0 } };
        }
    }

    async getSlangAnalysis() {
        return this.request(API_ENDPOINTS.SLANG_ANALYSIS);
    }

    async getTopPosts(limit = 5) {
        try {
            // Use the dedicated analytics endpoint which returns posts sorted by engagement
            const response = await this.request(`/api/v1/analytics/top-posts?limit=${limit}`);
            
            if (Array.isArray(response)) {
                return response;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching top posts:', error);
            return [];
        }
    }

    async getEngagementTrends(days = 30) {
        return this.request(`${API_ENDPOINTS.ENGAGEMENT_TRENDS}?days=${days}`);
    }

    async getPostFrequency(days = 30) {
        return this.request(`${API_ENDPOINTS.POST_FREQUENCY}?days=${days}`);
    }

    async getAdvancedAnalytics() {
        return this.request(API_ENDPOINTS.ADVANCED_ANALYTICS);
    }
}

// Make API service globally available
window.api = new ApiService();

export default ApiService;
