// Global Authentication Enforcement
(function() {
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
    const sessionStr = localStorage.getItem('openissue_session') || sessionStorage.getItem('openissue_session');
    
    if (!sessionStr && !isAuthPage) {
        window.location.href = 'login.html';
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    
    // Inject Logout Button and User Data into Dashboard Pages
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
    if (!isAuthPage) {
        const sidebarNav = document.querySelector('aside#sidebar nav');
        if (sidebarNav) {
            // Add spacing between main nav and logout
            const logoutContainer = document.createElement('div');
            logoutContainer.className = 'mt-6 pt-4 border-t border-white/5 space-y-2';
            logoutContainer.innerHTML = `
                <a id="logout-btn" class="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-error hover:bg-error/10 transition-all duration-300 rounded-lg cursor-pointer font-bold">
                    <span class="material-symbols-outlined">logout</span>
                    <span>Sign Out</span>
                </a>
            `;
            sidebarNav.parentElement.appendChild(logoutContainer);

            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.removeItem('openissue_session');
                sessionStorage.removeItem('openissue_session');
                window.location.href = 'login.html';
            });
        }
        
        // Update user profile name if available
        const sessionStr = localStorage.getItem('openissue_session') || sessionStorage.getItem('openissue_session');
        if (sessionStr) {
            try {
                const user = JSON.parse(sessionStr);
                const nameDisplay = document.querySelector('header .text-sm.font-bold.text-on-surface');
                if (nameDisplay) {
                    nameDisplay.textContent = user.name || user.email.split('@')[0];
                }
            } catch(e) {}
        }
    }

    // 1. Sidebar Toggle Logic for Mobile
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            // Toggle classes to show/hide for mobile
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // 2. Chart Initialization (if canvas elements exist)
    const triageCtxElement = document.getElementById('triageChart');
    const distributionCtxElement = document.getElementById('distributionChart');

    let triageChart = null;
    let distributionChart = null;

    if (typeof Chart !== 'undefined') {
        // Set global defaults for Chart.js
        Chart.defaults.color = '#a7aaba';
        Chart.defaults.font.family = 'Manrope';

        if (triageCtxElement) {
            const triageCtx = triageCtxElement.getContext('2d');
            // We'll use this chart for Priority Trends as per user request
            triageChart = new Chart(triageCtx, {
                type: 'bar',
                data: {
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{
                        label: 'Priority Issues',
                        data: [0, 0, 0],
                        backgroundColor: ['#ff6e84', '#a3a6ff', '#a7aaba'],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            border: { display: false }
                        },
                        x: {
                            grid: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        if (distributionCtxElement) {
            const distributionCtx = distributionCtxElement.getContext('2d');
            // We use this for Type Distribution
            distributionChart = new Chart(distributionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Frontend', 'Backend', 'Security', 'General'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#a3a6ff', '#a28efc', '#ffa5d9', '#a7aaba'],
                        borderWidth: 0,
                        hoverOffset: 10,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }

    // 3. Mock interactions for buttons
    const buttons = document.querySelectorAll('button:not(#sidebar-toggle):not(.absolute)');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });

    // --- Dynamic Data Integration ---
    
    // Animate Number helper
    function animateValue(obj, start, end, duration) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    let isInitialLoad = true;

    // Listen for data updates from Data Engine
    window.addEventListener('openissue-sync', (e) => {
        const stats = e.detail;
        
        const elTotal = document.getElementById('metric-total-issues');
        const elHigh = document.getElementById('metric-high-priority');
        const elDupes = document.getElementById('metric-duplicates');
        const elUnlabeled = document.getElementById('metric-unlabeled');

        const parseNum = (obj) => {
            if(!obj || !obj.innerText) return 0;
            const text = obj.innerText.replace(/,/g, '');
            const parsed = parseInt(text);
            return isNaN(parsed) ? 0 : parsed;
        };

        if (elTotal) {
            if (isInitialLoad) elTotal.innerHTML = '0';
            const currentTotal = parseNum(elTotal);
            if (currentTotal !== stats.total) animateValue(elTotal, currentTotal, stats.total, 800);
        }
        if (elHigh) {
            if (isInitialLoad) elHigh.innerHTML = '0';
            const currentHigh = parseNum(elHigh);
            if (currentHigh !== stats.highPriority) animateValue(elHigh, currentHigh, stats.highPriority, 800);
        }
        if (elDupes) {
            if (isInitialLoad) elDupes.innerHTML = '0';
            const currentDupes = parseNum(elDupes);
            if (currentDupes !== stats.duplicates) animateValue(elDupes, currentDupes, stats.duplicates, 800);
        }
        if (elUnlabeled) {
            if (isInitialLoad) elUnlabeled.innerHTML = '0';
            const currentUnlabeled = parseNum(elUnlabeled);
            if (currentUnlabeled !== stats.unlabeled) animateValue(elUnlabeled, currentUnlabeled, stats.unlabeled, 800);
        }

        // Update Charts
        if (triageChart) {
            triageChart.data.datasets[0].data = [
                stats.priorityDist.High || 0,
                stats.priorityDist.Medium || 0,
                stats.priorityDist.Low || 0
            ];
            triageChart.update();
            
            // Re-label to clarify
            const header = document.querySelector('#triageChart').parentElement.parentElement.querySelector('h4');
            if(header && isInitialLoad) {
                header.innerText = "Priority Distribution";
                header.nextElementSibling.innerText = "Categorization by AI urgency assessment";
            }
        }

        if (distributionChart) {
            distributionChart.data.datasets[0].data = [
                stats.distribution.frontend || 0,
                stats.distribution.backend || 0,
                stats.distribution.security || 0,
                stats.distribution.general || 0
            ];
             distribuciónChart = distributionChart; // maintain reference
            distributionChart.update();
        }
        
        isInitialLoad = false;
    });

    window.addEventListener('openissue-soft-sync', () => {
        // Just simulate small chart jiggle for a live feel if appropriate
    });

    const liveStreamContainer = document.getElementById('live-stream-container');
    const MAX_STREAM_ITEMS = 6;
    let streamInitialized = false;

    // Time ago helper
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 60;
        if (interval < 1) return 'just now';
        return Math.floor(interval) + 'm ago';
    }

    // Update timestamps loop
    setInterval(() => {
        document.querySelectorAll('.stream-time').forEach(el => {
            const time = parseInt(el.dataset.time);
            if (time) el.innerText = timeAgo(new Date(time));
        });
    }, 10000);

    // Render live stream item
    window.addEventListener('openissue-stream-log', (e) => {
        if(!liveStreamContainer) return;

        if(!streamInitialized) {
            liveStreamContainer.innerHTML = '';
            streamInitialized = true;
        }

        const { message, iconName, colorClass, time } = e.detail;
        
        const colClass = `text-${colorClass}`;
        const bgClass = `bg-${colorClass}/10`;

        const el = document.createElement('div');
        el.className = 'glass-card p-4 md:p-5 rounded-2xl border border-white/5 flex items-start gap-4 md:gap-5 hover:bg-white/[0.02] transition-colors animate-[slide-in-right_0.3s_ease-out]';
        el.innerHTML = `
            <div class="w-10 h-10 shrink-0 rounded-xl ${bgClass} ${colClass} flex items-center justify-center">
                <span class="material-symbols-outlined">${iconName}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-on-surface mb-1 truncate">${message}</p>
                <div class="flex items-center gap-3 text-xs text-on-surface-variant">
                    <span class="stream-time" data-time="${time}">${timeAgo(new Date(time))}</span>
                    <span class="w-1 h-1 rounded-full bg-white/20"></span>
                    <span>System Auto</span>
                </div>
            </div>
        `;
        
        liveStreamContainer.prepend(el);

        if (liveStreamContainer.children.length > MAX_STREAM_ITEMS) {
            liveStreamContainer.lastElementChild.remove();
        }
    });

    // Create Toast notification element
    const toastContainer = document.createElement('div');
    toastContainer.className = 'fixed bottom-8 max-w-sm left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const icon = type === 'success' ? 'check_circle' : 'info';
        const color = type === 'success' ? 'text-primary' : 'text-secondary';
        const border = type === 'success' ? 'border-primary/30' : 'border-secondary/30';

        toast.className = `glass-card px-4 py-3 rounded-xl border ${border} shadow-lg flex items-center gap-3 animate-[fade-in-up_0.3s_ease-out]`;
        toast.innerHTML = `
            <span class="material-symbols-outlined ${color}">${icon}</span>
            <span class="text-sm font-bold text-on-surface">${message}</span>
        `;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add Issue Form Handler
    const addIssueForm = document.getElementById('add-issue-form');
    if (addIssueForm) {
        addIssueForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('issue-title').value;
            const desc = document.getElementById('issue-desc').value;
            const btn = document.getElementById('submit-issue-btn');

            // Show loading
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Analyzing...';
            btn.disabled = true;

            setTimeout(() => {
                // Submit to data engine
                if (window.OpenIssueSystem) {
                    window.OpenIssueSystem.addUserIssue(title, desc);
                }

                btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Added';
                btn.classList.add('bg-secondary');
                
                showToast('Issue recorded and assigned for AI triage.');
                
                setTimeout(() => {
                    document.getElementById('issue-modal').classList.add('hidden');
                    addIssueForm.reset();
                    btn.innerHTML = originalText;
                    btn.classList.remove('bg-secondary');
                    btn.disabled = false;
                }, 800);

            }, 1000); // simulate analysis latency
        });
    }

    // Add CSS animations required
    if (!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slide-in-right {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
});
