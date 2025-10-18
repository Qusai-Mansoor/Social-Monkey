// Check if user is logged in
if (!localStorage.getItem('access_token')) {
    window.location.href = '/';
}

// DOM Elements
const accountsList = document.getElementById('accountsList');
const postsContainer = document.getElementById('postsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const logoutBtn = document.getElementById('logoutBtn');
const connectTwitterBtn = document.getElementById('connectTwitterBtn');
const refreshBtn = document.getElementById('refreshBtn');
const totalPostsEl = document.getElementById('totalPosts');
const processedPostsEl = document.getElementById('processedPosts');

// Logout Handler
logoutBtn.addEventListener('click', () => {
    api.clearToken();
    window.location.href = '/';
});

// Connect Twitter Handler
connectTwitterBtn.addEventListener('click', async () => {
    try {
        const data = await api.getTwitterAuthUrl();
        window.location.href = data.authorization_url;
    } catch (error) {
        alert('Failed to connect Twitter: ' + error.message);
    }
});

// Refresh Data Handler
refreshBtn.addEventListener('click', loadDashboardData);

// Check for OAuth success message
function checkOAuthSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const username = urlParams.get('username');
    
    if (connected === 'twitter' && username) {
        alert(`Twitter account @${username} connected successfully!`);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        loadingSpinner.style.display = 'flex';
        
        // Load accounts
        const accounts = await api.getAccounts();
        displayAccounts(accounts);
        
        // Load stats
        const stats = await api.getStats();
        displayStats(stats);
        
        // Load posts with pagination - get more posts
        const posts = await getAllUserPosts();
        displayPosts(posts);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// New function to get all posts with pagination
async function getAllUserPosts(limit = 500) {
    try {
        // Get posts in batches
        let allPosts = [];
        let skip = 0;
        const batchSize = 100;
        
        while (allPosts.length < limit) {
            const batch = await fetch(`/api/v1/data/posts?skip=${skip}&limit=${batchSize}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            }).then(r => r.json());
            
            if (batch.length === 0) break; // No more posts
            
            allPosts = allPosts.concat(batch);
            skip += batchSize;
            
            if (batch.length < batchSize) break; // Last batch
        }
        
        return allPosts.slice(0, limit);
    } catch (error) {
        console.error('Error fetching all posts:', error);
        return [];
    }
}

function displayAccounts(accounts) {
    if (accounts.length === 0) {
        accountsList.innerHTML = '<p class="no-data">No accounts connected</p>';
        return;
    }
    
    accountsList.innerHTML = accounts.map(account => `
        <div class="account-item">
            <div class="account-info">
                <span class="platform-badge ${account.platform}">${account.platform}</span>
                <span>@${account.platform_username}</span>
            </div>
            <button id="${account.id}Sync" class="btn btn-primary" style="padding: 6px 12px; font-size: 14px;">
                Sync
            </button>
        </div>
    `).join('');

    // Attach event listeners to sync buttons
    accounts.forEach(account => {
        const syncBtn = document.getElementById(`${account.id}Sync`);
        syncBtn.addEventListener('click', () => ingestAccountData(account.id));
    });
}

function displayStats(stats) {
    totalPostsEl.textContent = stats.total_posts || 0;
    processedPostsEl.textContent = stats.preprocessed_posts || 0;
}

function displayPosts(posts) {
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-data">No posts found. Connect an account and sync your data.</p>';
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <span class="platform-badge ${post.social_account_id}">Post #${post.id}</span>
                <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-meta">
                <span>❤️ ${post.likes_count}</span>
                <span>🔄 ${post.retweets_count}</span>
                <span>💬 ${post.replies_count}</span>
            </div>
            ${post.preprocessed_content ? `
                <div style="margin-top: 10px; padding: 10px; background: var(--light-bg); border-radius: 4px; font-size: 12px;">
                    <strong>Processed:</strong> ${post.preprocessed_content}
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function ingestAccountData(accountId) {
    if (!confirm('This will fetch your latest posts. Continue?')) return;
    
    try {
        loadingSpinner.style.display = 'flex';
        const result = await api.ingestData(accountId, 50); 
        alert(result.message);
        loadDashboardData();
    } catch (error) {
        alert('Failed to sync data: ' + error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Initial load
checkOAuthSuccess();
loadDashboardData();
