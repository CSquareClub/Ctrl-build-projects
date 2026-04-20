/**
 * Dashboard - GitHub Repositories
 * Not logged in → shows Sign in with GitHub
 * Logged in → fetches and renders real GitHub repos
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

        // Search filter
        document.getElementById('repo-search')
            ?.addEventListener('input', (e) => this.filterRepos(e.target.value));

        if (this.sessionId) {
            this.loadRepos();
        }
        // else: login-prompt is visible by default
    }

    async loadRepos() {
        this.showLoading();

        try {
            const authRes = await fetch(`${API_BASE_URL}/auth/check?session=${this.sessionId}`);
            const authData = await authRes.json();

            if (!authData.authenticated) {
                localStorage.removeItem('session_id');
                this.sessionId = null;
                this.showLoginPrompt();
                return;
            }

            this.updateUserUI(authData.user);

            const repoRes = await fetch(`${API_BASE_URL}/auth/repos?session=${this.sessionId}`);
            if (!repoRes.ok) throw new Error('Failed to fetch repositories');

            const data = await repoRes.json();
            this.repos = data.repos || [];

            if (this.repos.length === 0) {
                this.showEmptyState();
            } else {
                this.renderRepos(this.repos);
            }

        } catch (err) {
            console.error(err);
            this.showError('Failed to load repositories. Please try again.');
        }
    }

    filterRepos(query) {
        if (!this.repos.length) return;
        const filtered = query.trim()
            ? this.repos.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || (r.description || '').toLowerCase().includes(query.toLowerCase()))
            : this.repos;
        this.renderRepos(filtered);
    }

    renderRepos(repos) {
        document.getElementById('login-prompt')?.classList.add('hidden');
        document.getElementById('repos-empty')?.classList.add('hidden');

        const grid = document.getElementById('main-repos-grid');
        grid.classList.remove('hidden');
        grid.innerHTML = '';

        repos.forEach(repo => grid.appendChild(this.createRepoCard(repo)));

        // Add "Add Repository" placeholder at end
        const addCard = document.createElement('div');
        addCard.className = 'group border-2 border-dashed border-white/5 rounded-lg p-6 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/5 hover:border-indigo-500/50 cursor-pointer';
        addCard.innerHTML = `
            <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                <span class="material-symbols-outlined">add</span>
            </div>
            <span class="font-headline font-bold text-on-surface group-hover:text-indigo-400">Add Repository</span>
            <p class="text-slate-500 text-xs font-label mt-1">Import from GitHub or GitLab</p>
        `;
        grid.appendChild(addCard);
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
                <h3 class="font-headline font-bold text-xl mb-2 text-white group-hover:text-indigo-400 transition-colors">
                    ${repo.name}
                </h3>
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
        document.getElementById('repos-empty')?.classList.add('hidden');
        const grid = document.getElementById('main-repos-grid');
        grid.classList.remove('hidden');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <span class="material-symbols-outlined text-3xl text-on-surface-variant animate-spin">hourglass_top</span>
                <p class="text-on-surface-variant mt-4 font-body">Loading your repositories...</p>
            </div>`;
    }

    showLoginPrompt() {
        document.getElementById('main-repos-grid')?.classList.add('hidden');
        document.getElementById('repos-empty')?.classList.add('hidden');
        document.getElementById('login-prompt')?.classList.remove('hidden');
    }

    showEmptyState() {
        document.getElementById('main-repos-grid')?.classList.add('hidden');
        document.getElementById('login-prompt')?.classList.add('hidden');
        document.getElementById('repos-empty')?.classList.remove('hidden');
    }

    showError(msg) {
        const grid = document.getElementById('main-repos-grid');
        grid.classList.remove('hidden');
        grid.innerHTML = `
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
        const avatar = document.getElementById('nav-avatar');
        if (avatar && user.avatar_url) avatar.src = user.avatar_url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
