// Navigation fix for all pages
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('nav a[href="#"]');
    navLinks.forEach(link => {
        const text = link.textContent.trim();
        if (text === 'Dashboard') {
            link.href = 'dashboard.html';
        } else if (text === 'Intelligence') {
            link.href = 'home.html';
        } else if (text === 'Conflicts') {
            link.href = 'conflicts.html';
        } else if (text === 'Settings') {
            link.href = 'settings.html';
        }
    });
});
