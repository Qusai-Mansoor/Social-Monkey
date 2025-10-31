// Global API Configuration
const API_CONFIG = {
    BASE_URL: '',  // Empty string means same origin - no need for localhost:8000
    API_PREFIX: '/api/v1'
};

// Global API Base URL for easy access
const API_BASE_URL = API_CONFIG.BASE_URL;

const API_ENDPOINTS = {
    // Auth endpoints
    REGISTER: `${API_CONFIG.API_PREFIX}/auth/register`,
    LOGIN: `${API_CONFIG.API_PREFIX}/auth/login`,
    
    // OAuth endpoints
    TWITTER_AUTH: `${API_CONFIG.API_PREFIX}/oauth/twitter/authorize`,
    
    // Data endpoints
    ACCOUNTS: `${API_CONFIG.API_PREFIX}/data/accounts`,
    POSTS: `${API_CONFIG.API_PREFIX}/data/posts`,
    STATS: `${API_CONFIG.API_PREFIX}/data/stats`,
    INGEST: (accountId) => `${API_CONFIG.API_PREFIX}/data/ingest/${accountId}`,
    
    // Analytics endpoints
    EMOTION_ANALYSIS: `${API_CONFIG.API_PREFIX}/analytics/emotion-analysis`,
    SLANG_ANALYSIS: `${API_CONFIG.API_PREFIX}/analytics/slang-analysis`,
    TOP_POSTS: `${API_CONFIG.API_PREFIX}/analytics/top-posts`,
    ENGAGEMENT_TRENDS: `${API_CONFIG.API_PREFIX}/analytics/engagement-trends`,
    POST_FREQUENCY: `${API_CONFIG.API_PREFIX}/analytics/post-frequency`,
    ADVANCED_ANALYTICS: `${API_CONFIG.API_PREFIX}/analytics/advanced-analytics`
};

export {
    API_CONFIG,
    API_BASE_URL,
    API_ENDPOINTS
}