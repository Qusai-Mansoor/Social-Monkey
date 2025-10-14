const API_CONFIG = {
    BASE_URL: '',  // Empty string means same origin - no need for localhost:8000
    API_PREFIX: '/api/v1'
};

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
    INGEST: (accountId) => `${API_CONFIG.API_PREFIX}/data/ingest/${accountId}`
};
