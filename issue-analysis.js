document.addEventListener('DOMContentLoaded', () => {
    // Connect to websocket backend
    const socket = io('http://localhost:5000');
    
    // DOM Elements
    const repoInput = document.getElementById('repo-input');
    const issueInput = document.getElementById('issue-input');
    const loadBtn = document.getElementById('load-issue-btn');

    const issueHeaderLabels = document.getElementById('issue-header-labels');
    const issueTitle = document.getElementById('issue-title');

    const issueDescBox = document.getElementById('issue-description-box');
    const issueAuthorAvatar = document.getElementById('issue-author-avatar');
    const issueAuthor = document.getElementById('issue-author');
    const issueTime = document.getElementById('issue-time');
    const issueBody = document.getElementById('issue-body');

    const aiLoading = document.getElementById('ai-loading-indicator');
    const aiResponseBox = document.getElementById('ai-response-box');
    const aiAnalysisText = document.getElementById('ai-analysis-text');
    const aiCodePatch = document.getElementById('ai-code-patch');
    const aiFixSuggestion = document.getElementById('ai-fix-suggestion');
    const metaBadges = document.getElementById('meta-badges');

    let currentIssueId = null;

    // Helpers
    const timeAgo = (dateStr) => {
        const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
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

    // Load Data Flow
    loadBtn.addEventListener('click', async () => {
        const repoRaw = repoInput.value.trim();
        const issueNum = issueInput.value.trim();

        if (!repoRaw.includes('/') || !issueNum) {
            alert("Please enter a valid format: owner/repo & Issue #");
            return;
        }

        const [owner, repo] = repoRaw.split('/');
        
        // Reset UI
        issueTitle.innerText = "Loading Issue Data...";
        issueHeaderLabels.innerHTML = '';
        issueDescBox.classList.add('hidden');
        aiResponseBox.classList.add('hidden');
        aiLoading.classList.add('hidden');
        metaBadges.innerHTML = '';
        loadBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Loading...`;
        loadBtn.disabled = true;

        try {
            const res = await fetch(`http://localhost:5000/api/issue/${owner}/${repo}/${issueNum}`);
            if (!res.ok) throw new Error(await res.text());
            const issueData = await res.json();
            
            currentIssueId = issueData.issueId;

            renderIssueData(issueData.githubData);

            if (issueData.status === 'pending_analysis' || !issueData.aiAnalysis) {
                // Trigger AI
                triggerAIAnalysis(issueData.issueId);
            } else {
                // AI ALready in DB
                renderAIAnalysis(issueData.aiAnalysis);
            }
        } catch (error) {
            console.error(error);
            issueTitle.innerText = "Error Loading Issue";
            alert("Could not load: " + error.message);
        } finally {
            loadBtn.innerHTML = `<span class="material-symbols-outlined text-sm">download</span> Fetch Data`;
            loadBtn.disabled = false;
        }
    });

    const renderIssueData = (github) => {
        issueTitle.innerText = github.title;

        // Labels mapping
        issueHeaderLabels.innerHTML = github.labels.map(lbl => 
            `<span class="px-3 py-1 rounded bg-secondary/10 text-secondary text-xs font-bold font-headline border border-secondary/20 flex items-center gap-2">
                ${lbl}
            </span>`
        ).join('') + `<span class="text-on-surface-variant font-bold text-sm">Issue #${github.number}</span>`;

        issueDescBox.classList.remove('hidden');
        issueAuthor.innerText = github.author;
        issueAuthorAvatar.src = `https://github.com/${github.author}.png`;
        issueTime.innerText = timeAgo(github.createdAt);
        
        // Very basic simple markdown line breaks
        issueBody.innerHTML = github.body.replace(/\n/g, '<br/>');
    };

    const triggerAIAnalysis = async (issueId) => {
        aiLoading.classList.remove('hidden');
        
        try {
            const res = await fetch('http://localhost:5000/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueId })
            });

            if (!res.ok) throw new Error("AI failed");
            const finalData = await res.json();
            
            aiLoading.classList.add('hidden');
            renderAIAnalysis(finalData.aiAnalysis);

        } catch (e) {
            console.error(e);
            aiLoading.innerHTML = `<div class="text-error text-center text-sm ml-4">AI Processing Failed</div>`;
        }
    };

    const renderAIAnalysis = (aiData) => {
        aiResponseBox.classList.remove('hidden');
        aiAnalysisText.innerHTML = `<strong>Root Cause Hypothesis:</strong> ${aiData.root_cause}<br/><br/>${aiData.analysis}`;
        
        if (aiData.code_patch) {
            aiCodePatch.classList.remove('hidden');
            aiCodePatch.innerText = aiData.code_patch;
        } else {
            aiCodePatch.classList.add('hidden');
            aiCodePatch.innerText = '';
        }

        if (aiData.fix_suggestion) {
            // Split up bullet points roughly
            const items = aiData.fix_suggestion.split('\n').filter(Boolean);
            aiFixSuggestion.innerHTML = `<ul class="list-disc pl-5 space-y-1">` + 
                items.map(bullet => `<li>${bullet.replace(/^-/,'')}</li>`).join('') + 
            `</ul>`;
        }

        // Generate Metadata Badges dynamically
        metaBadges.innerHTML = `
             <div class="flex items-center gap-2">
                 <span class="material-symbols-outlined text-xs">folder</span> ${aiData.category || 'System'}
             </div>
             <div class="flex items-center gap-2">
                 <span class="material-symbols-outlined text-xs">sell</span> ${aiData.severity || 'Medium'} Severity
             </div>
             <div class="flex items-center gap-2">
                 <span class="material-symbols-outlined text-xs">neurology</span> ${aiData.confidence}% Confidence
             </div>
        `;
    };

    // Listen for WebSockets (for instance if route /analyze was triggering background jobs instead)
    socket.on('analysis_complete', (payload) => {
        if (payload.issueId === currentIssueId) {
            aiLoading.classList.add('hidden');
            renderAIAnalysis(payload.analysis);
        }
    });

    // Button Actions
    document.getElementById('btn-generate-pr').addEventListener('click', async (e) => {
        if(!currentIssueId) return;
        const btn = e.currentTarget;
        btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Generating...`;
        
        const res = await fetch('http://localhost:5000/api/generate-pr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issueId: currentIssueId })
        });
        const data = await res.json();
        btn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span> Success!`;
        btn.classList.add('bg-tertiary', 'text-white');
        
        if(data.url) {
            setTimeout(() => window.open(data.url, '_blank'), 1000);
        }
    });

    document.getElementById('btn-route-team').addEventListener('click', async (e) => {
        if(!currentIssueId) return;
        const btn = e.currentTarget;
        btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Routing...`;
        
        const res = await fetch('http://localhost:5000/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issueId: currentIssueId, team: 'Core Processing' })
        });
        await res.json();
        
        btn.innerHTML = `<span class="material-symbols-outlined text-sm">task_alt</span> Assigned`;
    });
});
