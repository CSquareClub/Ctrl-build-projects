/**
 * Dashboard - GitHub Repositories
 * Shows login prompt if not authenticated, fetches real repos after OAuth login
 */

const API_BASE_URL = 'http://localhost:8001';

class Dashboard {
    constructor() {
        this.sessionId = null;
        this.repos = [];
        this.init();
    }

    init() {
        // Pick up session from URL after OAuth redirect
        const params = new URLSearchParams(window.location.search);
        const sessionFromUrl = params.get('session');
        if (sessionFromUrl) {
            localStorage.setItem('session_id', sessionFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        this.sessionId = localStorage.getItem('session_id');

        document.getElementById('refresh-linked-repos-btn')
            ?.addEventListener('click', () => this.loadRepos());

        // Always show the linked-repos section
        document.getElementById('linked-repos-section')?.classList.remove('hidden');

        if (this.sessionId) {
            this.loadRepos();
        } else {
            this.showLoginPrompt();
        }
    }

    async loadRepos() {
        this.showLoading();

        try {
            // Verify session
            const authRes = await fetch(`${API_BASE_URL}/auth/check?session=${this.sessionId}`);
            const authData = await authRes.json();

            if (!authData.authenticated) {
                localStorage.removeItem('session_id');
                this.sessionId = null;
                this.showLoginPrompt();
                return;
            }

            // Update nav with GitHub username/avatar
            this.updateUserUI(authData.user);

            // Fetch real repos
            const repoRes = await fetch(`${API_BASE_URL}/auth/repos?session=${this.sessionId}`);
            if (!repoRes.ok) throw new Error('Failed to fetch repositories');

            const data = await repoRes.json();
            this.repos = data.repos || [];

            if (this.repos.length === 0) {
                this.showEmptyState();
            } else {
                this.renderRepos();
            }

        } catch (err) {
            console.error(err);
            this.showError('Failed to load repositories. Please try again.');
        }
    }

    renderRepos() {
        const grid = document.getElementById('linked-repos-grid');
        const empty = document.getElementById('linked-repos-empty');
        const loginPrompt = document.getElementById('login-prompt');

        loginPrompt?.classList.add('hidden');
        empty?.classList.add('hidden');
        grid.innerHTML = '';

        this.repos.forEach(repo => grid.appendChild(this.createRepoCard(repo)));
    }

    createRepoCard(repo) {
        const div = document.createElement('div');
        div.className = 'group bg-[#111827] border border-white/10 rounded-lg p-6 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-indigo-500/30';

        const lastUpdated = repo.last_updated ? new Date(repo.last_updated).toLocaleDateString() : '—';
        const privacyBadge = repo.is_private
            ? '<span class="bg-tertiary/20 text-tertiary text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Private</span>'
            : '<span class="bg-white/5 text-slate-400 text-[10px] font-label px-2 py-0.5 rounded-full uppercase tracking-wider">Public</span>';
        const langBadge = repo.language
            ? `<span class="bg-secondary-container/30 text-secondary text-[10px] font-label font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">${repo.language}</span>`
            : '';

        div.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-indigo-400">folder</span>
                    </div>
                    <div class="flex gap-2 flex-wrap justify-end">
                        ${langBadge}
                        ${privacyBadge}
                    </div>
                </div>
                <a href="${repo.url}" target="_blank" rel="noopener noreferrer"
                   class="font-headline font-bold text-xl mb-2 text-white group-hover:text-indigo-400 transition-colors hover:underline block">
                    ${repo.name}
                </a>
                <p class="text-on-surface-variant text-sm font-body line-clamp-2 mb-6">
                    ${repo.description || 'No description provided.'}
                </p>
            </div>
            <div class="flex items-center justify-between pt-6 border-t border-white/5">
                <div class="flex items-center gap-4 text-xs font-label text-slate-400">
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs">star</span>
                        ${repo.stars}
                    </span>
                    <span>${lastUpdated}</span>
                </div>
                <div class="flex gap-2">
                    <button class="use-repo-btn px-3 py-2 rounded-full bg-green-600/10 text-green-400 font-headline font-bold text-xs hover:bg-green-600 hover:text-white transition-all active:scale-95">
                        USE
                    </button>
                    <a href="${repo.url}" target="_blank" rel="noopener noreferrer"
                       class="px-4 py-2 rounded-full bg-indigo-600/10 text-indigo-400 font-headline font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all active:scale-95">
                        View
                    </a>
                </div>
            </div>
        `;

        div.querySelector('.use-repo-btn').addEventListener('click', () => this.selectRepo(repo));
        return div;
    }

    selectRepo(repo) {
        localStorage.setItem('selected_repo', JSON.stringify({
            id: repo.id,
            name: repo.name,
            url: repo.url,
            is_private: repo.is_private,
            full_name: repo.full_name,
        }));

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50';
        toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span class="font-label font-bold">Using: ${repo.name}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => { toast.remove(); window.location.href = 'home.html'; }, 800);
    }

    showLoading() {
        document.getElementById('login-prompt')?.classList.add('hidden');
        document.getElementById('linked-repos-empty')?.classList.add('hidden');
        document.getElementById('linked-repos-grid').innerHTML = `
            <div class="col-span-full text-center py-12">
                <span class="material-symbols-outlined text-3xl text-on-surface-variant animate-spin">hourglass_top</span>
                <p class="text-on-surface-variant mt-4 font-body">Loading your repositories...</p>
            </div>`;
    }

    showLoginPrompt() {
        document.getElementById('linked-repos-grid').innerHTML = '';
        document.getElementById('linked-repos-empty')?.classList.add('hidden');
        document.getElementById('login-prompt')?.classList.remove('hidden');
    }

    showEmptyState() {
        document.getElementById('linked-repos-grid').innerHTML = '';
        document.getElementById('login-prompt')?.classList.add('hidden');
        document.getElementById('linked-repos-empty')?.classList.remove('hidden');
    }

    showError(msg) {
        document.getElementById('linked-repos-grid').innerHTML = `
            <div class="col-span-full text-center py-12">
                <span class="material-symbols-outlined text-3xl text-error">error</span>
                <p class="text-error mt-4 font-body">${msg}</p>
                <button onclick="window.dashboard.loadRepos()"
                    class="mt-4 px-6 py-2 rounded-full bg-indigo-600/20 text-indigo-400 font-label text-sm hover:bg-indigo-600 hover:text-white transition-all">
                    Retry
                </button>
            </div>`;
    }

    updateUserUI(user) {
        if (!user) return;
        const avatar = document.querySelector('nav img[alt="User profile avatar"]');
        if (avatar && user.avatar_url) avatar.src = user.avatar_url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
