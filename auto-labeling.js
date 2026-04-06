document.addEventListener('DOMContentLoaded', () => {
    // Configurations
    const GITHUB_API_URL = 'https://api.github.com/repos/facebook/react/issues?per_page=50';
    let currentFilter = 'incoming';

    // State Management
    let state = {
        incoming: [],
        approved: [],
        review: [],
        stats: {
            totalActions: 0,
            correctActions: 0,
            categories: {
                bug: { total: 0, actions: 0 },
                feature: { total: 0, actions: 0 },
                documentation: { total: 0, actions: 0 },
                question: { total: 0, actions: 0 }
            }
        }
    };

    // Load state from localStorage
    const savedState = localStorage.getItem('openissue_auto_label_state');
    if (savedState) {
        state = JSON.parse(savedState);
    }

    const saveState = () => {
        localStorage.setItem('openissue_auto_label_state', JSON.stringify(state));
    };

    // AI Classification Engine
    const classifyIssue = (issue) => {
        const text = (issue.title + ' ' + (issue.body || '')).toLowerCase();
        let category = 'question';
        let component = 'general';
        let priority = 'Medium';
        let confidence = Math.floor(Math.random() * (98 - 80 + 1)) + 80;

        if (text.includes('error') || text.includes('fail') || text.includes('crash') || text.includes('bug')) {
            category = 'bug';
            component = text.includes('auth') ? 'auth' : (text.includes('api') ? 'api' : 'frontend');
            priority = text.includes('crash') ? 'High' : 'Medium';
        } else if (text.includes('add') || text.includes('implement') || text.includes('feature')) {
            category = 'feature';
            component = 'backend';
            priority = 'Low';
        } else if (text.includes('docs') || text.includes('readme') || text.includes('documentation')) {
            category = 'documentation';
            component = 'frontend';
            priority = 'Low';
        } else if (text.includes('slow') || text.includes('performance')) {
            category = 'bug';
            component = 'performance';
            priority = 'High';
        }

        return {
            ...issue,
            ai: { category, component, priority, confidence }
        };
    };

    const processRawIssue = (raw, source) => {
        return classifyIssue({
            id: source === 'github' ? raw.id : (raw.id || 'usr_' + Date.now()),
            number: raw.number || Math.floor(Math.random() * 10000),
            title: raw.title || 'Untitled Issue',
            body: raw.body || '',
            author: source === 'github' ? (raw.user ? raw.user.login : 'unknown') : 'user',
            createdAt: source === 'github' ? new Date(raw.created_at).getTime() : (raw.createdAt || Date.now()),
            source: source
        });
    };

    // Data Fetching
    const fetchIssues = async () => {
        if (state.incoming.length > 0) return; // Only fetch if we need to

        try {
            const res = await fetch(GITHUB_API_URL);
            let githubIssues = [];
            if (res.ok) {
                const data = await res.json();
                githubIssues = data.map(i => processRawIssue(i, 'github'));
            }

            const userIssuesRaw = JSON.parse(localStorage.getItem('openissue_user_issues') || '[]');
            const userIssues = userIssuesRaw.map(i => processRawIssue(i, 'user'));

            let combined = [...userIssues, ...githubIssues];
            
            // Filter out ones we already processed
            const processedIds = new Set([...state.approved.map(i => i.id), ...state.review.map(i => i.id)]);
            combined = combined.filter(i => !processedIds.has(i.id));

            state.incoming = combined;
            updateStatsBaseline();
            saveState();
            renderIssues();
        } catch (e) {
            console.error('Failed to fetch issues:', e);
        }
    };

    const updateStatsBaseline = () => {
        // Recalculate baseline totals from incoming + processed
        const all = [...state.incoming, ...state.approved, ...state.review];
        ['bug', 'feature', 'documentation', 'question'].forEach(cat => {
            state.stats.categories[cat] = { total: 0, actions: state.stats.categories[cat]?.actions || 0 };
        });
        all.forEach(i => {
            if (state.stats.categories[i.ai.category]) {
                state.stats.categories[i.ai.category].total++;
            }
        });
    };

    // Actions
    window.handleIssueAction = (id, action) => {
        const issueIndex = state.incoming.findIndex(i => i.id === id);
        if (issueIndex > -1) {
            const issue = state.incoming.splice(issueIndex, 1)[0];
            
            state.stats.totalActions++;
            if (state.stats.categories[issue.ai.category]) {
                state.stats.categories[issue.ai.category].actions++;
            }

            if (action === 'apply') {
                state.approved.unshift(issue);
                state.stats.correctActions++; // Apply means AI was correct
            } else {
                state.review.unshift(issue);
            }

            saveState();
            renderIssues();
            updateStatsUI();
        }
    };

    // Rendering
    const timeAgo = (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "just now";
    };

    const getCategoryStyles = (category) => {
        switch(category) {
            case 'bug': return { bg: 'bg-error/10', text: 'text-error', border: 'border-error/20', dot: 'bg-error' };
            case 'feature': return { bg: 'bg-[#49339d]/40', text: 'text-[#c8bbff]', border: 'border-[#49339d]', dot: 'bg-[#c8bbff]' };
            case 'documentation': return { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20', dot: 'bg-tertiary' };
            default: return { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20', dot: 'bg-secondary' };
        }
    };

    const renderCard = (issue) => {
        const cStyles = getCategoryStyles(issue.ai.category);
        let borderClass = '';
        if (issue.ai.category === 'bug') borderClass = 'bg-error';
        else if (issue.ai.category === 'feature') borderClass = 'bg-[#c8bbff]';
        else borderClass = 'bg-tertiary';

        let actionButtons = '';
        if (currentFilter === 'incoming') {
            actionButtons = `
                <button onclick="handleIssueAction('${issue.id}', 'reject')" class="p-2 md:px-4 rounded-lg bg-white/5 hover:bg-error/20 hover:text-error transition-colors flex-1 lg:flex-none flex justify-center">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
                <button onclick="handleIssueAction('${issue.id}', 'apply')" class="p-2 md:px-6 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-dim transition-colors flex-1 lg:flex-none flex items-center justify-center gap-2">
                    Apply
                </button>
            `;
        } else {
            actionButtons = `<span class="text-xs font-bold text-on-surface-variant uppercase">${currentFilter === 'approved' ? 'Auto-Approved' : 'Needs Review'}</span>`;
        }

        return `
            <div class="glass-row p-6 rounded-xl border border-white/5 relative group overflow-hidden pl-10 md:pl-6 animate-[fade-in-up_0.3s_ease-out]">
                <div class="absolute left-0 top-0 bottom-0 w-1 ${borderClass} opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div class="flex flex-col lg:flex-row justify-between gap-6 md:gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-sm font-bold text-on-surface">#${issue.number}</span>
                            <span class="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            <span class="text-xs text-on-surface-variant">Opened ${timeAgo(issue.createdAt)} by <span class="text-primary cursor-pointer hover:underline">@${issue.author}</span></span>
                        </div>
                        <h3 class="text-lg font-headline font-bold mb-3 hover:text-primary transition-colors cursor-pointer truncate">${issue.title}</h3>
                        
                        <!-- Proposed Tag Groups -->
                        <div class="flex flex-wrap gap-2 items-center">
                            <span class="material-symbols-outlined text-primary text-sm">robot_2</span>
                            <span class="text-xs font-bold text-on-surface-variant mr-1">AI Suggestion:</span>
                            
                            <span class="px-2.5 py-1 rounded-md ${cStyles.bg} ${cStyles.text} text-xs font-bold border ${cStyles.border} flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full ${cStyles.dot}"></span> ${issue.ai.category}
                            </span>
                            
                            <span class="px-2.5 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-bold border border-secondary/20 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> ${issue.ai.component}
                            </span>
                            
                            <span class="px-2.5 py-1 rounded-md bg-white/5 text-on-surface text-xs font-bold border border-white/10 flex items-center gap-1">
                                priority: ${issue.ai.priority}
                            </span>
                        </div>
                    </div>
                    <div class="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 pt-4 lg:pt-0 border-white/5">
                        <div class="flex items-center gap-2 mb-0 lg:mb-3">
                            <span class="text-xl font-headline font-bold text-on-surface text-transparent bg-clip-text bg-gradient-to-r ${issue.ai.confidence > 90 ? 'from-primary to-tertiary' : 'from-secondary to-primary'}">${issue.ai.confidence}%</span>
                            <span class="material-symbols-outlined ${issue.ai.confidence > 90 ? 'text-primary' : 'text-secondary'} text-sm" style="font-variation-settings: 'FILL' 1;">
                                ${issue.ai.confidence > 90 ? 'check_circle' : 'help'}
                            </span>
                        </div>
                        <div class="flex gap-2 w-full lg:w-auto">
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const renderIssues = () => {
        const container = document.getElementById('issues-container');
        let issuesToRender = [];

        if (currentFilter === 'incoming') issuesToRender = state.incoming;
        else if (currentFilter === 'review') issuesToRender = state.review;
        else if (currentFilter === 'approved') issuesToRender = state.approved;

        if (issuesToRender.length === 0) {
            container.innerHTML = `
                <div class="glass-card p-8 rounded-xl border border-white/5 text-center">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-4">all_inbox</span>
                    <p class="text-on-surface font-bold">No issues found</p>
                    <p class="text-sm text-on-surface-variant mt-2">Queue is clear for this filter.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = issuesToRender.map(renderCard).join('');
    };

    // Filter Buttons logic
    const filterButtons = document.querySelectorAll('#filter-buttons button');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update UI state
            filterButtons.forEach(b => {
                b.classList.remove('bg-white/5', 'text-on-surface', 'border-primary/30', 'shadow-[0_0_15px_rgba(163,166,255,0.15)]');
                b.classList.add('text-on-surface-variant', 'border-transparent');
            });
            e.target.classList.add('bg-white/5', 'text-on-surface', 'border-primary/30', 'shadow-[0_0_15px_rgba(163,166,255,0.15)]');
            e.target.classList.remove('text-on-surface-variant', 'border-transparent');

            currentFilter = e.target.getAttribute('data-filter');
            renderIssues();
        });
    });

    // Stats UI Logic
    const animatePercent = (el, val) => {
        if (!el) return;
        const current = parseFloat((el.innerText || '0').replace('%', ''));
        const diff = val - current;
        if (Math.abs(diff) < 0.1) return;
        
        let startTimestamp = null;
        const duration = 500;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            el.innerText = (current + (diff * progress)).toFixed(1) + '%';
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    };

    const updateStatsUI = () => {
        const accuracy = state.stats.totalActions === 0 ? 0 : 
            (state.stats.correctActions / state.stats.totalActions) * 100;
        animatePercent(document.getElementById('global-accuracy'), accuracy);

        const updateCategory = (catId, catKey) => {
            const cat = state.stats.categories[catKey];
            const pct = cat && cat.total > 0 ? (cat.actions / cat.total) * 100 : 0;
            const pctText = document.getElementById(`stat-${catId}-pct`);
            if (pctText) pctText.innerText = Math.round(pct) + '%';
            const bar = document.getElementById(`stat-${catId}-bar`);
            if (bar) bar.style.width = Math.round(pct) + '%';
        };

        updateCategory('bug', 'bug');
        updateCategory('feature', 'feature');
        updateCategory('docs', 'documentation');

        // Concept drift roughly based on low confidence
        const lowConf = state.incoming.filter(i => i.ai.confidence < 85);
        const driftBox = document.getElementById('concept-drift-box');
        const driftMsg = document.getElementById('concept-drift-msg');
        if (lowConf.length > 2 && driftBox) {
            driftBox.classList.remove('hidden');
            if (driftMsg) driftMsg.innerText = `Recent issues show high uncertainty patterns in ${lowConf[0].ai.category} processing. Retraining recommended.`;
        }
    };

    // Real-Time Interval Simulator
    setInterval(() => {
        // Simulated new issue arriving
        if (Math.random() > 0.6) {
            const simulatedIssue = processRawIssue({
                id: 'sim_' + Date.now(),
                number: Math.floor(Math.random() * 9000) + 1000,
                title: 'Simulated issue ' + Date.now().toString(16),
                body: ['crash on load', 'need new api endpoint', 'update readme syntax', 'very slow query'][Math.floor(Math.random() * 4)],
                user: { login: 'ai_sim_user' },
                created_at: new Date().toISOString()
            }, 'github-sim');

            state.incoming.unshift(simulatedIssue);
            updateStatsBaseline();
            saveState();

            if (currentFilter === 'incoming') {
                renderIssues();
            }
        }
    }, 8000);

    // Initialization
    fetchIssues().then(() => {
        updateStatsUI();
        // Fallback if local storage didn't initialize ui well
        setTimeout(updateStatsUI, 100);
    });

    // Add CSS animations required
    if (!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
});
