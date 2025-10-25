/**
 * Sidebar Navigation Controller
 * Handles sidebar rendering and navigation
 */

// Check authentication
if (!localStorage.getItem('access_token')) {
    window.location.href = '/login';
}

class SidebarController {
    constructor() {
        this.currentPage = 'overview';
        this.user = null;
    }

    async init() {
        await this.loadUserInfo();
    }

    async loadUserInfo() {
        try {
            // Try to get user info from localStorage or API
            const userInfo = localStorage.getItem('user_info');
            if (userInfo) {
                this.user = JSON.parse(userInfo);
            } else {
                // Fallback to default user
                this.user = {
                    name: 'User',
                    workspace: 'My Workspace'
                };
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            this.user = {
                name: 'User',
                workspace: 'My Workspace'
            };
        }
    }

    renderSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <!-- Sidebar Header -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="/static/assets/images/Social Monkey Logo.png" alt="Social Monkey" class="logo-img" onerror="this.style.display='none'">
                </div>
            </div>

            <!-- Navigation Menu -->
            <nav class="sidebar-nav">
                <a href="#overview" class="nav-item active" data-page="overview">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <span>Overview</span>
                </a>

                <a href="#emotion-analysis" class="nav-item" data-page="emotion-analysis">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <span>Emotion Dashboard</span>
                </a>

                <a href="#negative-triggers" class="nav-item" data-page="negative-triggers">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Negative Triggers</span>
                </a>

                <a href="#heatmap" class="nav-item" data-page="heatmap">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Heatmap Analysis</span>
                </a>

                <a href="#genz-insights" class="nav-item" data-page="genz-insights">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Gen-Z Insights</span>
                </a>

                <a href="#settings" class="nav-item" data-page="settings">
                    <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Profile</span>
                </a>
            </nav>

            <!-- User Profile Section -->
            <div class="sidebar-footer">
                <div class="user-profile" id="userProfile">
                    <div class="user-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div class="user-info">
                        <div class="user-name" id="userName">${this.user.name}</div>
                        <div class="user-workspace">${this.user.workspace}</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Navigation click handlers
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // User profile click handler
        const userProfile = document.getElementById('userProfile');
        if (userProfile) {
            userProfile.addEventListener('click', () => {
                window.location.href = '#settings';
            });
        }
    }

    navigateTo(page) {
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Store current page
        this.currentPage = page;

        // Update URL hash
        window.location.hash = page;

        // Trigger page load event
        const event = new CustomEvent('pageChange', { 
            detail: { page } 
        });
        document.dispatchEvent(event);
    }

    showUserMenu() {
        // Simple logout for now
        if (confirm('Do you want to logout?')) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login';
        }
    }
}

// Export for use in other modules
export default SidebarController;
