const API_BASE_URL = "http://127.0.0.1:8000";
const MIN_PASSWORD_LENGTH = 4; // Must match backend requirement
const MIN_USERNAME_LENGTH = 3; // Must match backend requirement

const authForm = document.getElementById("auth-form");
const usernameInput = document.getElementById("username");
const usernameHint = document.getElementById("username-hint");
const passwordInput = document.getElementById("password");
const passwordHint = document.getElementById("password-hint");
const authSubmit = document.getElementById("auth-submit");
const btnText = document.getElementById("btn-text");
const toggleModeButton = document.getElementById("toggle-mode");
const authStatus = document.getElementById("auth-status");
const loginCard = document.querySelector(".login-form-container");
const loadingScreen = document.getElementById("loading-screen");
const loadingMessage = document.getElementById("loading-message");

let authMode = "login";

if (localStorage.getItem("userId")) {
	window.location.href = "index.html";
}

function setAuthStatus(message, isError = true) {
	authStatus.textContent = message ?? "";
	authStatus.style.color = isError ? "#dc2626" : "#15803d";
}

function switchMode() {
	authMode = authMode === "login" ? "register" : "login";
	btnText.textContent = authMode === "login" ? "Enter Saivo" : "Create Account";
	toggleModeButton.textContent = authMode === "login"
		? "Need an account? Register"
		: "Already have an account? Login";

	// Show/hide hints based on mode
	if (authMode === "register") {
		usernameHint.textContent = `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
		usernameHint.classList.add("show");
		passwordHint.textContent = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
		passwordHint.classList.add("show");
	} else {
		usernameHint.textContent = "";
		usernameHint.classList.remove("show");
		passwordHint.textContent = "";
		passwordHint.classList.remove("show");
	}

	setAuthStatus("");
	usernameInput.classList.remove("error");
	passwordInput.classList.remove("error");
	authForm.reset();
}

async function apiFetch(path, body) {
	const config = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	};

	try {
		const response = await fetch(`${API_BASE_URL}${path}`, config);
		const contentType = response.headers.get("content-type") || "";
		const isJson = contentType.includes("application/json");
		const payload = isJson ? await response.json().catch(() => null) : await response.text();

		if (!response.ok) {
			const detail = isJson && payload && typeof payload === "object"
				? payload.detail || JSON.stringify(payload)
				: payload || `Request failed with status ${response.status}`;
			throw new Error(typeof detail === "string" ? detail : "Request failed");
		}

		return payload;
	} catch (error) {
		console.error("Authentication request failed", error);
		throw error;
	}
}

async function handleAuth(username, password) {
	if (!username || !password) {
		setAuthStatus("Username and password are required");
		usernameInput.classList.toggle("error", !username);
		passwordInput.classList.toggle("error", !password);
		loginCard.classList.add("shake");
		setTimeout(() => loginCard.classList.remove("shake"), 500);
		return;
	}

	// Validate username length for registration
	if (authMode === "register" && username.length < MIN_USERNAME_LENGTH) {
		setAuthStatus(`Username must be at least ${MIN_USERNAME_LENGTH} characters`);
		usernameInput.classList.add("error");
		loginCard.classList.add("shake");
		setTimeout(() => loginCard.classList.remove("shake"), 500);
		return;
	}

	// Validate password length for registration
	if (authMode === "register" && password.length < MIN_PASSWORD_LENGTH) {
		setAuthStatus(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
		passwordInput.classList.add("error");
		loginCard.classList.add("shake");
		setTimeout(() => loginCard.classList.remove("shake"), 500);
		return;
	}

	// Clear errors
	usernameInput.classList.remove("error");
	passwordInput.classList.remove("error");

	// Show loading state
	authSubmit.disabled = true;
	btnText.textContent = authMode === "login" ? "Entering Saivo..." : "Creating Account...";

	try {
		const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
		const result = await apiFetch(endpoint, { username, password });

		if (authMode === "login") {
			// Check if account is scheduled for deletion
			if (result.deletion_status === "scheduled") {
				// Store pending login data and show deletion warning modal
				pendingLoginData = {
					id: result.id,
					username: result.username,
				};
				showDeletionWarningModal();
				return;
			}
			
			// Normal login: Store credentials and redirect to chat
			localStorage.setItem("userId", result.id);
			localStorage.setItem("username", result.username);

			loadingMessage.textContent = "Login Successful!";
			loadingScreen.classList.add("active");

			setTimeout(() => {
				window.location.href = "index.html";
			}, 1500);
		} else {
			// Registration: Show success and redirect to login
			loadingMessage.textContent = "Account Creation Done!";
			loadingScreen.classList.add("active");

			setTimeout(() => {
				// Hide loading screen and switch to login mode
				loadingScreen.classList.remove("active");
				switchMode(); // Switch to login mode
				setAuthStatus("Account created! Please login now.", false);
				usernameInput.value = username; // Pre-fill username for convenience
			}, 1500);
		}
	} catch (error) {
		console.error("Authentication failed", error);
		setAuthStatus(error.message || "Authentication failed");
		loginCard.classList.add("shake");
		setTimeout(() => loginCard.classList.remove("shake"), 500);
	} finally {
		authSubmit.disabled = false;
		btnText.textContent = authMode === "login" ? "Enter Saivo" : "Create Account";
	}
}

// Store pending login data when account is scheduled for deletion
let pendingLoginData = null;

// Deletion warning modal elements
const deletionWarningModal = document.getElementById("deletion-warning-modal");
const deletionCancelBtn = document.getElementById("deletion-cancel-btn");
const deletionNewAccountBtn = document.getElementById("deletion-newaccount-btn");

/**
 * Show the deletion warning modal
 */
function showDeletionWarningModal() {
	if (deletionWarningModal) {
		deletionWarningModal.classList.add("active");
		deletionWarningModal.setAttribute("aria-hidden", "false");
	}
}

/**
 * Hide the deletion warning modal
 */
function hideDeletionWarningModal() {
	if (deletionWarningModal) {
		deletionWarningModal.classList.remove("active");
		deletionWarningModal.setAttribute("aria-hidden", "true");
	}
}

/**
 * Handle cancel deletion and login
 */
async function handleCancelDeletionAndLogin() {
	if (!pendingLoginData) return;
	
	try {
		// Disable button and show loading
		if (deletionCancelBtn) {
			deletionCancelBtn.disabled = true;
			deletionCancelBtn.textContent = "Cancelling...";
		}
		
		// Call API to cancel deletion
		const response = await fetch(`${API_BASE_URL}/account/cancel-deletion`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ user_id: pendingLoginData.id }),
		});
		
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.detail || "Failed to cancel deletion");
		}
		
		// Hide modal and complete login
		hideDeletionWarningModal();
		
		// Store credentials and redirect
		localStorage.setItem("userId", pendingLoginData.id);
		localStorage.setItem("username", pendingLoginData.username);
		
		loadingMessage.textContent = "Deletion Cancelled! Welcome Back!";
		loadingScreen.classList.add("active");
		
		setTimeout(() => {
			window.location.href = "index.html";
		}, 1500);
		
	} catch (error) {
		console.error("Failed to cancel deletion", error);
		setAuthStatus(error.message || "Failed to cancel deletion");
		hideDeletionWarningModal();
	} finally {
		if (deletionCancelBtn) {
			deletionCancelBtn.disabled = false;
			deletionCancelBtn.textContent = "Cancel Deletion & Login";
		}
		pendingLoginData = null;
	}
}

/**
 * Handle using a different account
 */
function handleUseDifferentAccount() {
	hideDeletionWarningModal();
	pendingLoginData = null;
	authForm.reset();
	setAuthStatus("Please login with a different account.", false);
}

// Event listeners for deletion warning modal
if (deletionCancelBtn) {
	deletionCancelBtn.addEventListener("click", handleCancelDeletionAndLogin);
}

if (deletionNewAccountBtn) {
	deletionNewAccountBtn.addEventListener("click", handleUseDifferentAccount);
}

// ESC key to close deletion warning modal
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && deletionWarningModal?.classList.contains("active")) {
		handleUseDifferentAccount();
	}
});

authForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();
	handleAuth(username, password);
});

toggleModeButton.addEventListener("click", switchMode);

// ========================
// LEGAL MODAL (Terms & Privacy)
// ========================
// Handles Terms of Service and Privacy Policy modal popups.
// Content is dynamically switched based on which link is clicked.

const legalModal = document.getElementById("legal-modal");
const legalModalTitle = document.getElementById("legal-modal-title");
const legalModalBody = document.getElementById("legal-modal-body");
const legalModalClose = document.getElementById("legal-modal-close");
const termsLink = document.getElementById("terms-link");
const privacyLink = document.getElementById("privacy-link");

// Get today's date for "Last updated"
const todayDate = new Date().toLocaleDateString('en-US', { 
	year: 'numeric', 
	month: 'long', 
	day: 'numeric' 
});

// Terms of Service content
const termsContent = `
	<p class="legal-update">Last updated: ${todayDate}</p>
	<p>By using Saivo, you agree to the following terms.</p>
	
	<h3>1. About Saivo</h3>
	<p>Saivo is an AI-powered assistant created for learning, productivity, and general assistance. It is a student-built project and is provided for informational purposes only.</p>
	
	<h3>2. User Responsibilities</h3>
	<p>You agree to:</p>
	<ul>
		<li>Use Saivo legally and respectfully</li>
		<li>Not misuse the system for harmful, illegal, or abusive activities</li>
		<li>Not attempt to exploit, reverse-engineer, or overload the system</li>
	</ul>
	
	<h3>3. AI Responses</h3>
	<ul>
		<li>Saivo responses may be inaccurate or incomplete</li>
		<li>Do not rely on Saivo for medical, legal, or financial decisions</li>
		<li>You are responsible for how you use the information provided</li>
	</ul>
	
	<h3>4. Accounts Usage</h3>
	<ul>
		<li>Some sessions have limited access</li>
		<li>Logged-in users are responsible for their account activity</li>
	</ul>
	
	<h3>5. Data & Chat History</h3>
	<ul>
		<li>Chats may be stored to improve functionality</li>
		<li>Deleted chats may be archived internally for system integrity</li>
	</ul>
	
	<h3>6. Availability</h3>
	<p>Sometimes Saivo may be unavailable due to maintenance, updates, or technical issues.</p>
	
	<h3>7. Changes to Terms</h3>
	<p>These terms may change over time. Continued use means acceptance of updated terms.</p>
	
	<p class="legal-contact">Saivo is developed and maintained by Kush Dalal, Computer Science student, Chandigarh University.</p>
`;

// Privacy Policy content
const privacyContent = `
	<p class="legal-update">Last updated: ${todayDate}</p>
	<p>Your privacy matters. This policy explains how Saivo handles data.</p>
	
	<h3>1. Information We Collect</h3>
	<ul>
		<li>Username (if registered)</li>
		<li>Chat messages</li>
		<li>Session identifiers (for limited sessions)</li>
	</ul>
	
	<h3>2. How Data Is Used</h3>
	<ul>
		<li>To provide chat functionality</li>
		<li>To improve user experience</li>
		<li>To manage chat history and sessions</li>
	</ul>
	
	<h3>3. Data Storage</h3>
	<ul>
		<li>Chat data is stored securely in a database</li>
		<li>Deleted chats may be archived but not shown to users</li>
	</ul>
	
	<h3>4. Third-Party Services</h3>
	<p>Saivo may use external AI APIs to generate responses. No personal data is sold or shared for advertising.</p>
	
	<h3>5. Cookies & Tracking</h3>
	<p>Saivo does not use advertising cookies or third-party trackers.</p>
	
	<h3>6. Data Security</h3>
	<p>Reasonable measures are taken to protect user data, but no system is 100% secure.</p>
	
	<h3>7. User Control</h3>
	<p>You can:</p>
	<ul>
		<li>Delete chats</li>
		<li>Log out at any time</li>
		<li>Stop using Saivo whenever you want</li>
	</ul>
	
	<h3>8. Changes to Policy</h3>
	<p>This policy may be updated as the project evolves.</p>
`;

/**
 * Opens the legal modal with specified content
 * @param {string} type - 'terms' or 'privacy'
 */
function openLegalModal(type) {
	if (type === 'terms') {
		legalModalTitle.textContent = 'Terms of Service';
		legalModalBody.innerHTML = termsContent;
	} else {
		legalModalTitle.textContent = 'Privacy Policy';
		legalModalBody.innerHTML = privacyContent;
	}
	
	legalModal.classList.add('show');
	legalModal.setAttribute('aria-hidden', 'false');
	document.body.classList.add('modal-open');
	
	// Focus the close button for accessibility
	legalModalClose.focus();
}

/**
 * Closes the legal modal
 */
function closeLegalModal() {
	legalModal.classList.remove('show');
	legalModal.setAttribute('aria-hidden', 'true');
	document.body.classList.remove('modal-open');
}

// Event listeners for opening modal
termsLink.addEventListener('click', (e) => {
	e.preventDefault();
	openLegalModal('terms');
});

privacyLink.addEventListener('click', (e) => {
	e.preventDefault();
	openLegalModal('privacy');
});

// Close on X button
legalModalClose.addEventListener('click', closeLegalModal);

// Close on clicking outside modal
legalModal.addEventListener('click', (e) => {
	if (e.target === legalModal) {
		closeLegalModal();
	}
});

// Close on ESC key
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && legalModal.classList.contains('show')) {
		closeLegalModal();
	}
});

// ========================
// TILT EFFECT FOR INFO CARD
// ========================
const tiltCard = document.getElementById('info-card-tilt');
if (tiltCard) {
	tiltCard.addEventListener('mousemove', (e) => {
		const rect = tiltCard.getBoundingClientRect();
		// Get coordinates relative to the center of the card
		const x = e.clientX - rect.left; 
		const y = e.clientY - rect.top; 
		
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		
		// Map position to rotation degrees
		const rotateX = ((y - centerY) / centerY) * -15; // Invert Y axis for natural tilt
		const rotateY = ((x - centerX) / centerX) * 15;
		
		tiltCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
	});

	tiltCard.addEventListener('mouseleave', () => {
		tiltCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
	});
}

// ========================
// FORGOT PASSWORD MODAL
// ========================
// Handles password reset flow with random token verification.
// Steps: 1) Request Reset, 2) Verify Token, 3) Reset Password

const forgotModal = document.getElementById("forgot-password-modal");
const forgotModalClose = document.getElementById("forgot-modal-close");
const forgotPasswordLink = document.getElementById("forgot-password-link");

// Step elements
const stepItems = document.querySelectorAll(".step-item");
const forgotSteps = {
	1: document.getElementById("forgot-step-1"),
	2: document.getElementById("forgot-step-2"),
	3: document.getElementById("forgot-step-3"),
};
const forgotSuccess = document.getElementById("forgot-success");
const existingRequestNotice = document.getElementById("existing-request-notice");
const requestConfirmation = document.getElementById("request-confirmation");

// Forms
const forgotRequestForm = document.getElementById("forgot-request-form");
const forgotVerifyForm = document.getElementById("forgot-verify-form");
const forgotResetForm = document.getElementById("forgot-reset-form");

// Inputs
const forgotUsername = document.getElementById("forgot-username");
const forgotEmail = document.getElementById("forgot-email");
const forgotMessage = document.getElementById("forgot-message");
const verifyUsername = document.getElementById("verify-username");
const verifyEmail = document.getElementById("verify-email");
const verifyToken = document.getElementById("verify-hash"); // Input for reset token
const resetNewPassword = document.getElementById("reset-new-password");
const resetConfirmPassword = document.getElementById("reset-confirm-password");

// Error elements
const forgotErrors = {
	1: document.getElementById("forgot-error-1"),
	2: document.getElementById("forgot-error-2"),
	3: document.getElementById("forgot-error-3"),
};

// Buttons
const continueRequestBtn = document.getElementById("continue-request-btn");
const newRequestBtn = document.getElementById("new-request-btn");
const backToStep1Btn = document.getElementById("back-to-step-1");
const backToLoginBtn = document.getElementById("back-to-login-btn");

// State
let currentForgotStep = 1;
let existingRequest = null;
let requestSubmittedSuccessfully = false; // Track if request was just submitted

/**
 * Opens the forgot password modal and checks for existing request
 */
async function openForgotModal() {
	resetForgotModal();
	forgotModal.classList.add("show");
	forgotModal.setAttribute("aria-hidden", "false");
	document.body.classList.add("modal-open");
	forgotModalClose.focus();
}

/**
 * Closes the forgot password modal
 */
function closeForgotModal() {
	forgotModal.classList.remove("show");
	forgotModal.setAttribute("aria-hidden", "true");
	document.body.classList.remove("modal-open");
}

/**
 * Resets the forgot modal to initial state
 */
function resetForgotModal() {
	currentForgotStep = 1;
	existingRequest = null;
	requestSubmittedSuccessfully = false;
	
	// Reset all forms
	forgotRequestForm.reset();
	forgotVerifyForm.reset();
	forgotResetForm.reset();
	
	// Hide existing request notice
	existingRequestNotice.style.display = "none";
	
	// Hide confirmation message
	if (requestConfirmation) {
		requestConfirmation.style.display = "none";
	}
	
	// Hide success message
	forgotSuccess.style.display = "none";
	
	// Clear all errors
	Object.values(forgotErrors).forEach(el => el.textContent = "");
	
	// Show step 1, hide others
	updateForgotStep(1);
	
	// Enable all inputs
	forgotUsername.disabled = false;
}

/**
 * Updates the current step display
 * @param {number} step - Step number (1, 2, or 3)
 */
function updateForgotStep(step) {
	currentForgotStep = step;
	
	// Update step indicators
	stepItems.forEach(item => {
		const itemStep = parseInt(item.dataset.step);
		item.classList.remove("active", "completed");
		if (itemStep < step) {
			item.classList.add("completed");
		} else if (itemStep === step) {
			item.classList.add("active");
		}
	});
	
	// Show/hide step content
	Object.entries(forgotSteps).forEach(([s, el]) => {
		el.classList.toggle("active", parseInt(s) === step);
	});
	
	// Hide success message when on steps
	if (step <= 3) {
		forgotSuccess.style.display = "none";
	}
}

/**
 * Shows the success state
 */
function showForgotSuccess() {
	// Mark all steps as completed
	stepItems.forEach(item => {
		item.classList.remove("active");
		item.classList.add("completed");
	});
	
	// Hide all steps
	Object.values(forgotSteps).forEach(el => el.classList.remove("active"));
	
	// Show success message
	forgotSuccess.style.display = "block";
}

/**
 * Sets error message for a step
 * @param {number} step - Step number
 * @param {string} message - Error message
 */
function setForgotError(step, message) {
	forgotErrors[step].textContent = message || "";
}

/**
 * Checks for existing reset request
 * @param {string} username - Username to check
 */
async function checkExistingRequest(username) {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/password-reset/check`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username })
		});
		
		if (response.ok) {
			const data = await response.json();
			return data;
		}
		return null;
	} catch (error) {
		console.error("Failed to check existing request:", error);
		return null;
	}
}

/**
 * Handles step 1 form submission - Request Reset
 * On success: Shows confirmation message and advances to step 2
 */
async function handleRequestSubmit(e) {
	e.preventDefault();
	setForgotError(1, "");
	
	const username = forgotUsername.value.trim();
	const email = forgotEmail.value.trim();
	const message = forgotMessage.value.trim();
	
	if (!username) {
		setForgotError(1, "Username is required");
		return;
	}
	
	if (!email) {
		setForgotError(1, "Email is required");
		return;
	}
	
	// Disable submit button
	const submitBtn = forgotRequestForm.querySelector(".forgot-submit-btn");
	submitBtn.disabled = true;
	submitBtn.textContent = "Submitting...";
	
	try {
		// First check for existing request
		const existing = await checkExistingRequest(username);
		
		if (existing && existing.has_active_request) {
			// Show existing request notice
			existingRequest = existing;
			existingRequestNotice.style.display = "block";
			
			// Pre-fill verify fields
			verifyUsername.value = username;
			verifyEmail.value = existing.email || email;
			
			return;
		}
		
		// Create new request
		const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, email, message })
		});
		
		const data = await response.json();
		
		if (!response.ok) {
			throw new Error(data.detail || "Failed to submit request");
		}
		
		// SUCCESS: Mark request as submitted and show confirmation
		requestSubmittedSuccessfully = true;
		
		// Pre-fill verify fields
		verifyUsername.value = username;
		verifyEmail.value = email;
		
		// Move to step 2 and show confirmation message
		updateForgotStep(2);
		
		// Show confirmation message AFTER moving to step 2
		if (requestConfirmation) {
			requestConfirmation.style.display = "block";
		}
		
	} catch (error) {
		setForgotError(1, error.message);
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Submit Request";
	}
}

/**
 * Handles continuing an existing request
 * Goes to step 2 without showing fresh confirmation (request already submitted before)
 */
function handleContinueRequest() {
	existingRequestNotice.style.display = "none";
	
	// Hide confirmation when continuing existing request (not freshly submitted)
	if (requestConfirmation) {
		requestConfirmation.style.display = "none";
	}
	
	if (existingRequest?.status === "token_sent") {
		// Skip to step 2 for token verification
		updateForgotStep(2);
	} else {
		// Stay on step 2 to wait for token
		updateForgotStep(2);
	}
}

/**
 * Handles starting a new request (cancels existing)
 */
async function handleNewRequest() {
	const username = forgotUsername.value.trim();
	
	try {
		// Cancel existing request
		await fetch(`${API_BASE_URL}/auth/password-reset/cancel`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username })
		});
		
		// Hide notice and reset
		existingRequestNotice.style.display = "none";
		existingRequest = null;
		
	} catch (error) {
		console.error("Failed to cancel existing request:", error);
	}
}

/**
 * Handles step 2 form submission - Verify Token
 * Uses the new /verify-token endpoint with reset_token field
 */
async function handleVerifySubmit(e) {
	e.preventDefault();
	setForgotError(2, "");
	
	const username = verifyUsername.value.trim();
	const resetTokenValue = verifyToken.value.trim();
	
	if (!resetTokenValue) {
		setForgotError(2, "Reset token is required");
		return;
	}
	
	const submitBtn = forgotVerifyForm.querySelector(".forgot-submit-btn");
	submitBtn.disabled = true;
	submitBtn.textContent = "Verifying...";
	
	try {
		const response = await fetch(`${API_BASE_URL}/auth/password-reset/verify-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, reset_token: resetTokenValue })
		});
		
		const data = await response.json();
		
		if (!response.ok) {
			throw new Error(data.detail || "Invalid token");
		}
		
		if (data.verified) {
			// Hide confirmation message when moving to step 3
			if (requestConfirmation) {
				requestConfirmation.style.display = "none";
			}
			// Move to step 3
			updateForgotStep(3);
		} else {
			throw new Error(data.message || "Token verification failed");
		}
		
	} catch (error) {
		setForgotError(2, error.message);
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Verify Token";
	}
}

/**
 * Handles step 3 form submission - Reset Password
 */
async function handleResetSubmit(e) {
	e.preventDefault();
	setForgotError(3, "");
	
	const username = verifyUsername.value.trim();
	const newPassword = resetNewPassword.value;
	const confirmPassword = resetConfirmPassword.value;
	
	if (!newPassword) {
		setForgotError(3, "New password is required");
		return;
	}
	
	if (newPassword.length < MIN_PASSWORD_LENGTH) {
		setForgotError(3, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
		return;
	}
	
	if (newPassword !== confirmPassword) {
		setForgotError(3, "Passwords do not match");
		return;
	}
	
	const submitBtn = forgotResetForm.querySelector(".forgot-submit-btn");
	submitBtn.disabled = true;
	submitBtn.textContent = "Resetting...";
	
	try {
		const response = await fetch(`${API_BASE_URL}/auth/password-reset/reset`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				username, 
				new_password: newPassword,
				confirm_password: confirmPassword 
			})
		});
		
		const data = await response.json();
		
		if (!response.ok) {
			// Handle error - extract message from detail (could be string or object)
			const errorMsg = typeof data.detail === 'string' 
				? data.detail 
				: (data.detail?.msg || data.message || "Failed to reset password");
			throw new Error(errorMsg);
		}
		
		// Show success
		showForgotSuccess();
		
	} catch (error) {
		setForgotError(3, error.message || "Failed to reset password");
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Reset Password";
	}
}

// Event listeners for forgot password modal
forgotPasswordLink.addEventListener("click", (e) => {
	e.preventDefault();
	openForgotModal();
});

forgotModalClose.addEventListener("click", closeForgotModal);

forgotModal.addEventListener("click", (e) => {
	if (e.target === forgotModal) {
		closeForgotModal();
	}
});

// Form submissions
forgotRequestForm.addEventListener("submit", handleRequestSubmit);
forgotVerifyForm.addEventListener("submit", handleVerifySubmit);
forgotResetForm.addEventListener("submit", handleResetSubmit);

// Button handlers
continueRequestBtn.addEventListener("click", handleContinueRequest);
newRequestBtn.addEventListener("click", handleNewRequest);

backToStep1Btn.addEventListener("click", () => {
	updateForgotStep(1);
	forgotUsername.disabled = false;
	existingRequestNotice.style.display = "none";
	// Hide confirmation when going back to step 1
	if (requestConfirmation) {
		requestConfirmation.style.display = "none";
	}
	requestSubmittedSuccessfully = false;
});

backToLoginBtn.addEventListener("click", () => {
	closeForgotModal();
});

// Close on ESC key (update existing listener)
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && forgotModal.classList.contains("show")) {
		closeForgotModal();
	}
});