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

    // Auth methods
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

    // OAuth methods
    async getTwitterAuthUrl() {
        return this.request(API_ENDPOINTS.TWITTER_AUTH);
    }

    // Data methods
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

    // Analytics methods
    async getEmotionAnalysis() {
        return this.request(API_ENDPOINTS.EMOTION_ANALYSIS);
    }

    async getSlangAnalysis() {
        return this.request(API_ENDPOINTS.SLANG_ANALYSIS);
    }

    async getTopPosts(limit = 5) {
        try {
            const response = await this.makeRequest(`/ingestion/posts?limit=${limit}`);
            
            // Sort posts by engagement (likes + retweets + replies)
            if (Array.isArray(response)) {
                return response
                    .map(post => ({
                        ...post,
                        total_engagement: (post.likes_count || 0) + (post.retweets_count || 0) + (post.replies_count || 0)
                    }))
                    .sort((a, b) => b.total_engagement - a.total_engagement)
                    .slice(0, limit);
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
