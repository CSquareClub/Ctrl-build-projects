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
            const response = await fetch(`${API_BASE_URL}/analyze`, {
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
        // Update Classification
        const classificationResult = document.getElementById('classification-result');
        if (classificationResult && result.classification) {
            classificationResult.textContent = result.classification;
        }

        // Update Priority
        const priorityResult = document.getElementById('priority-result');
        if (priorityResult && result.priority) {
            priorityResult.textContent = result.priority;
        }

        // Update Confidence
        const confidenceResult = document.getElementById('confidence-result');
        if (confidenceResult && result.confidence) {
            confidenceResult.textContent = result.confidence;
        }

        // Update Labels
        const labelsResult = document.getElementById('labels-result');
        if (labelsResult && result.labels && Array.isArray(result.labels)) {
            labelsResult.innerHTML = result.labels.map(label => 
                `<span class="px-4 py-1.5 bg-secondary-container/30 rounded-full text-secondary text-xs font-label font-bold uppercase tracking-wider">${label}</span>`
            ).join('');
        }

        // Update Similar Issues
        const similarIssues = document.getElementById('similar-issues');
        if (similarIssues && result.similar_issues && Array.isArray(result.similar_issues)) {
            similarIssues.innerHTML = result.similar_issues.map((issue, index) => `
                <div class="group bg-surface-container-lowest rounded-DEFAULT p-4 flex items-center justify-between hover:bg-surface-variant/40 transition-all cursor-pointer">
                    <div class="flex items-center gap-4">
                        <div class="font-label text-primary font-bold">#${issue.id || (index + 1024)}</div>
                        <h4 class="font-body font-medium text-on-surface group-hover:text-primary transition-colors">${issue.title || 'Similar Issue'}</h4>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            <span class="font-label text-[10px] text-primary font-bold uppercase">${issue.match_percentage || 94}% Match</span>
                        </div>
                        <span class="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
                    </div>
                </div>
            `).join('');

            // Update duplicates count
            const duplicatesCount = document.getElementById('duplicates-count');
            if (duplicatesCount) {
                duplicatesCount.textContent = `${result.similar_issues.length} potential duplicates found`;
            }
        }

        // Update Knowledge Observation
        const knowledgeObservation = document.getElementById('knowledge-observation');
        if (knowledgeObservation && result.observation) {
            knowledgeObservation.innerHTML = result.observation;
        }

        // Add repo context to knowledge observation if available
        if (this.selectedRepo && knowledgeObservation) {
            const repoContext = `<br><br><strong>Analysis Context:</strong> This analysis was performed using the repository <span class="text-green-400">${this.selectedRepo.name}</span> as context.`;
            knowledgeObservation.innerHTML += repoContext;
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
