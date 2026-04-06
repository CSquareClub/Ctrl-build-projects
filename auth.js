// Authentication Logic for OpenIssue

document.addEventListener('DOMContentLoaded', () => {
    // 1. Password Visibility Toggle
    const togglePasswordTokens = document.querySelectorAll('.toggle-password');
    togglePasswordTokens.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const inputId = this.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const icon = this.querySelector('.material-symbols-outlined');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility_off';
            }
        });
    });

    // 2. Alert System
    const showAlert = (message, type = 'error') => {
        const errorContainer = document.getElementById('alert-container');
        if (errorContainer) {
            errorContainer.innerHTML = '';
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `p-3 rounded-lg flex items-center gap-3 text-sm font-bold mb-4 ${
                type === 'error' ? 'bg-error/10 text-error border border-error/20' : 'bg-[#a3a6ff]/10 text-[#a3a6ff] border border-[#a3a6ff]/20'
            }`;
            
            alertDiv.innerHTML = `
                <span class="material-symbols-outlined">${type === 'error' ? 'error' : 'check_circle'}</span>
                <span>${message}</span>
            `;
            
            errorContainer.appendChild(alertDiv);
            
            // Auto fade out
            setTimeout(() => {
                alertDiv.style.opacity = '0';
                alertDiv.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => alertDiv.remove(), 500);
            }, 3000);
        }
    };

    // 3. Signup Simulation
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('signup-btn');

            // Simple Validation
            if (password.length < 6) {
                showAlert('Password must be at least 6 characters long.');
                return;
            }

            // Simulate Loading
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Creating Account...';
            submitBtn.disabled = true;

            setTimeout(() => {
                // Save explicitly
                const users = JSON.parse(localStorage.getItem('openissue_users') || '[]');
                if (users.find(u => u.email === email)) {
                    showAlert('Email already exists. Try signing in.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                users.push({ name, email, password });
                localStorage.setItem('openissue_users', JSON.stringify(users));
                
                showAlert('Account created! Redirecting...', 'success');
                
                // Keep session automatically
                localStorage.setItem('openissue_session', JSON.stringify({ name, email }));
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }, 1200);
        });
    }

    // 4. Login Simulation
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember').checked;
            const submitBtn = document.getElementById('login-btn');

            // Simulate Loading
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Authenticating...';
            submitBtn.disabled = true;

            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('openissue_users') || '[]');
                // Also support an arbitrary login for test purposes if no users are registered
                const isValidRoot = (email === "admin@openissue.com" && password === "password");
                const foundUser = users.find(u => u.email === email && u.password === password);

                if (foundUser || isValidRoot) {
                    const sessionData = foundUser || { name: "Admin", email };
                    
                    if (rememberMe) {
                        localStorage.setItem('openissue_session', JSON.stringify(sessionData));
                    } else {
                        sessionStorage.setItem('openissue_session', JSON.stringify(sessionData));
                    }

                    showAlert('Authentication successful!', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    showAlert('Invalid email or password.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }, 1000);
        });
    }
});
