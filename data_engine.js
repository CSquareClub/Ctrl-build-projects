/**
 * OpenIssue - Dynamic Data Engine (V2 - Strict Architecture)
 * Unified data store for Github API + User Submitted Issues
 */

window.OpenIssueSystem = {
    state: {
        githubIssues: [],
        userIssues: [],
        combinedIssues: []
    },
    
    config: {
        githubEndpoint: 'https://api.github.com/repos/microsoft/vscode/issues?per_page=30',
        updateIntervalMs: 8000
    },

    init: async function() {
        console.log("Initializing OpenIssue Live AI Workspace...");
        
        // 1. Fetch GitHub Data
        await this.fetchGithubIssues();
        
        // 2. Load Local Data
        this.loadUserIssues();
        
        // 3. Merge and Initial Calc
        this.mergeAndCalculate();
        
        // 4. Start Simulation Engine
        this.startSimulationEngine();
    },

    fetchGithubIssues: async function() {
        try {
            const res = await fetch(this.config.githubEndpoint);
            if (res.ok) {
                const data = await res.json();
                this.state.githubIssues = data.map(issue => this.processIssue(issue, 'github'));
            } else {
                console.warn('API limit hit. Generating mock github issues.');
                this.state.githubIssues = this.generateMocks(30, 'github');
            }
        } catch (e) {
            console.error('Failed to fetch github issues:', e);
            this.state.githubIssues = this.generateMocks(30, 'github');
        }
    },

    loadUserIssues: function() {
        this.state.userIssues = JSON.parse(localStorage.getItem('openissue_user_issues') || '[]');
    },

    processIssue: function(raw, source) {
        // AI processing simulation
        const title = raw.title || '';
        const body = raw.body || '';
        const lowerStr = (title + " " + body).toLowerCase();
        
        let classification = 'Feature';
        let priority = 'Medium';
        let label = 'general';

        // Keywords rules
        if (lowerStr.includes('bug') || lowerStr.includes('error') || lowerStr.includes('fail') || lowerStr.includes('issue')) {
            classification = 'Bug';
            label = 'frontend';
            if (lowerStr.includes('crash') || lowerStr.includes('urgent') || lowerStr.includes('exception') || lowerStr.includes('fatal')) {
                priority = 'High';
                label = 'backend';
            } else {
                priority = 'Medium';
            }
        }
        if (lowerStr.includes('how to') || lowerStr.includes('question') || lowerStr.includes('help')) {
            classification = 'Question';
            priority = 'Low';
        }
        if (lowerStr.includes('security') || lowerStr.includes('vuln') || lowerStr.includes('exploit')) {
            classification = 'Bug';
            priority = 'High';
            label = 'security';
        }

        return {
            id: source === 'github' ? raw.id : raw.id,
            title: title,
            classification: classification,
            priority: priority,
            label: label,
            isDuplicate: Math.random() < 0.1, // 10% simulated duplicate
            source: source,
            createdAt: source === 'github' ? new Date(raw.created_at).getTime() : raw.createdAt
        };
    },

    generateMocks: function(count, source) {
        const arr = [];
        for(let i=0; i<count; i++) {
            arr.push(this.processIssue({
                id: Math.floor(Math.random() * 1000000),
                title: `Simulated VSCode Issue #${Math.floor(Math.random() * 1000)}`,
                created_at: new Date().toISOString()
            }, source));
        }
        return arr;
    },

    addUserIssue: function(title, description) {
        const newRaw = {
            id: 'usr_' + Date.now(),
            title: title,
            body: description,
            createdAt: Date.now()
        };
        const processed = this.processIssue(newRaw, 'user');
        
        this.state.userIssues.unshift(processed);
        localStorage.setItem('openissue_user_issues', JSON.stringify(this.state.userIssues));
        
        this.mergeAndCalculate();
        
        // Dispatch UI event for live stream
        this.logToStream(`New issue reported: "${title.substring(0, 20)}..."`, 'auto_fix_high', 'primary');
        setTimeout(() => {
            this.logToStream(`AI classified issue as ${processed.classification} [${processed.priority}]`, 'neurology', 'secondary');
        }, 1500);

        return processed;
    },

    mergeAndCalculate: function() {
        // Merge
        this.state.combinedIssues = [...this.state.userIssues, ...this.state.githubIssues].sort((a,b) => b.createdAt - a.createdAt);
        
        // Metrics
        const total = this.state.combinedIssues.length;
        const highPriorityCount = this.state.combinedIssues.filter(i => i.priority === 'High').length;
        const duplicatesCount = this.state.combinedIssues.filter(i => i.isDuplicate).length;
        // Let's interpret 'unlabeled' as having 'general' label or dynamically random for demo purposes
        const unlabeledCount = this.state.combinedIssues.filter(i => i.label === 'general').length;

        // Chart Data (Type Distribution)
        const typeDist = { frontend: 0, backend: 0, security: 0, general: 0 };
        const priorityDist = { High: 0, Medium: 0, Low: 0 };
        
        this.state.combinedIssues.forEach(i => { 
            if(typeDist[i.label] !== undefined) typeDist[i.label]++;
            if(priorityDist[i.priority] !== undefined) priorityDist[i.priority]++;
        });

        // Build Payload
        const payload = {
            total, 
            highPriority: highPriorityCount, 
            duplicates: duplicatesCount, 
            unlabeled: unlabeledCount,
            distribution: typeDist,
            priorityDist: priorityDist,
            latestIssues: this.state.combinedIssues.slice(0, 10)
        };

        window.dispatchEvent(new CustomEvent('openissue-sync', { detail: payload }));
    },

    startSimulationEngine: function() {
        setInterval(() => {
            // Simulate random incoming issues or AI recalculations
            let changed = false;
            
            if (Math.random() < 0.3 && this.state.githubIssues.length > 0) {
                // Random issue becomes a duplicate or gets labeled
                const rndIdx = Math.floor(Math.random() * this.state.githubIssues.length);
                const issue = this.state.githubIssues[rndIdx];
                
                if (!issue.isDuplicate && Math.random() < 0.5) {
                    issue.isDuplicate = true;
                    changed = true;
                    this.logToStream(`Duplicate detected: semantic match for #${issue.id}`, 'content_copy', 'error');
                } else if (issue.label === 'general') {
                    const labels = ['frontend', 'backend', 'security'];
                    issue.label = labels[Math.floor(Math.random() * labels.length)];
                    changed = true;
                    this.logToStream(`Auto-labeled #${issue.id} as ${issue.label}`, 'label_important', 'tertiary');
                }
            }

            if (changed) {
                this.mergeAndCalculate();
            } else {
                // Just trigger a soft sync to ensure charts feel alive
                window.dispatchEvent(new CustomEvent('openissue-soft-sync'));
            }
        }, this.config.updateIntervalMs);
    },

    logToStream: function(message, iconName, colorClass) {
        window.dispatchEvent(new CustomEvent('openissue-stream-log', {
            detail: { message, iconName, colorClass, time: Date.now() }
        }));
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.OpenIssueSystem.init();
});
