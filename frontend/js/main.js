/**
 * Main Application - Issue Intelligence Page
 * Handles repository context, issue analysis, and results display
 */

const API_BASE_URL = 'http://localhost:8001'; // Backend API URL

class IssueIntelligence {
    constructor() {
        this.selectedRepo = null;
        this.init();
    }

    init() {
        this.loadSelectedRepository();
        this.setupEventListeners();
        this.clearPlaceholderResults();
    }

    clearPlaceholderResults() {
        // Clear hardcoded placeholder values on page load
        const classificationResult = document.getElementById('classification-result');
        const priorityResult = document.getElementById('priority-result');
        const priorityDot = document.getElementById('priority-dot');
        const priorityPill = document.getElementById('priority-pill');
        const confidenceResult = document.getElementById('confidence-result');
        const labelsResult = document.getElementById('labels-result');
        const similarIssues = document.getElementById('similar-issues');
        const knowledgeObservation = document.getElementById('knowledge-observation');

        if (classificationResult) classificationResult.textContent = 'Awaiting Analysis';
        if (priorityResult) {
            priorityResult.textContent = 'Not Analyzed';
            priorityResult.className = 'font-label text-sm text-on-surface-variant font-bold uppercase tracking-wider';
        }
        if (priorityDot) priorityDot.className = 'h-2 w-2 rounded-full bg-on-surface-variant';
        if (priorityPill) priorityPill.className = 'inline-flex items-center gap-2 px-4 py-2 bg-surface-variant/20 border border-outline/20 rounded-full';
        if (confidenceResult) confidenceResult.textContent = '0.0';
        if (labelsResult) labelsResult.innerHTML = '<span class="text-on-surface-variant text-sm">No labels yet</span>';
        if (similarIssues) similarIssues.innerHTML = '<div class="text-center py-8 text-on-surface-variant"><p class="font-body">Analyze an issue to find similar ones</p></div>';
        if (knowledgeObservation) knowledgeObservation.innerHTML = '<p class="text-on-surface-variant">Submit an issue for AI-powered insights and recommendations.</p>';
    }

    loadSelectedRepository() {
        // Get selected repo from localStorage
        const repoData = localStorage.getItem('selected_repo');
        
        if (repoData) {
            try {
                this.selectedRepo = JSON.parse(repoData);
                this.displaySelectedRepository();
            } catch (error) {
                console.error('Error parsing selected repo:', error);
                this.hideRepositoryBanner();
            }
        } else {
            this.hideRepositoryBanner();
        }
    }

    displaySelectedRepository() {
        const banner = document.getElementById('selected-repo-banner');
        const repoNameDisplay = document.getElementById('repo-name-display');
        
        if (banner && repoNameDisplay && this.selectedRepo) {
            repoNameDisplay.textContent = this.selectedRepo.name;
            banner.classList.remove('hidden');
        }
    }

    hideRepositoryBanner() {
        const banner = document.getElementById('selected-repo-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Analyze button
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeIssue());
        }

        // Change Repository button
        const changeRepoBtn = document.getElementById('change-repo-btn');
        if (changeRepoBtn) {
            changeRepoBtn.addEventListener('click', () => this.changeRepository());
        }
    }

    changeRepository() {
        // Clear selected repo and redirect to dashboard
        localStorage.removeItem('selected_repo');
        localStorage.removeItem('selected_repo_id');
        window.location.href = 'dashboard.html';
    }

    async analyzeIssue() {
        const title = document.getElementById('issue-title')?.value || '';
        const description = document.getElementById('issue-description')?.value || '';

        // Validate inputs
        if (!title.trim() || !description.trim()) {
            this.showNotification('Please fill in both title and description', 'error');
            return;
        }

        // Show loading state
        const analyzeBtn = document.getElementById('analyze-btn');
        const originalContent = analyzeBtn.innerHTML;
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">hourglass_bottom</span> Analyzing...';

        try {
            // Prepare request data
            const requestData = {
                title: title,
                description: description
            };

            // Add repository context if selected
            if (this.selectedRepo) {
                requestData.repository = this.selectedRepo.name;
                requestData.repository_url = this.selectedRepo.url;
                requestData.is_private = this.selectedRepo.is_private;
            }

            // Call backend API
            const response = await fetch(`${API_BASE_URL}/analyze/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const result = await response.json();
            this.displayAnalysisResults(result);
            this.showNotification('Issue analyzed successfully!', 'success');

        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Failed to analyze issue. Please try again.', 'error');
        } finally {
            // Restore button state
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalContent;
        }
    }

    displayAnalysisResults(result) {
        console.log('Analysis result:', result); // Debug log
        
        // Map classification to icon and color
        const classificationMap = {
            'bug': {
                icon: 'bug_report',
                color: 'error',
                bgColor: 'error-container'
            },
            'feature': {
                icon: 'auto_awesome',
                color: 'primary',
                bgColor: 'primary-container'
            },
            'question': {
                icon: 'help',
                color: 'secondary',
                bgColor: 'secondary-container'
            }
        };

        const classification = result.label ? result.label.toLowerCase() : 'bug';
        const classConfig = classificationMap[classification] || classificationMap['bug'];

        // Update Classification icon and text
        const classificationResult = document.getElementById('classification-result');
        const classificationIcon = document.querySelector('[data-icon="bug_report"]');
        const classificationIconContainer = classificationIcon?.parentElement;
        
        if (classificationResult && result.label) {
            classificationResult.textContent = result.label.charAt(0).toUpperCase() + result.label.slice(1);
        }
        
        if (classificationIcon) {
            classificationIcon.setAttribute('data-icon', classConfig.icon);
            classificationIcon.textContent = classConfig.icon;
            classificationIcon.className = `material-symbols-outlined text-${classConfig.color} text-3xl`;
        }
        
        if (classificationIconContainer) {
            classificationIconContainer.className = `p-3 bg-${classConfig.bgColor}/20 rounded-full`;
        }

        // Update Priority with dynamic colors
        const priorityResult = document.getElementById('priority-result');
        const priorityDot = document.getElementById('priority-dot');
        const priorityPill = document.getElementById('priority-pill');

        // Add critical to the map
        const priorityColorMap = {
            'critical': { color: 'error', bgColor: 'error-container' },
            'high':     { color: 'error', bgColor: 'error-container' },
            'medium':   { color: 'tertiary', bgColor: 'tertiary-container' },
            'low':      { color: 'secondary', bgColor: 'secondary-container' }
        };

        const priority = result.priority ? result.priority.toLowerCase() : 'medium';
        const priorityConfig = priorityColorMap[priority] || priorityColorMap['medium'];

        if (priorityResult && result.priority) {
            priorityResult.textContent = result.priority.charAt(0).toUpperCase() + result.priority.slice(1) + ' Severity';
            priorityResult.className = `font-label text-sm text-${priorityConfig.color} font-bold uppercase tracking-wider`;
        }
        if (priorityDot) {
            priorityDot.className = `h-2 w-2 rounded-full bg-${priorityConfig.color}`;
        }
        if (priorityPill) {
            priorityPill.className = `inline-flex items-center gap-2 px-4 py-2 bg-${priorityConfig.bgColor}/20 border border-${priorityConfig.color}/20 rounded-full`;
        }

        // Update Confidence (backend returns object with classification and priority)
        const confidenceResult = document.getElementById('confidence-result');
        if (confidenceResult && result.confidence) {
            const confValue = result.confidence.classification || result.confidence.priority || 0;
            confidenceResult.textContent = (confValue * 100).toFixed(1);
        }

        // Update Labels - use backend labels first, fallback to generating from classification
        const labelsResult = document.getElementById('labels-result');
        if (labelsResult && result.label) {
            const backendLabels = (result.labels && result.labels.length > 0) ? result.labels : [result.label];
            if (result.priority === 'high' || result.priority === 'critical') backendLabels.push('urgent');
            if (this.selectedRepo) backendLabels.push(this.selectedRepo.name.split('-')[0]);
            const uniqueLabels = [...new Set(backendLabels)];
            
            labelsResult.innerHTML = uniqueLabels.map(label => 
                `<span class="px-4 py-1.5 bg-secondary-container/30 rounded-full text-secondary text-xs font-label font-bold uppercase tracking-wider">${label}</span>`
            ).join('');
        }

        // Update Similar Issues
        const similarIssues = document.getElementById('similar-issues');
        if (similarIssues && result.similar_issues && Array.isArray(result.similar_issues)) {
            if (result.similar_issues.length === 0) {
                similarIssues.innerHTML = `
                    <div class="text-center py-8 text-on-surface-variant">
                        <span class="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                        <p class="font-body text-sm">No similar issues found yet. This is the first of its kind!</p>
                    </div>
                `;
            } else {
                similarIssues.innerHTML = result.similar_issues.map((issue, index) => {
                    const similarity = issue.similarity_score || 0;
                    const matchPercentage = (similarity * 100).toFixed(0);
                    const issueId = issue.id ? issue.id.substring(0, 8) : (index + 1024);
                    
                    return `
                        <div class="group bg-surface-container-lowest rounded-DEFAULT p-4 flex items-center justify-between hover:bg-surface-variant/40 transition-all cursor-pointer">
                            <div class="flex items-center gap-4">
                                <div class="font-label text-primary font-bold">#${issueId}</div>
                                <h4 class="font-body font-medium text-on-surface group-hover:text-primary transition-colors">${issue.title || 'Similar Issue'}</h4>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                    <span class="font-label text-[10px] text-primary font-bold uppercase">${matchPercentage}% Match</span>
                                </div>
                                <span class="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Update duplicates count
            const duplicatesCount = document.getElementById('duplicates-count');
            if (duplicatesCount) {
                duplicatesCount.textContent = `${result.similar_issues.length} potential duplicates found`;
            }
        }

        // Update Knowledge Observation (use reason from backend)
        const knowledgeObservation = document.getElementById('knowledge-observation');
        if (knowledgeObservation) {
            const reason = result.reason || 'Analysis complete. Issue has been classified and prioritized.';
            knowledgeObservation.innerHTML = `<p class="mb-2">${reason}</p>`;
            
            // Add repo context if available
            if (this.selectedRepo) {
                knowledgeObservation.innerHTML += `<p class="mt-4"><strong>Analysis Context:</strong> This analysis was performed using the repository <span class="text-green-400">${this.selectedRepo.name}</span> as context.</p>`;
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';

        notification.className = `fixed top-6 right-6 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-pulse`;
        notification.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <span class="font-label font-bold">${message}</span>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.issueIntelligence = new IssueIntelligence();
});

// Make globally available for debugging
window.IssueIntelligence = IssueIntelligence;
