/**
 * GitHub OAuth Integration
 * Handles authentication, repository fetching, and repository management
 */

const API_BASE_URL = 'http://localhost:8001'; // Backend API URL
const GITHUB_REDIRECT_URI = `${window.location.origin}/pages/settings.html`;

class GitHubOAuth {
    constructor() {
        this.userId = this.generateUserId();
        this.isConnected = false;
        this.selectedRepos = new Set();
        this.allRepositories = [];
        this.init();
    }

    // ============ Initialization ============
    init() {
        this.setupEventListeners();
        this.checkURLParams();
        this.loadConnectedStatus();
    }

    setupEventListeners() {
        // GitHub connection
        document.getElementById('github-connect-btn')?.addEventListener('click', () => this.startOAuth());
        document.getElementById('github-disconnect-btn')?.addEventListener('click', () => this.disconnect());

        // Repository selection
        document.getElementById('select-all-repos')?.addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('save-repos-btn')?.addEventListener('click', () => this.saveSelectedRepos());
        document.getElementById('cancel-selection-btn')?.addEventListener('click', () => this.cancelSelection());
        document.getElementById('refresh-repos-btn')?.addEventListener('click', () => this.refreshRepositories());
    }

    checkURLParams() {
        // Check for OAuth success param
        const params = new URLSearchParams(window.location.search);
        const githubSuccess = params.get('github');

        if (githubSuccess === 'success') {
            this.onOAuthSuccess();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const githubError = params.get('error');
        if (githubError) {
            this.showError(`GitHub Authentication failed: ${decodeURIComponent(githubError)}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // ============ OAuth Flow ============
    async startOAuth() {
        try {
            this.showLoading();
            this.hideError();

            // Redirect to backend's login endpoint which handles GitHub OAuth
            window.location.href = `${API_BASE_URL}/auth/login`;

        } catch (error) {
            this.showError(`OAuth initiation failed: ${error.message}`);
            this.hideLoading();
        }
    }

    async onOAuthSuccess() {
        try {
            // Get authorization code from URL
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');

            if (!code) {
                throw new Error('No authorization code received');
            }

            this.showLoading();

            // Exchange code for token on backend
            const response = await fetch(
                `${API_BASE_URL}/auth/github/auth/github/callback`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        redirect_uri: GITHUB_REDIRECT_URI,
                        user_id: this.userId
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to complete OAuth authentication');
            }

            const data = await response.json();

            // Store connection info
            this.isConnected = true;
            localStorage.setItem('github_connected', 'true');
            localStorage.setItem('github_username', data.github_username);
            localStorage.setItem('github_avatar', data.avatar_url);

            this.updateConnectedUI(data);
            this.showSuccess('Successfully connected to GitHub');

            // Fetch repositories
            await this.fetchRepositories();

        } catch (error) {
            this.showError(`Authentication failed: ${error.message}`);
            localStorage.removeItem('github_connected');
        } finally {
            this.hideLoading();
        }
    }

    // ============ Repository Management ============
    async fetchRepositories() {
        try {
            this.showLoading();
            this.hideError();

            const response = await fetch(
                `${API_BASE_URL}/auth/github/repos?user_id=${this.userId}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            const data = await response.json();
            this.allRepositories = data.repositories;
            this.renderRepositoryList(this.allRepositories);

            document.getElementById('repo-selection-section')?.classList.remove('hidden');

        } catch (error) {
            this.showError(`Failed to fetch repositories: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    renderRepositoryList(repos) {
        const container = document.getElementById('repo-list-container');
        container.innerHTML = '';

        if (repos.length === 0) {
            container.innerHTML = '<p class="text-center py-8 text-on-surface-variant">No repositories found</p>';
            return;
        }

        repos.forEach(repo => {
            const repoElement = this.createRepoElement(repo);
            container.appendChild(repoElement);
        });
    }

    createRepoElement(repo) {
        const div = document.createElement('div');
        div.className = 'repo-item p-4 bg-surface-container border border-white/10 rounded-lg hover:border-indigo-500/30 transition-all';
        div.innerHTML = `
            <label class="flex items-center gap-4 cursor-pointer hover:bg-white/3 p-2 -m-2 rounded transition-colors">
                <input type="checkbox" class="repo-checkbox w-4 h-4 rounded accent-primary" data-repo-id="${repo.id}" data-repo-name="${repo.name}" />
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-label font-bold text-sm text-white truncate">${repo.name}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${
                            repo.is_private ? 'bg-tertiary/20 text-tertiary' : 'bg-white/5 text-slate-400'
                        }">
                            ${repo.is_private ? 'Private' : 'Public'}
                        </span>
                    </div>
                    <p class="text-xs text-on-surface-variant truncate">${repo.description || 'No description'}</p>
                    <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-label">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">star</span>
                            ${repo.stars}
                        </span>
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">call_split</span>
                            ${repo.forks}
                        </span>
                        ${repo.language ? `<span>${repo.language}</span>` : ''}
                    </div>
                </div>
            </label>
        `;

        // Add change event listener for checkbox
        const checkbox = div.querySelector('.repo-checkbox');
        checkbox.addEventListener('change', () => this.updateSelectedCount());

        return div;
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.repo-checkbox:checked');
        this.selectedRepos = new Set(Array.from(checkboxes).map(cb => cb.dataset.repoId));
        const count = this.selectedRepos.size;

        const countElement = document.getElementById('repo-count');
        if (countElement) {
            countElement.textContent = `${count} selected`;
        }
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.repo-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });

        this.updateSelectedCount();
    }

    async saveSelectedRepos() {
        try {
            if (this.selectedRepos.size === 0) {
                this.showError('Please select at least one repository');
                return;
            }

            this.showLoading();

            // Get selected repo details
            const selectedRepoData = this.allRepositories.filter(
                repo => this.selectedRepos.has(String(repo.id))
            );

            const response = await fetch(
                `${API_BASE_URL}/auth/github/save-repos`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: this.userId,
                        repos: selectedRepoData
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to save repositories');
            }

            this.showSuccess(`Successfully linked ${this.selectedRepos.size} repositories`);

            // Hide repo selection and show connected repos
            setTimeout(() => {
                document.getElementById('repo-selection-section')?.classList.add('hidden');
                this.loadLinkedRepositories();
                
                // Redirect to dashboard after 2 seconds to show the linked repos
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }, 1500);

        } catch (error) {
            this.showError(`Failed to save repositories: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    cancelSelection() {
        document.getElementById('repo-selection-section')?.classList.add('hidden');
        this.selectedRepos.clear();
    }

    async loadLinkedRepositories() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/github/linked-repos?user_id=${this.userId}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Failed to load linked repositories');
            }

            const data = await response.json();
            this.renderLinkedRepositories(data.repositories);

            document.getElementById('connected-repos-section')?.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to load linked repositories:', error);
        }
    }

    renderLinkedRepositories(repos) {
        const container = document.getElementById('connected-repos-list');
        container.innerHTML = '';

        if (repos.length === 0) {
            container.innerHTML = '<p class="text-center py-8 text-on-surface-variant">No linked repositories yet</p>';
            return;
        }

        repos.forEach(repo => {
            const repoCard = this.createLinkedRepoCard(repo);
            container.appendChild(repoCard);
        });
    }

    createLinkedRepoCard(repo) {
        const div = document.createElement('div');
        div.className = 'p-4 bg-surface-container border border-white/10 rounded-lg hover:border-indigo-500/30 transition-all group';
        div.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                        <a href="${repo.url}" target="_blank" rel="noopener noreferrer" class="font-label font-bold text-sm text-indigo-400 hover:text-indigo-300 truncate">
                            ${repo.name}
                        </a>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${
                            repo.is_private ? 'bg-tertiary/20 text-tertiary' : 'bg-white/5 text-slate-400'
                        }">
                            ${repo.is_private ? 'Private' : 'Public'}
                        </span>
                    </div>
                    <div class="flex items-center gap-4 text-[10px] text-slate-400 font-label">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">star</span>
                            ${repo.stars}
                        </span>
                        <span class="text-slate-500">${new Date(repo.last_updated).toLocaleDateString()}</span>
                    </div>
                </div>
                <button class="unlink-repo-btn opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1.5 rounded-full hover:bg-error/20 text-error" data-repo-id="${repo.repo_id}">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `;

        div.querySelector('.unlink-repo-btn')?.addEventListener('click', () => {
            this.unlinkRepository(repo.repo_id, div);
        });

        return div;
    }

    async unlinkRepository(repoId, element) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/github/linked-repos/${repoId}?user_id=${this.userId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error('Failed to unlink repository');
            }

            element.remove();
            this.showSuccess('Repository unlinked successfully');

        } catch (error) {
            this.showError(`Failed to unlink repository: ${error.message}`);
        }
    }

    async refreshRepositories() {
        try {
            this.showLoading();

            const response = await fetch(
                `${API_BASE_URL}/auth/github/refresh-repos?user_id=${this.userId}`,
                { method: 'POST' }
            );

            if (!response.ok) {
                throw new Error('Failed to refresh repositories');
            }

            this.showSuccess('Repositories refreshed successfully');
            await this.loadLinkedRepositories();

        } catch (error) {
            this.showError(`Failed to refresh repositories: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // ============ Disconnection ============
    disconnect() {
        if (confirm('Are you sure you want to disconnect from GitHub?')) {
            localStorage.removeItem('github_connected');
            localStorage.removeItem('github_username');
            localStorage.removeItem('github_avatar');

            this.isConnected = false;
            this.selectedRepos.clear();

            this.updateDisconnectedUI();
            this.showSuccess('Disconnected from GitHub');

            // Hide all sections
            document.getElementById('repo-selection-section')?.classList.add('hidden');
            document.getElementById('connected-repos-section')?.classList.add('hidden');
        }
    }

    // ============ UI State Management ============
    loadConnectedStatus() {
        const connected = localStorage.getItem('github_connected') === 'true';

        if (connected) {
            this.isConnected = true;
            const username = localStorage.getItem('github_username');
            const avatar = localStorage.getItem('github_avatar');

            const userInfo = {
                github_username: username,
                avatar_url: avatar
            };

            this.updateConnectedUI(userInfo);
            this.loadLinkedRepositories();
        }
    }

    updateConnectedUI(userInfo) {
        // Hide connect button, show disconnect
        document.getElementById('github-connect-btn')?.classList.add('hidden');
        document.getElementById('github-disconnect-btn')?.classList.remove('hidden');

        // Update status
        const statusCard = document.getElementById('github-status');
        if (statusCard) {
            statusCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        <p class="text-sm font-body text-green-400">Connected</p>
                    </div>
                    <span class="text-xs font-label text-slate-400">Active</span>
                </div>
            `;
        }

        // Show user info
        const userInfoDiv = document.getElementById('github-user-info');
        if (userInfoDiv) {
            document.getElementById('github-avatar').src = userInfo.avatar_url;
            document.getElementById('github-username').textContent = userInfo.github_username;
            userInfoDiv.classList.remove('hidden');
        }
    }

    updateDisconnectedUI() {
        // Show connect button, hide disconnect
        document.getElementById('github-connect-btn')?.classList.remove('hidden');
        document.getElementById('github-disconnect-btn')?.classList.add('hidden');

        // Update status
        const statusCard = document.getElementById('github-status');
        if (statusCard) {
            statusCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        <p class="text-sm font-body text-on-surface-variant">Not connected</p>
                    </div>
                    <span class="text-xs font-label text-slate-400">Ready to connect</span>
                </div>
            `;
        }

        // Hide user info
        document.getElementById('github-user-info')?.classList.add('hidden');
    }

    // ============ Feedback UI ============
    showLoading() {
        document.getElementById('github-loading')?.classList.remove('hidden');
        this.hideError();
        this.hideSuccess();
    }

    hideLoading() {
        document.getElementById('github-loading')?.classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('github-error');
        if (errorDiv) {
            document.getElementById('github-error-text').textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    hideError() {
        document.getElementById('github-error')?.classList.add('hidden');
    }

    showSuccess(message) {
        const successDiv = document.getElementById('github-success');
        if (successDiv) {
            document.getElementById('github-success-text').textContent = message;
            successDiv.classList.remove('hidden');

            // Auto-hide after 4 seconds
            setTimeout(() => this.hideSuccess(), 4000);
        }
    }

    hideSuccess() {
        document.getElementById('github-success')?.classList.add('hidden');
    }

    // ============ Utility ============
    generateUserId() {
        let userId = localStorage.getItem('user_id');

        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('user_id', userId);
        }

        return userId;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gitHubOAuth = new GitHubOAuth();
});
