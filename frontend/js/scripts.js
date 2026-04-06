const API_BASE = "http://127.0.0.1:8000";

// Configure marked.js for proper Markdown rendering
if (typeof marked !== "undefined") {
	console.log("✓ marked.js is loaded", marked);
	try {
		if (marked.setOptions) {
			marked.setOptions({
				breaks: true,
				gfm: true,
				headerIds: false,
				mangle: false
			});
			console.log("✓ marked.js configured successfully");
		} else if (marked.use) {
			marked.use({
				breaks: true,
				gfm: true,
				headerIds: false,
				mangle: false
			});
			console.log("✓ marked.js configured with .use()");
		}
	} catch (e) {
		console.log("⚠ marked configuration not available, using defaults:", e);
	}
} else {
	console.error("✗ marked.js is NOT loaded!");
}

// State management
const state = {
	userId: localStorage.getItem("userId"),
	username: localStorage.getItem("username"),
	activeChatId: localStorage.getItem("activeChatId"),
	difficultyLevel: localStorage.getItem("difficultyLevel") || "Neutral",
	sessionSubject: localStorage.getItem("sessionSubject") || "Anyone",
};

// Cleanup legacy preference from removed guided-learning mode.
localStorage.removeItem("guidedLearning");

// DOM elements
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarUsername = document.getElementById("sidebar-username");
const avatarInitials = document.getElementById("avatar-initials");
const profileBtn = document.getElementById("profile-btn");
const settingsMenu = document.getElementById("settingsMenu");
const themeToggle = document.getElementById("theme-toggle");
const logoutButton = document.getElementById("logout");
const chatList = document.getElementById("chat-list");
const chatTitle = document.getElementById("chat-title");
const chatArea = document.getElementById("chatArea");
const messagesContainer = document.getElementById("messages-container");
const welcomeScreen = document.getElementById("welcome-screen");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("chat-input");
const chatStatus = document.getElementById("chat-status");
const newChatButton = document.getElementById("new-chat");
const loadingScreen = document.getElementById("loading-screen");
const loadingMessage = document.getElementById("loading-message");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");
const uploadBtn = document.getElementById("upload-btn");
const subjectSelect = document.getElementById("subject-select");

// Mobile sidebar elements
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileCloseBtn = document.getElementById("mobile-close-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");

let isSendingMessage = false;

// Helper to update title bar visibility (desktop + mobile)
function updateTitleBar(title) {
	// Update desktop title
	if (title && title !== "Saivo") {
		chatTitle.textContent = title;
	} else {
		chatTitle.textContent = "";
	}
	
	// Update mobile title (truncated with expand/collapse)
	updateMobileChatTitle(title);
}

// ========================
// MOBILE SIDEBAR DRAWER
// ========================
// On mobile (≤768px), the sidebar becomes a slide-in drawer.
// - Hamburger menu (☰) in header opens it
// - Close button (✕) in sidebar closes it
// - Clicking overlay closes it
// - Selecting a chat closes it
// ========================

function openMobileSidebar() {
	sidebar.classList.add("active");
	sidebarOverlay.classList.add("active");
	document.body.classList.add("sidebar-open");
}

function closeMobileSidebar() {
	sidebar.classList.remove("active");
	sidebarOverlay.classList.remove("active");
	document.body.classList.remove("sidebar-open");
}

function isMobileView() {
	return window.innerWidth <= 768;
}

// Hamburger menu click - opens sidebar
if (mobileMenuBtn) {
	mobileMenuBtn.addEventListener("click", openMobileSidebar);
}

// Close button click - closes sidebar
if (mobileCloseBtn) {
	mobileCloseBtn.addEventListener("click", closeMobileSidebar);
}

// Overlay click - closes sidebar
if (sidebarOverlay) {
	sidebarOverlay.addEventListener("click", closeMobileSidebar);
}

// Close sidebar on window resize if switching to desktop
window.addEventListener("resize", () => {
	if (!isMobileView()) {
		closeMobileSidebar();
		closeMobileProfileDropdown();
		closeMobileChatTitle();
	}
});

// ========================
// MOBILE CHAT TITLE (EXPAND/COLLAPSE)
// ========================
// On mobile, the chat title is truncated to ~6 chars with "…"
// Tapping the title or arrow expands to show full title
// Tapping again collapses it
// ========================

const mobileChatTitleWrapper = document.getElementById("mobile-chat-title-wrapper");
const mobileChatTitleBtn = document.getElementById("mobile-chat-title-btn");
const mobileChatTitleText = document.getElementById("mobile-chat-title-text");
const mobileChatTitleFull = document.getElementById("mobile-chat-title-full");

function updateMobileChatTitle(fullTitle) {
	if (!mobileChatTitleText || !mobileChatTitleFull) return;
	
	if (!fullTitle || fullTitle === "Saivo") {
		// No active chat - hide mobile title
		mobileChatTitleText.textContent = "";
		mobileChatTitleFull.textContent = "";
		if (mobileChatTitleWrapper) {
			mobileChatTitleWrapper.style.visibility = "hidden";
		}
		return;
	}
	
	// Show mobile title wrapper
	if (mobileChatTitleWrapper) {
		mobileChatTitleWrapper.style.visibility = "visible";
	}
	
	// Truncate to 6 chars + "…" if longer
	const truncated = fullTitle.length > 6 
		? fullTitle.substring(0, 6) + "…" 
		: fullTitle;
	
	mobileChatTitleText.textContent = truncated;
	mobileChatTitleFull.textContent = fullTitle;
}

function toggleMobileChatTitle() {
	if (!mobileChatTitleWrapper || !mobileChatTitleBtn) return;
	
	const isExpanded = mobileChatTitleWrapper.classList.toggle("expanded");
	mobileChatTitleBtn.setAttribute("aria-expanded", isExpanded);
}

function closeMobileChatTitle() {
	if (!mobileChatTitleWrapper || !mobileChatTitleBtn) return;
	
	mobileChatTitleWrapper.classList.remove("expanded");
	mobileChatTitleBtn.setAttribute("aria-expanded", "false");
}

if (mobileChatTitleBtn) {
	mobileChatTitleBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		toggleMobileChatTitle();
		// Close profile dropdown if open
		closeMobileProfileDropdown();
	});
}

// ========================
// MOBILE PROFILE DROPDOWN
// ========================
// Profile icon in header (top-right) on mobile
// Shows dropdown with theme toggle and logout
// ========================

const mobileProfileBtn = document.getElementById("mobile-profile-btn");
const mobileProfileAvatar = document.getElementById("mobile-profile-avatar");
const mobileProfileDropdown = document.getElementById("mobile-profile-dropdown");
const mobileThemeToggle = document.getElementById("mobile-theme-toggle");
const mobileLogout = document.getElementById("mobile-logout");

function updateMobileProfileAvatar(username) {
	if (!mobileProfileAvatar) return;
	
	// Get first letter of username
	const initial = username ? username.charAt(0).toUpperCase() : "U";
	mobileProfileAvatar.textContent = initial;
}

function toggleMobileProfileDropdown() {
	if (!mobileProfileDropdown) return;
	mobileProfileDropdown.classList.toggle("show");
}

function closeMobileProfileDropdown() {
	if (!mobileProfileDropdown) return;
	mobileProfileDropdown.classList.remove("show");
}

if (mobileProfileBtn) {
	mobileProfileBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		toggleMobileProfileDropdown();
		// Close chat title if expanded
		closeMobileChatTitle();
	});
}

// Mobile theme toggle - same as desktop
if (mobileThemeToggle) {
	mobileThemeToggle.addEventListener("click", () => {
		const html = document.documentElement;
		const current = html.getAttribute("data-theme");
		html.setAttribute("data-theme", current === "light" ? "dark" : "light");
		closeMobileProfileDropdown();
	});
}

// Mobile logout - same as desktop
if (mobileLogout) {
	mobileLogout.addEventListener("click", () => {
		loadingMessage.textContent = "Logging out...";
		loadingScreen.classList.add("active");
		
		setTimeout(() => {
			clearSession();
			window.location.href = "login.html";
		}, 1000);
	});
}

// Close mobile dropdowns when clicking outside
document.addEventListener("click", (e) => {
	// Close mobile chat title if clicking outside
	if (mobileChatTitleWrapper && !mobileChatTitleWrapper.contains(e.target)) {
		closeMobileChatTitle();
	}
	
	// Close mobile profile dropdown if clicking outside
	const mobileProfileWrapper = document.getElementById("mobile-profile-wrapper");
	if (mobileProfileWrapper && !mobileProfileWrapper.contains(e.target)) {
		closeMobileProfileDropdown();
	}
});

// --- CHAT-SCOPED GENERATION STATE ---
// FIX: Generation state is now scoped to a specific chat_id
// This prevents Stop button from affecting a different chat
let generatingChatId = null;  // The chat_id currently generating a response
let isGenerating = false;     // Whether AI response generation is in progress

// --- PROGRESSIVE RENDERING STATE ---
let renderState = {
	fullResponseText: "",    // Full response from backend
	renderIndex: 0,          // Current position in rendering (character count)
	isRendering: false,      // Whether rendering is in progress
	isStopped: false,        // Whether user clicked stop
	renderTimeout: null,     // Reference to setTimeout for cleanup
	currentBubble: null,     // Current message bubble being rendered
	chatId: null,            // Chat ID for finalize call
	userId: null,            // User ID for finalize call
	messageId: null          // Message ID for finalize call (DATA LOSS FIX)
};

// Show stop button, hide send button
// Only shows if we're generating for the currently active chat
function showStopButton() {
	// GUARD: Only show stop button if generating for active chat
	if (generatingChatId === state.activeChatId && isGenerating) {
		sendBtn.style.display = "none";
		stopBtn.style.display = "flex";
	}
}

// Hide stop button, show send button
function hideStopButton() {
	stopBtn.style.display = "none";
	sendBtn.style.display = "flex";
}

// Update stop button visibility based on current state
// Called when chat switches to ensure correct button state
function updateStopButtonVisibility() {
	if (generatingChatId === state.activeChatId && isGenerating && renderState.isRendering) {
		showStopButton();
	} else {
		hideStopButton();
	}
}

// Finalize the response - UPDATE saved message with stop marker if stopped
// DATA LOSS FIX: Message is already saved by /chat/send
// This only updates if user stopped rendering mid-way
async function finalizeResponse(stopped) {
	// If not stopped, no need to call finalize - message is already saved correctly
	if (!stopped) {
		return;
	}

	// Only call finalize if user stopped AND we have a message ID
	if (!renderState.messageId) {
		console.warn("No message ID for finalize - message may not be updated with stop marker");
		return;
	}

	try {
		await apiFetch("/chat/finalize", {
			method: "POST",
			body: {
				chat_id: renderState.chatId,
				user_id: renderState.userId,
				message_id: renderState.messageId,
				full_response: renderState.fullResponseText,
				stopped: stopped,
				stop_index: renderState.renderIndex
			}
		});
	} catch (error) {
		console.error("Failed to update response with stop marker:", error);
		// Message is still saved with full content, just without the stop marker
	}
}

// Stop rendering handler
function stopRendering() {
	// GUARD: Only stop if we're generating for the currently active chat
	// This prevents Stop button from affecting a previous chat after switching
	if (generatingChatId !== state.activeChatId) {
		console.debug("Stop ignored: generating for different chat");
		hideStopButton();
		return;
	}

	if (renderState.isRendering) {
		renderState.isStopped = true;
		renderState.isRendering = false;
		isGenerating = false;
		generatingChatId = null;

		if (renderState.renderTimeout) {
			clearTimeout(renderState.renderTimeout);
			renderState.renderTimeout = null;
		}
		hideStopButton();

		// Finalize with stopped=true and current render index
		finalizeResponse(true);
	}
}

// Reset render state for new message
function resetRenderState() {
	renderState.fullResponseText = "";
	renderState.renderIndex = 0;
	renderState.isRendering = false;
	renderState.isStopped = false;
	renderState.renderTimeout = null;
	renderState.currentBubble = null;
	renderState.chatId = null;
	renderState.userId = null;
	renderState.messageId = null;
}

// --- EMPTY CHAT CLEANUP ---
/**
 * AUTO-CLEANUP: Soft delete empty chats to prevent blank entries in sidebar.
 * 
 * Called when:
 * - User switches to another chat
 * - User creates a new chat
 * - User reloads/closes the page (beforeunload)
 * 
 * The backend will:
 * - Check if chat has 0 messages
 * - If empty: soft delete with title "Empty chat"
 * - If has messages: do nothing
 */
async function cleanupEmptyChat(chatId, reloadChats = false) {
	if (!chatId || !state.userId) return;

	try {
		const result = await apiFetch(`/chats/${chatId}/cleanup?user_id=${state.userId}`, {
			method: "POST"
		});

		// If chat was cleaned and we should reload, refresh the chat list
		if (reloadChats && result && result.cleaned) {
			await loadChats();
		}
	} catch (error) {
		// Silently fail - cleanup is best-effort, don't block user
		console.debug("Cleanup request failed (non-critical):", error);
	}
}

// Cleanup on page unload (reload, close tab, navigate away)
window.addEventListener("beforeunload", () => {
	if (state.activeChatId && state.userId) {
		// Use sendBeacon for reliable delivery during page unload
		// sendBeacon sends a POST request that survives page navigation
		const url = `${API_BASE}/chats/${state.activeChatId}/cleanup?user_id=${state.userId}`;
		navigator.sendBeacon(url);
	}
});

// Also cleanup when tab becomes hidden (user switches tabs/minimizes)
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "hidden" && state.activeChatId && state.userId) {
		// Use sendBeacon as it's more reliable when page is being hidden
		const url = `${API_BASE}/chats/${state.activeChatId}/cleanup?user_id=${state.userId}`;
		navigator.sendBeacon(url);
	}
});

// --- SIDEBAR LOGIC ---
sidebarToggle.addEventListener("click", () => {
	sidebar.classList.toggle("collapsed");
});

profileBtn.addEventListener("click", () => {
	settingsMenu.classList.toggle("show");
});

// Close menu when clicking outside
document.addEventListener("click", (e) => {
	// Close settings menu
	if (!settingsMenu.contains(e.target) && !profileBtn.contains(e.target)) {
		settingsMenu.classList.remove("show");
	}
	// Close all chat dropdown menus when clicking outside
	if (!e.target.closest(".menu-btn") && !e.target.closest(".chat-dropdown")) {
		document.querySelectorAll(".chat-dropdown.show").forEach(d => d.classList.remove("show"));
	}
});

themeToggle.addEventListener("click", () => {
	const html = document.documentElement;
	const current = html.getAttribute("data-theme");
	html.setAttribute("data-theme", current === "light" ? "dark" : "light");
});

// --- UTILITY FUNCTIONS ---
// Markdown Parser - Tokenizes markdown text
function parseMarkdown(text) {
	const tokens = [];
	let i = 0;

	while (i < text.length) {
		// Check for code blocks (```)
		if (i + 2 < text.length && text.substring(i, i + 3) === '```') {
			const codeEnd = text.indexOf('```', i + 3);
			if (codeEnd !== -1) {
				const block = text.substring(i + 3, codeEnd);
				const firstNewline = block.indexOf('\n');
				const language = firstNewline > 0 ? block.substring(0, firstNewline).trim() : '';
				const code = firstNewline > 0 ? block.substring(firstNewline + 1) : block;
				tokens.push({ type: 'code', language: language || 'plaintext', code: code });
				i = codeEnd + 3;
				continue;
			}
		}

		// Check for list items at start of line (-, •, or * followed by space)
		// Must be at start of text or after a newline
		if ((i === 0 || text[i - 1] === '\n') && 
			(text[i] === '-' || text[i] === '•' || text[i] === '*') &&
			i + 1 < text.length && text[i + 1] === ' ') {
			// This is a list marker - push special token
			tokens.push({ type: 'list-marker' });
			i += 2; // Skip the marker and space
			continue;
		}

		// Check for inline code (`)
		if (text[i] === '`' &&
			(i === 0 || text[i - 1] !== '`') &&
			(i + 1 >= text.length || text[i + 1] !== '`')) {
			const codeEnd = text.indexOf('`', i + 1);
			if (codeEnd !== -1) {
				tokens.push({ type: 'inline-code', code: text.substring(i + 1, codeEnd) });
				i = codeEnd + 1;
				continue;
			}
		}

		// Check for bold (**text**)
		if (i + 1 < text.length && text.substring(i, i + 2) === '**') {
			const boldEnd = text.indexOf('**', i + 2);
			if (boldEnd !== -1) {
				tokens.push({ type: 'bold', text: text.substring(i + 2, boldEnd) });
				i = boldEnd + 2;
				continue;
			}
		}

		// Check for line breaks
		if (text[i] === '\n') {
			tokens.push({ type: 'break' });
			i++;
			continue;
		}

		// Regular text
		let textEnd = i;
		while (textEnd < text.length) {
			if (textEnd + 2 < text.length && text.substring(textEnd, textEnd + 3) === '```') break;
			if (textEnd + 1 < text.length && text.substring(textEnd, textEnd + 2) === '**') break;
			if (text[textEnd] === '`' &&
				(textEnd === 0 || text[textEnd - 1] !== '`') &&
				(textEnd + 1 >= text.length || text[textEnd + 1] !== '`')) break;
			if (text[textEnd] === '\n') break;
			textEnd++;
		}

		if (textEnd > i) {
			tokens.push({ type: 'text', text: text.substring(i, textEnd) });
			i = textEnd;
		} else {
			i++;
		}
	}

	return tokens;
}

// --- WELCOME SCREEN ---
// Show welcome screen when no active chat or no messages
function showWelcomeScreen() {
	if (welcomeScreen) {
		welcomeScreen.classList.add("show");
		messagesContainer.style.display = "none";
	}
}

// Hide welcome screen when chat has messages
function hideWelcomeScreen() {
	if (welcomeScreen) {
		welcomeScreen.classList.remove("show");
		messagesContainer.style.display = "flex";
	}
}

// --- AI SUGGESTIONS (FROM BACKEND) ---
// Fetches suggestions from backend (updates 2x daily at 00:00 and 12:00)
// Fallback to hardcoded defaults if fetch fails
const DEFAULT_SUGGESTIONS = [
	"explain how neural networks learn patterns",
	"write a python script for data analysis",
	"summarize the latest tech industry news",
	"help me debug my javascript code",
	"create a study plan for machine learning",
	"generate creative ideas for my project",
];

async function fetchAndDisplaySuggestions() {
	const suggestionsGrid = document.getElementById("suggestions-grid");
	if (!suggestionsGrid) return;

	const cards = suggestionsGrid.querySelectorAll(".suggestion-card");
	
	try {
		const response = await fetch(`${API_BASE}/ui/suggestions`);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		
		const data = await response.json();
		const suggestions = data.suggestions || DEFAULT_SUGGESTIONS;
		
		// Update each card with fetched suggestion
		cards.forEach((card, index) => {
			const suggestion = suggestions[index] || DEFAULT_SUGGESTIONS[index];
			card.textContent = suggestion;
			card.dataset.suggestion = suggestion;
		});
		
		console.log("Suggestions loaded from backend");
		
	} catch (error) {
		console.warn("Failed to fetch suggestions, using defaults:", error);
		
		// Use default suggestions on error
		cards.forEach((card, index) => {
			const suggestion = DEFAULT_SUGGESTIONS[index];
			card.textContent = suggestion;
			card.dataset.suggestion = suggestion;
		});
	}
}

// Setup suggestion card click handlers
function setupSuggestionCards() {
	const suggestionCards = document.querySelectorAll(".suggestion-card");
	suggestionCards.forEach(card => {
		card.addEventListener("click", () => {
			const suggestion = card.dataset.suggestion;
			if (suggestion && suggestion !== "Loading...") {
				// Send the suggestion as a message
				sendMessage(suggestion);
			}
		});
	});
}

function removeEmptyState() {
	const emptyState = messagesContainer.querySelector(".empty");
	if (emptyState) {
		emptyState.remove();
	}
}

// ========================
// USER MESSAGE COPY FEATURE
// ========================
// Creates copy button and handles hover/long-press triggers
// Desktop: Shows after 1 second hover
// Mobile: Shows on long-press (touch & hold)

// SVG icons for copy states
const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
	<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
</svg>`;

const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<polyline points="20 6 9 17 4 12"></polyline>
</svg>`;

/**
 * Creates the copy button element for user messages
 * @param {string} textToCopy - The message text to copy
 * @returns {HTMLButtonElement} The copy button element
 */
function createUserMessageCopyButton(textToCopy) {
	const btn = document.createElement("button");
	btn.className = "user-msg-copy-btn";
	btn.innerHTML = COPY_ICON_SVG;
	btn.title = "Copy message";
	btn.type = "button";

	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		navigator.clipboard.writeText(textToCopy).then(() => {
			// Show success feedback
			btn.innerHTML = CHECK_ICON_SVG;
			btn.classList.add("copied");
			
			// Reset after 1.5 seconds
			setTimeout(() => {
				btn.innerHTML = COPY_ICON_SVG;
				btn.classList.remove("copied");
			}, 1500);
		}).catch(err => {
			console.error("Failed to copy:", err);
		});
	});

	return btn;
}

/**
 * Sets up hover (desktop) and long-press (mobile) triggers
 * to show the copy button on user messages
 * @param {HTMLElement} contentEl - The .message-content element
 */
function setupUserMessageCopyTrigger(contentEl) {
	let hoverTimer = null;
	let touchTimer = null;
	let touchStartY = 0;
	const HOVER_DELAY = 1000;  // 1 second hover delay
	const LONGPRESS_DELAY = 600; // 600ms for long-press

	// --- DESKTOP: Hover with delay ---
	contentEl.addEventListener("mouseenter", () => {
		hoverTimer = setTimeout(() => {
			contentEl.classList.add("show-copy");
		}, HOVER_DELAY);
	});

	contentEl.addEventListener("mouseleave", () => {
		clearTimeout(hoverTimer);
		// Small delay before hiding to allow clicking the button
		setTimeout(() => {
			if (!contentEl.matches(":hover")) {
				contentEl.classList.remove("show-copy");
			}
		}, 200);
	});

	// --- MOBILE: Long-press (touch & hold) ---
	contentEl.addEventListener("touchstart", (e) => {
		touchStartY = e.touches[0].clientY;
		touchTimer = setTimeout(() => {
			contentEl.classList.add("show-copy");
			// Hide after 3 seconds if not tapped
			setTimeout(() => {
				contentEl.classList.remove("show-copy");
			}, 3000);
		}, LONGPRESS_DELAY);
	}, { passive: true });

	// Cancel if user scrolls or moves finger
	contentEl.addEventListener("touchmove", (e) => {
		const moveY = e.touches[0].clientY;
		// Cancel if moved more than 10px (scrolling)
		if (Math.abs(moveY - touchStartY) > 10) {
			clearTimeout(touchTimer);
		}
	}, { passive: true });

	contentEl.addEventListener("touchend", () => {
		clearTimeout(touchTimer);
	});

	contentEl.addEventListener("touchcancel", () => {
		clearTimeout(touchTimer);
	});
}

function isQuizRequestPrompt(content) {
	if (typeof content !== "string") {
		return false;
	}

	const lowered = content.trim().toLowerCase();
	if (!lowered) {
		return false;
	}

	if (lowered.includes("quiz me") || lowered.includes("test me")) {
		return true;
	}

	if (/\b(?:make|create|generate|give)\b.*\bquiz\b/.test(lowered)) {
		return true;
	}

	return /\bquiz\b\s+(?:on|about)\b/.test(lowered);
}

function isFlashcardRequestPrompt(content) {
	if (typeof content !== "string") {
		return false;
	}

	const lowered = content.trim().toLowerCase();
	if (!lowered) {
		return false;
	}

	if (lowered.includes("flashcard") || lowered.includes("flash card") || lowered.includes("study card")) {
		return true;
	}

	if (/\b(?:make|create|generate|give)\b.*\bflash\s*cards?\b/.test(lowered)) {
		return true;
	}

	return /\bflash\s*cards?\b\s+(?:on|about|for)\b/.test(lowered);
}

function showThinkingIndicator(mode = "normal") {
	removeEmptyState();

	const wrapper = document.createElement("div");
	wrapper.classList.add("message", "ai-message", "thinking-indicator");
	wrapper.id = "thinking-indicator";

	const avatar = document.createElement("div");
	avatar.classList.add("message-avatar");
	const logo = document.createElement("img");
	logo.src = "assests/logo.png";
	logo.alt = "Saivo";
	logo.classList.add("bot-logo");
	avatar.appendChild(logo);
	wrapper.appendChild(avatar);

	const thinkingBox = document.createElement("div");
	thinkingBox.classList.add("thinking-box");
	if (mode === "quiz") {
		thinkingBox.classList.add("thinking-box-quiz");

		const quizLabel = document.createElement("div");
		quizLabel.classList.add("thinking-quiz-label");
		quizLabel.textContent = "Generating Quiz...";
		thinkingBox.appendChild(quizLabel);

		const bars = document.createElement("div");
		bars.classList.add("quiz-thinking-bars");
		for (let i = 0; i < 5; i++) {
			const bar = document.createElement("span");
			bar.classList.add("quiz-thinking-bar");
			bars.appendChild(bar);
		}
		thinkingBox.appendChild(bars);
	} else if (mode === "flashcard") {
		thinkingBox.classList.add("thinking-box-flashcard");

		const flashcardLabel = document.createElement("div");
		flashcardLabel.classList.add("thinking-flashcard-label");
		flashcardLabel.textContent = "Generating Flashcards...";
		thinkingBox.appendChild(flashcardLabel);

		const bars = document.createElement("div");
		bars.classList.add("flashcard-thinking-bars");
		for (let i = 0; i < 5; i++) {
			const bar = document.createElement("span");
			bar.classList.add("flashcard-thinking-bar");
			bars.appendChild(bar);
		}
		thinkingBox.appendChild(bars);
	}

	const dotsContainer = document.createElement("div");
	dotsContainer.classList.add("thinking-dots");

	for (let i = 0; i < 3; i++) {
		const dot = document.createElement("span");
		dot.classList.add("dot");
		dotsContainer.appendChild(dot);
	}

	thinkingBox.appendChild(dotsContainer);
	wrapper.appendChild(thinkingBox);

	messagesContainer.appendChild(wrapper);
	chatArea.scrollTop = chatArea.scrollHeight;

	return wrapper;
}

function removeThinkingIndicator() {
	const indicator = document.getElementById("thinking-indicator");
	if (indicator) {
		indicator.remove();
	}
}

function createResponseLevelBadge(level) {
	const normalizedLevel = normalizeDifficultyLevel(level);
	if (normalizedLevel === "Neutral") {
		return null;
	}

	const badge = document.createElement("div");
	badge.classList.add("ai-level-badge");
	badge.textContent = `${normalizedLevel} Level`;
	return badge;
}

function createMessageElement(message, animate = false) {
	const wrapper = document.createElement("div");
	const isAssistant = message.role === "assistant";
	wrapper.classList.add("message", isAssistant ? "ai-message" : "user-message");

	if (isAssistant) {
		const avatar = document.createElement("div");
		avatar.classList.add("message-avatar");
		const logo = document.createElement("img");
		logo.src = "assests/logo.png";
		logo.alt = "Saivo";
		logo.classList.add("bot-logo");
		avatar.appendChild(logo);
		wrapper.appendChild(avatar);
	}

	const content = document.createElement("div");
	content.classList.add("message-content");
	const trimmed = (message.content ?? "").trim();
	const responseLevel = isAssistant ? (message.response_level || message.responseLevel || null) : null;

	if (isAssistant) {
		const levelBadge = createResponseLevelBadge(responseLevel);
		if (levelBadge) {
			content.appendChild(levelBadge);
		}
	}

	// Add copy button for USER messages only
	if (!isAssistant) {
		const copyBtn = createUserMessageCopyButton(trimmed);
		content.appendChild(copyBtn);
	}

	if (isAssistant && animate) {
		// Use typewriter animation for AI messages
		wrapper.appendChild(content);
		addTypewriterAnimation(content, trimmed);
		return wrapper;
	} else {
		// Instant display for user messages or non-animated AI messages
		const tokens = parseMarkdown(trimmed);
		let currentListItem = null;  // Track if we're inside a list item
		
		tokens.forEach(token => {
			if (token.type === 'code') {
				// Close any open list item first
				if (currentListItem) {
					content.appendChild(currentListItem);
					currentListItem = null;
				}
				content.appendChild(createCodeBlock(token.language, token.code));
			} else if (token.type === 'list-marker') {
				// Close previous list item if any
				if (currentListItem) {
					content.appendChild(currentListItem);
				}
				// Start a new list item
				currentListItem = document.createElement('li');
			} else if (token.type === 'bold') {
				const strong = document.createElement('strong');
				strong.textContent = token.text;
				if (currentListItem) {
					currentListItem.appendChild(strong);
				} else {
					content.appendChild(strong);
				}
			} else if (token.type === 'inline-code') {
				const code = document.createElement('code');
				code.textContent = token.code;
				if (currentListItem) {
					currentListItem.appendChild(code);
				} else {
					content.appendChild(code);
				}
			} else if (token.type === 'break') {
				// Close list item on line break
				if (currentListItem) {
					content.appendChild(currentListItem);
					currentListItem = null;
				} else {
					content.appendChild(document.createElement('br'));
				}
			} else if (token.type === 'text') {
				const textNode = document.createTextNode(token.text);
				if (currentListItem) {
					currentListItem.appendChild(textNode);
				} else {
					content.appendChild(textNode);
				}
			}
		});
		
		// Close any remaining list item
		if (currentListItem) {
			content.appendChild(currentListItem);
		}
	}

	wrapper.appendChild(content);

	// Setup hover/long-press handlers for user messages
	if (!isAssistant) {
		setupUserMessageCopyTrigger(content);
	}

	return wrapper;
}

// Create code block with header and copy button
function createCodeBlock(language, code) {
	const container = document.createElement('div');
	container.className = 'code-block-container';

	const header = document.createElement('div');
	header.className = 'code-block-header';

	const langLabel = document.createElement('span');
	langLabel.className = 'code-block-lang';
	langLabel.textContent = language;

	const copyBtn = document.createElement('button');
	copyBtn.className = 'copy-code-btn';
	copyBtn.innerHTML = '<span>Copy</span>';
	copyBtn.onclick = () => {
		navigator.clipboard.writeText(code).then(() => {
			copyBtn.innerHTML = '<span>Copied!</span>';
			copyBtn.classList.add('copied');
			setTimeout(() => {
				copyBtn.innerHTML = '<span>Copy</span>';
				copyBtn.classList.remove('copied');
			}, 2000);
		});
	};

	header.appendChild(langLabel);
	header.appendChild(copyBtn);

	const codeContent = document.createElement('div');
	codeContent.className = 'code-block-content';
	const pre = document.createElement('pre');
	pre.textContent = code;
	codeContent.appendChild(pre);

	container.appendChild(header);
	container.appendChild(codeContent);

	return container;
}

// Typewriter animation with formatting and stop support
function addTypewriterAnimation(bubble, markdownText) {
	// Initialize render state
	renderState.fullResponseText = markdownText;
	renderState.renderIndex = 0;
	renderState.isRendering = true;
	renderState.isStopped = false;
	renderState.currentBubble = bubble;

	// Show stop button when rendering starts
	showStopButton();

	const tokens = parseMarkdown(markdownText);

	// Convert tokens to words with formatting info
	const words = [];
	let skipNextBreak = false;

	tokens.forEach((token) => {
		if (skipNextBreak && token.type === 'break') {
			skipNextBreak = false;
			return;
		}

		if (token.type === 'code') {
			words.push({ type: 'code', language: token.language, code: token.code });
		} else if (token.type === 'list-marker') {
			// New list item detected by parser
			words.push({ type: 'list-start' });
			skipNextBreak = true;
		} else if (token.type === 'break') {
			words.push({ type: 'break' });
		} else if (token.type === 'bold') {
			const boldWords = token.text.split(' ');
			boldWords.forEach((word, i) => {
				words.push({ type: 'bold', text: word + (i < boldWords.length - 1 ? ' ' : '') });
			});
		} else if (token.type === 'inline-code') {
			words.push({ type: 'inline-code', code: token.code });
		} else if (token.type === 'text') {
			// Just split text into words
			const textWords = token.text.split(' ');
			textWords.forEach((word, i) => {
				if (word) {
					words.push({ type: 'text', text: word + (i < textWords.length - 1 ? ' ' : '') });
				}
			});
		}
	});

	let currentIndex = 0;
	let currentList = null;
	let charIndex = 0;
	let lastScrollCheck = 0;
	let userScrolledAway = false;
	let renderedCharCount = 0;  // Track total rendered characters for stop_index

	// Helper function to check if user is near bottom
	function isNearBottom() {
		const threshold = 150; // pixels from bottom
		return chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < threshold;
	}

	// Track user scroll events to detect manual scrolling
	let scrollTimeout;
	const originalScrollTop = chatArea.scrollTop;

	const scrollHandler = () => {
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			// If user scrolled up significantly, stop auto-scrolling
			if (!isNearBottom()) {
				userScrolledAway = true;
			} else {
				userScrolledAway = false;
			}
		}, 100);
	};

	chatArea.addEventListener('scroll', scrollHandler);

	// Helper function to auto-scroll only occasionally
	function autoScrollIfNeeded() {
		if (!userScrolledAway && isNearBottom()) {
			chatArea.scrollTop = chatArea.scrollHeight;
		}
	}

	// Helper function to complete rendering (called when done or stopped)
	function finishRendering() {
		chatArea.removeEventListener('scroll', scrollHandler);
		renderState.isRendering = false;

		// CHAT-SCOPED GENERATION: Reset generation state when rendering completes
		isGenerating = false;
		generatingChatId = null;

		hideStopButton();
		autoScrollIfNeeded();

		// If rendering completed naturally (not stopped), finalize with stopped=false
		if (!renderState.isStopped) {
			finalizeResponse(false);
		}
		// If stopped, finalizeResponse was already called in stopRendering()
	}

	function typeNextWord() {
		// Check if stopped by user
		if (renderState.isStopped) {
			finishRendering();
			return;
		}

		if (currentIndex >= words.length) {
			finishRendering();
			return;
		}

		const word = words[currentIndex];

		// Handle list start
		if (word.type === 'list-start') {
			if (currentList) {
				bubble.appendChild(currentList);
			}
			currentList = document.createElement('li');
			currentIndex++;
			renderState.renderTimeout = setTimeout(typeNextWord, 1);
			return;
		}

		// Handle code blocks
		if (word.type === 'code') {
			if (currentList) {
				bubble.appendChild(currentList);
				currentList = null;
			}
			bubble.appendChild(createCodeBlock(word.language, word.code));
			renderedCharCount += word.code.length;  // Track code block characters
			renderState.renderIndex = renderedCharCount;
			currentIndex++;
			autoScrollIfNeeded();
			renderState.renderTimeout = setTimeout(typeNextWord, 3);
			return;
		}

		// Handle line breaks
		if (word.type === 'break') {
			if (currentList) {
				bubble.appendChild(currentList);
				currentList = null;
			}
			bubble.appendChild(document.createElement('br'));
			renderedCharCount += 1;  // Track line break as 1 character
			renderState.renderIndex = renderedCharCount;
			currentIndex++;
			// Only auto-scroll on line breaks, not every character
			const now = Date.now();
			if (now - lastScrollCheck > 200) {
				autoScrollIfNeeded();
				lastScrollCheck = now;
			}
			renderState.renderTimeout = setTimeout(typeNextWord, 1);
			return;
		}

		// Handle inline code
		if (word.type === 'inline-code') {
			if (currentList) {
				bubble.appendChild(currentList);
				currentList = null;
			}
			const codeEl = document.createElement('code');
			let codeCharIndex = 0;
			function typeCodeChar() {
				// Check if stopped
				if (renderState.isStopped) {
					bubble.appendChild(codeEl);
					finishRendering();
					return;
				}
				if (codeCharIndex < word.code.length) {
					codeEl.textContent += word.code[codeCharIndex];
					codeCharIndex++;
					renderedCharCount++;  // Track inline code characters
					renderState.renderIndex = renderedCharCount;
					renderState.renderTimeout = setTimeout(typeCodeChar, 2);
				} else {
					bubble.appendChild(codeEl);
					currentIndex++;
					charIndex = 0;
					renderState.renderTimeout = setTimeout(typeNextWord, 2);
				}
			}
			typeCodeChar();
			return;
		}

		// Handle text and bold
		let target = (word.inListItem && currentList) ? currentList : bubble;
		let textElement;

		if (word.type === 'bold') {
			textElement = document.createElement('strong');
			target.appendChild(textElement);
		} else {
			textElement = target;
		}

		// Type character by character
		if (charIndex < word.text.length) {
			textElement.appendChild(document.createTextNode(word.text[charIndex]));
			charIndex++;
			renderedCharCount++;  // Track rendered character count
			renderState.renderIndex = renderedCharCount;  // Update state for stop
			// Only scroll occasionally, not on every character
			const now = Date.now();
			if (now - lastScrollCheck > 300) {
				autoScrollIfNeeded();
				lastScrollCheck = now;
			}
			renderState.renderTimeout = setTimeout(typeNextWord, 1 + Math.random() * 2);
		} else {
			charIndex = 0;
			currentIndex++;
			renderState.renderTimeout = setTimeout(typeNextWord, 2);
		}
	}

	typeNextWord();
}

function appendMessage(message, animate = false) {
	if (!message || typeof message.content !== "string") {
		console.error("Invalid message:", message);
		return null;
	}
	hideWelcomeScreen();  // Hide welcome screen when message is added
	removeEmptyState();
	const element = createMessageElement(message, animate);
	messagesContainer.appendChild(element);
	return element;
}

function setChatStatus(message, isError = true) {
	chatStatus.textContent = message ?? "";
	chatStatus.style.color = isError ? "#dc2626" : "#15803d";
}

async function apiFetch(path, options = {}) {
	const config = {
		method: options.method || "GET",
		headers: options.headers ? { ...options.headers } : {},
	};

	if (options.body && !(options.body instanceof FormData)) {
		config.headers["Content-Type"] = "application/json";
		config.body = JSON.stringify(options.body);
	} else if (options.body) {
		config.body = options.body;
	}

	const response = await fetch(`${API_BASE}${path}`, config);
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
}

function storeSession() {
	if (state.activeChatId) {
		localStorage.setItem("activeChatId", state.activeChatId);
	}
}

function clearSession() {
	localStorage.removeItem("userId");
	localStorage.removeItem("username");
	localStorage.removeItem("activeChatId");
}

async function loadChats() {
	if (!state.userId) {
		return;
	}

	try {
		const data = await apiFetch(`/chats/${state.userId}`);
		renderChatList(data.chats || []);
		setChatStatus("", false);
	} catch (error) {
		setChatStatus(error.message || "Unable to load chats");
	}
}

function renderChatList(chats) {
	// Clean up orphaned dropdown menus from previous render
	// (dropdowns are appended to body, not chatList, so they persist)
	document.querySelectorAll(".chat-dropdown").forEach(d => d.remove());

	chatList.innerHTML = "";
	if (!Array.isArray(chats) || chats.length === 0) {
		const emptyState = document.createElement("p");
		emptyState.textContent = "No chats yet. Create one to get started.";
		emptyState.classList.add("empty");
		chatList.appendChild(emptyState);
		state.activeChatId = null;
		localStorage.removeItem("activeChatId");
		updateTitleBar("Saivo");
		return;
	}

	let activeFound = false;
	chats.forEach((chat) => {
		const button = document.createElement("button");
		button.className = "history-item";
		button.dataset.chatId = chat.id;

		const icon = document.createElement("ion-icon");
		icon.setAttribute("name", "chatbubble-ellipses-outline");
		button.appendChild(icon);

		// Chat title with CSS ellipsis (no text modification)
		const label = document.createElement("span");
		label.className = "chat-title";
		label.textContent = chat.title || "Untitled Chat";
		button.appendChild(label);

		// Three-dot menu button (appears on hover via CSS)
		const menuBtn = document.createElement("button");
		menuBtn.className = "menu-btn";
		menuBtn.type = "button";
		const menuIcon = document.createElement("ion-icon");
		menuIcon.setAttribute("name", "ellipsis-vertical");
		menuBtn.appendChild(menuIcon);
		button.appendChild(menuBtn);

		// Dropdown menu container - appended to body for proper z-index
		const dropdown = document.createElement("div");
		dropdown.className = "chat-dropdown";

		// Delete button in dropdown
		const deleteBtn = document.createElement("button");
		deleteBtn.className = "delete-btn";
		deleteBtn.type = "button";
		const deleteIcon = document.createElement("ion-icon");
		deleteIcon.setAttribute("name", "trash-outline");
		deleteBtn.appendChild(deleteIcon);
		deleteBtn.appendChild(document.createTextNode("Delete"));
		dropdown.appendChild(deleteBtn);
		document.body.appendChild(dropdown);  // Append to body to escape overflow

		// Menu button click - toggle dropdown with fixed positioning
		menuBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			e.preventDefault();

			// Close other dropdowns first
			document.querySelectorAll(".chat-dropdown.show").forEach(d => {
				if (d !== dropdown) d.classList.remove("show");
			});

			// Position dropdown relative to menu button
			const rect = menuBtn.getBoundingClientRect();
			dropdown.style.top = `${rect.bottom + 4}px`;
			dropdown.style.left = `${rect.left - 100}px`;  // Offset left so it doesn't go off screen

			dropdown.classList.toggle("show");
		});

		// Delete button click - soft delete chat
		deleteBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			dropdown.classList.remove("show");

			try {
				// Call soft delete API
				await apiFetch(`/chats/${chat.id}?user_id=${state.userId}`, {
					method: "DELETE"
				});

				// Remove dropdown from body and chat from UI list
				dropdown.remove();
				button.remove();

				// If deleted chat was active, create new chat state
				if (chat.id === state.activeChatId) {
					createNewChat();
				}

				// Check if chat list is now empty
				if (chatList.querySelectorAll(".history-item").length === 0) {
					const emptyState = document.createElement("p");
					emptyState.className = "empty";
					emptyState.textContent = "No chats yet. Start a new conversation.";
					chatList.appendChild(emptyState);
				}
			} catch (error) {
				console.error("Failed to delete chat:", error);
				setChatStatus(error.message || "Failed to delete chat");
			}
		});

		if (chat.id === state.activeChatId) {
			button.classList.add("active");
			chatTitle.textContent = chat.title || "Untitled Chat";
			activeFound = true;
		}

		// Click on chat item (not menu) to select it
		button.addEventListener("click", (e) => {
			// Don't activate if clicking menu or dropdown
			if (e.target.closest(".menu-btn") || e.target.closest(".chat-dropdown")) {
				return;
			}
			setActiveChat(chat.id, chat.title);
		});
		chatList.appendChild(button);
	});

	if (!activeFound && state.activeChatId) {
		// If the stored activeChatId doesn't exist in chat list, clear it
		state.activeChatId = null;
		localStorage.removeItem("activeChatId");
		updateTitleBar("Saivo");
	}
}

function setActiveChat(chatId, title) {
	// Close sidebar on mobile when selecting a chat
	if (isMobileView()) {
		closeMobileSidebar();
	}

	// AUTO-CLEANUP: Clean up previous chat if it was empty before switching
	if (state.activeChatId && state.activeChatId !== chatId) {
		cleanupEmptyChat(state.activeChatId, true);  // Reload chats to remove empty one
	}

	// CHAT-SCOPED GENERATION FIX:
	// When switching chats during AI generation, treat previous response as FULLY GENERATED
	// Do NOT send stop signal - backend already saved the full response
	if (isGenerating && generatingChatId && generatingChatId !== chatId) {
		// Reset generation state without stopping (response is already saved)
		isGenerating = false;
		generatingChatId = null;
		// Stop the typewriter animation silently (no stop signal sent)
		if (renderState.isRendering) {
			renderState.isRendering = false;
			if (renderState.renderTimeout) {
				clearTimeout(renderState.renderTimeout);
				renderState.renderTimeout = null;
			}
		}
	}

	state.activeChatId = chatId;
	storeSession();
	updateTitleBar(title || "Untitled Chat");

	const buttons = chatList.querySelectorAll(".history-item");
	buttons.forEach((btn) => {
		btn.classList.toggle("active", btn.dataset.chatId === chatId);
	});

	// Update stop button visibility for new chat context
	updateStopButtonVisibility();

	loadMessages();
}

function createNewChat() {
	// AUTO-CLEANUP: Clean up current chat if it was empty before creating new one
	if (state.activeChatId) {
		cleanupEmptyChat(state.activeChatId, true);  // Reload chats to remove empty one
	}

	// CHAT-SCOPED GENERATION FIX:
	// When creating new chat during AI generation, treat previous response as FULLY GENERATED
	if (isGenerating && generatingChatId) {
		isGenerating = false;
		generatingChatId = null;
		if (renderState.isRendering) {
			renderState.isRendering = false;
			if (renderState.renderTimeout) {
				clearTimeout(renderState.renderTimeout);
				renderState.renderTimeout = null;
			}
		}
	}

	// Clear active chat
	state.activeChatId = null;
	localStorage.removeItem("activeChatId");
	setSessionSubject("Anyone");
	messagesContainer.innerHTML = "";
	updateTitleBar("Saivo");
	setChatStatus("", false);

	// Show welcome screen for new chat
	showWelcomeScreen();

	// Hide stop button (no active generation in new chat)
	hideStopButton();

	// Clear all chat highlights
	const buttons = chatList.querySelectorAll(".history-item");
	buttons.forEach((btn) => btn.classList.remove("active"));
}

async function loadMessages() {
	if (!state.activeChatId) {
		messagesContainer.innerHTML = "";
		showWelcomeScreen();  // Show welcome when no active chat
		return;
	}

	try {
		const [messagesPayload, quizzesPayload, flashcardsPayload] = await Promise.all([
			apiFetch(`/messages/${state.activeChatId}`),
			apiFetch(`/quizzes/chat/${state.activeChatId}`).catch(() => ({ quizzes: [] })),
			apiFetch(`/flashcards/chat/${state.activeChatId}`).catch(() => ({ flashcards: [] })),
		]);

		const allMessages = Array.isArray(messagesPayload) ? [...messagesPayload] : [];
		allMessages.sort((a, b) => {
			const idxA = Number.isInteger(a && a.message_index) ? a.message_index : 0;
			const idxB = Number.isInteger(b && b.message_index) ? b.message_index : 0;
			return idxA - idxB;
		});

		const rawQuizzes = Array.isArray(quizzesPayload && quizzesPayload.quizzes)
			? quizzesPayload.quizzes
			: [];
		const quizzes = rawQuizzes
			.map((rawQuiz) => normalizeStoredQuizRecord(rawQuiz))
			.filter((quiz) => !!quiz);
		const quizzesByIndex = buildQuizIndexMap(quizzes);

		const rawFlashcards = Array.isArray(flashcardsPayload && flashcardsPayload.flashcards)
			? flashcardsPayload.flashcards
			: [];
		const flashcards = rawFlashcards
			.map((rawFlashcard) => normalizeStoredFlashcardRecord(rawFlashcard))
			.filter((flashcard) => !!flashcard);
		const flashcardsByIndex = buildFlashcardIndexMap(flashcards);

		messagesContainer.innerHTML = "";

		if (allMessages.length > 0 || quizzes.length > 0 || flashcards.length > 0) {
			hideWelcomeScreen();  // Hide welcome when chat has messages
			allMessages.forEach((msg, fallbackIndex) => {
				const messageIndex = Number.isInteger(msg && msg.message_index)
					? msg.message_index
					: fallbackIndex;

				if (!isQuizSummaryMessage(msg) && !isFlashcardSummaryMessage(msg)) {
					appendMessage(msg, false);
				}

				renderQuizzesAtMessageIndex(quizzesByIndex, messageIndex, null, false);
				renderFlashcardsAtMessageIndex(flashcardsByIndex, messageIndex, null, false);
			});

			chatArea.scrollTop = chatArea.scrollHeight;
		} else {
			showWelcomeScreen();  // Show welcome when chat has no messages
		}

		setChatStatus("", false);
	} catch (error) {
		setChatStatus(error.message || "Unable to load messages");
	}
}

async function sendMessage(content) {
	if (isSendingMessage || !content) return;

	const trimmedContent = content.trim();
	if (!trimmedContent) return;

	// If no active chat, create one first
	if (!state.activeChatId) {
		if (!state.userId) {
			window.location.href = "login.html";
			return;
		}

		try {
			const chat = await apiFetch("/chats", {
				method: "POST",
				body: { user_id: state.userId },
			});

			state.activeChatId = chat.id;
			storeSession();
			chatTitle.textContent = chat.title || "New Chat";

			// Reload chats to update sidebar
			await loadChats();

			// Highlight the newly created chat
			const buttons = chatList.querySelectorAll(".history-item");
			buttons.forEach((btn) => {
				btn.classList.toggle("active", btn.dataset.chatId === chat.id);
			});
		} catch (error) {
			setChatStatus(error.message || "Unable to create chat");
			return;
		}
	}

	isSendingMessage = true;
	messageInput.value = "";
	messageInput.style.height = "auto";
	setChatStatus("", false);

	const difficultyAtSend = normalizeDifficultyLevel(state.difficultyLevel);
	const subjectAtSend = normalizeSessionSubject(state.sessionSubject);
	const apiPrompt = buildApiPrompt(trimmedContent, difficultyAtSend);

	// CHAT-SCOPED GENERATION: Track which chat is generating
	generatingChatId = state.activeChatId;
	isGenerating = true;

	const userMessage = { role: "user", content: trimmedContent };
	appendMessage(userMessage, false);
	chatArea.scrollTop = chatArea.scrollHeight;

	const thinkingStartTime = Date.now();
	const thinkingMode = isFlashcardRequestPrompt(trimmedContent)
		? "flashcard"
		: (isQuizRequestPrompt(trimmedContent) ? "quiz" : "normal");
	showThinkingIndicator(thinkingMode);

	try {
		const response = await apiFetch("/chat/send", {
			method: "POST",
			body: {
				chat_id: state.activeChatId,
				user_id: state.userId,
				content: trimmedContent,
				api_prompt: apiPrompt,
				difficulty_level: difficultyAtSend,
				session_subject: subjectAtSend,
			},
		});

		const thinkingElapsed = Date.now() - thinkingStartTime;
		const minThinkingTime = 2500;
		const remainingTime = Math.max(0, minThinkingTime - thinkingElapsed);

		setTimeout(() => {
			removeThinkingIndicator();
			setTimeout(async () => {
				if (!response) return;

				const responseLevel = response.response_level || (difficultyAtSend !== "Neutral" ? difficultyAtSend : null);

				// REAL-TIME TITLE UPDATE: If server renamed the chat, update UI
				if (response.new_title) {
					chatTitle.textContent = response.new_title;
					const chatItem = chatList.querySelector(`[data-chat-id="${state.activeChatId}"]`);
					if (chatItem) {
						const titleSpan = chatItem.querySelector("span");
						if (titleSpan) {
							titleSpan.textContent = response.new_title;
						}
					}
				}

				const responseType = response.type || "text";
				const flashcardPayload = extractFlashcardPayloadFromResponse(response);
				const quizPayload = extractQuizPayloadFromResponse(response);

				if (flashcardPayload) {
					// --- FLASHCARD RESPONSE (LAUNCHER CARD) ---
					hideWelcomeScreen();
					removeEmptyState();
					isGenerating = false;
					generatingChatId = null;
					hideStopButton();

					let persistedFlashcardMeta = null;
					try {
						persistedFlashcardMeta = await saveFlashcardsForChat(flashcardPayload, response);
					} catch (persistError) {
						console.error("Failed to persist flashcards:", persistError);
					}

					renderFlashcardLauncherCard(
						flashcardPayload,
						responseLevel,
						persistedFlashcardMeta || {},
						true,
					);
					chatArea.scrollTop = chatArea.scrollHeight;

				} else if (quizPayload) {
					// --- QUIZ RESPONSE (LAUNCHER CARD) ---
					hideWelcomeScreen();
					removeEmptyState();
					isGenerating = false;
					generatingChatId = null;
					hideStopButton();

					let persistedQuizMeta = null;
					try {
						persistedQuizMeta = await saveQuizForChat(quizPayload, response);
					} catch (persistError) {
						console.error("Failed to persist quiz:", persistError);
					}

					renderQuizLauncherCard(
						quizPayload,
						responseLevel,
						persistedQuizMeta || {},
						true,
					);
					chatArea.scrollTop = chatArea.scrollHeight;

				} else if (responseType === "summary" && response.summary) {
					// --- SUMMARY RESPONSE ---
					hideWelcomeScreen();
					removeEmptyState();
					isGenerating = false;
					generatingChatId = null;
					hideStopButton();
					renderSummaryCard(response.summary, responseLevel);
					chatArea.scrollTop = chatArea.scrollHeight;

				} else if (typeof response.content === "string") {
					// --- NORMAL TEXT RESPONSE ---
					renderState.chatId = response.chat_id || state.activeChatId;
					renderState.userId = response.user_id || state.userId;
					renderState.messageId = response.message_id;

					const aiMessage = {
						role: "assistant",
						content: response.content,
						response_level: responseLevel,
					};
					appendMessage(aiMessage, true);

					const isAtBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
					if (isAtBottom) {
						setTimeout(() => {
							chatArea.scrollTop = chatArea.scrollHeight;
						}, 100);
					}
				}
			}, 500);
		}, remainingTime);
	} catch (error) {
		removeThinkingIndicator();
		// Reset generation state on error
		isGenerating = false;
		generatingChatId = null;
		hideStopButton();

		messageInput.value = trimmedContent;
		messageInput.focus();
		setChatStatus(error.message || "Unable to send message");
	} finally {
		isSendingMessage = false;
		messageInput.focus();
	}
}

// ========================
// EDUCATIONAL FEATURES
// ========================
// Quiz Cards, Summary Cards, Difficulty Level
// ========================

/**
 * Attempts to parse quiz JSON from assistant content.
 */
function parseFlashcardJsonContent(content) {
	if (typeof content !== "string") {
		return null;
	}

	const trimmed = content.trim();
	if (!trimmed) {
		return null;
	}

	let candidate = trimmed;
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (fenced && fenced[1]) {
		candidate = fenced[1].trim();
	}

	try {
		const parsed = JSON.parse(candidate);
		return normalizeFlashcardPayload(parsed);
	} catch (_error) {
		return null;
	}
}

function normalizeFlashcardPayload(rawFlashcard) {
	if (!rawFlashcard || typeof rawFlashcard !== "object") {
		return null;
	}

	const type = String(rawFlashcard.type || "").trim().toLowerCase();
	if (type !== "flashcard") {
		return null;
	}

	const topic = typeof rawFlashcard.topic === "string" && rawFlashcard.topic.trim()
		? rawFlashcard.topic.trim()
		: "General Topic";

	if (!Array.isArray(rawFlashcard.cards) || rawFlashcard.cards.length === 0) {
		return null;
	}

	const normalizedCards = [];
	rawFlashcard.cards.forEach((rawCard, index) => {
		if (!rawCard || typeof rawCard !== "object") {
			return;
		}

		const front = typeof rawCard.front === "string" ? rawCard.front.trim() : "";
		const back = typeof rawCard.back === "string" ? rawCard.back.trim() : "";
		if (!front || !back) {
			return;
		}

		normalizedCards.push({
			id: typeof rawCard.id === "string" && rawCard.id.trim() ? rawCard.id.trim() : `c${index + 1}`,
			front,
			back,
		});
	});

	if (normalizedCards.length === 0) {
		return null;
	}

	return {
		type: "flashcard",
		topic,
		cards: normalizedCards,
	};
}

function extractFlashcardPayloadFromResponse(response) {
	if (!response || typeof response !== "object") {
		return null;
	}

	if (response.flashcard) {
		const normalizedFlashcard = normalizeFlashcardPayload(response.flashcard);
		if (normalizedFlashcard) {
			return normalizedFlashcard;
		}
	}

	if (typeof response.content === "string") {
		return parseFlashcardJsonContent(response.content);
	}

	return null;
}

function isFlashcardSummaryText(content) {
	if (typeof content !== "string") {
		return false;
	}
	return content.trim().startsWith("📚 Flashcards:");
}

function isFlashcardSummaryMessage(message) {
	if (!message || typeof message !== "object") {
		return false;
	}
	return message.role === "assistant" && isFlashcardSummaryText(message.content);
}

function buildFlashcardSavePayload(flashcardData) {
	const normalizedFlashcard = normalizeFlashcardPayload(flashcardData);
	if (!normalizedFlashcard) {
		return null;
	}

	const cards = normalizedFlashcard.cards.map((card) => ({
		front: card.front,
		back: card.back,
	}));

	return {
		topic: normalizedFlashcard.topic,
		cards,
	};
}

async function saveFlashcardsForChat(flashcardData, responsePayload) {
	if (!state.userId || !state.activeChatId) {
		return null;
	}

	const flashcardSavePayload = buildFlashcardSavePayload(flashcardData);
	if (!flashcardSavePayload) {
		return null;
	}

	const responseMessageIndex = responsePayload && responsePayload.message_index;
	const messageIndex = Number.isInteger(responseMessageIndex)
		? responseMessageIndex
		: null;

	if (messageIndex === null || messageIndex < 0) {
		console.error("Cannot persist flashcards without a valid message_index from backend response");
		return null;
	}

	const savedFlashcards = await apiFetch("/flashcards", {
		method: "POST",
		body: {
			user_id: state.userId,
			chat_id: state.activeChatId,
			message_index: messageIndex,
			topic: flashcardSavePayload.topic,
			cards: flashcardSavePayload.cards,
		},
	});

	if (!savedFlashcards || typeof savedFlashcards !== "object") {
		return null;
	}

	return {
		flashcardId: savedFlashcards.flashcard_id || null,
		messageIndex: typeof savedFlashcards.message_index === "number" ? savedFlashcards.message_index : messageIndex,
	};
}

function normalizeStoredFlashcardRecord(rawFlashcards) {
	if (!rawFlashcards || typeof rawFlashcards !== "object") {
		return null;
	}

	const rawCards = Array.isArray(rawFlashcards.cards) ? rawFlashcards.cards : [];
	const preparedCards = rawCards.map((card, index) => ({
		id: typeof card.id === "string" ? card.id : `c${index + 1}`,
		front: card.front,
		back: card.back,
	}));

	const normalizedFlashcards = normalizeFlashcardPayload({
		type: "flashcard",
		topic: rawFlashcards.topic,
		cards: preparedCards,
	});

	if (!normalizedFlashcards) {
		return null;
	}

	return {
		flashcard_id: typeof rawFlashcards.flashcard_id === "string" ? rawFlashcards.flashcard_id : "",
		message_index: Number.isInteger(rawFlashcards.message_index) ? rawFlashcards.message_index : 0,
		flashcard: normalizedFlashcards,
	};
}

function buildFlashcardIndexMap(flashcards) {
	const flashcardMap = new Map();
	flashcards.forEach((flashcardRecord) => {
		const index = flashcardRecord.message_index;
		if (!flashcardMap.has(index)) {
			flashcardMap.set(index, []);
		}
		flashcardMap.get(index).push(flashcardRecord);
	});
	return flashcardMap;
}

function renderFlashcardsAtMessageIndex(flashcardMap, messageIndex, responseLevel = null, autoScroll = false) {
	const flashcardRecords = flashcardMap.get(messageIndex) || [];
	flashcardRecords.forEach((flashcardRecord) => {
		renderFlashcardLauncherCard(
			flashcardRecord.flashcard,
			responseLevel,
			{
				flashcardId: flashcardRecord.flashcard_id,
				messageIndex: flashcardRecord.message_index,
			},
			autoScroll,
		);
	});
}

function parseQuizJsonContent(content) {
	if (typeof content !== "string") {
		return null;
	}

	const trimmed = content.trim();
	if (!trimmed) {
		return null;
	}

	let candidate = trimmed;
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (fenced && fenced[1]) {
		candidate = fenced[1].trim();
	}

	try {
		const parsed = JSON.parse(candidate);
		return normalizeQuizPayload(parsed);
	} catch (_error) {
		return null;
	}
}

function normalizeQuizOptions(options) {
	const normalized = {};
	const optionKeys = ["A", "B", "C", "D"];

	if (Array.isArray(options)) {
		optionKeys.forEach((key, index) => {
			const entry = options[index];
			if (typeof entry !== "string") return;

			let text = entry.trim();
			const prefixRegex = new RegExp(`^${key}[\\.\\)\\-:]?\\s*`, "i");
			text = text.replace(prefixRegex, "").trim();
			if (text) {
				normalized[key] = text;
			}
		});
		return normalized;
	}

	if (options && typeof options === "object") {
		optionKeys.forEach((key) => {
			const value = options[key] || options[key.toLowerCase()];
			if (typeof value === "string" && value.trim()) {
				normalized[key] = value.trim();
			}
		});
	}

	return normalized;
}

function normalizeQuizPayload(rawQuiz) {
	if (!rawQuiz || typeof rawQuiz !== "object") {
		return null;
	}

	const type = String(rawQuiz.type || "").trim().toLowerCase();
	if (type !== "quiz") {
		return null;
	}

	const topic = typeof rawQuiz.topic === "string" && rawQuiz.topic.trim()
		? rawQuiz.topic.trim()
		: "General Knowledge";

	if (!Array.isArray(rawQuiz.questions) || rawQuiz.questions.length === 0) {
		return null;
	}

	const normalizedQuestions = [];
	rawQuiz.questions.forEach((rawQuestion, index) => {
		if (!rawQuestion || typeof rawQuestion !== "object") {
			return;
		}

		const questionText = typeof rawQuestion.question === "string"
			? rawQuestion.question.trim()
			: "";
		const options = normalizeQuizOptions(rawQuestion.options);
		if (!questionText || Object.keys(options).length !== 4) {
			return;
		}

		const rawCorrect = String(rawQuestion.correct || rawQuestion.correct_option || "A").trim().toUpperCase();
		const correctOption = ["A", "B", "C", "D"].includes(rawCorrect.charAt(0))
			? rawCorrect.charAt(0)
			: "A";

		normalizedQuestions.push({
			id: typeof rawQuestion.id === "string" && rawQuestion.id.trim() ? rawQuestion.id.trim() : `q${index + 1}`,
			topic,
			question: questionText,
			options,
			correct_option: correctOption,
			explanation: typeof rawQuestion.explanation === "string" ? rawQuestion.explanation.trim() : "",
		});
	});

	if (normalizedQuestions.length === 0) {
		return null;
	}

	return {
		type: "quiz",
		topic,
		questions: normalizedQuestions,
	};
}

function extractQuizPayloadFromResponse(response) {
	if (!response || typeof response !== "object") {
		return null;
	}

	if (response.quiz) {
		const normalizedQuiz = normalizeQuizPayload(response.quiz);
		if (normalizedQuiz) {
			return normalizedQuiz;
		}
	}

	if (typeof response.content === "string") {
		return parseQuizJsonContent(response.content);
	}

	return null;
}

function isQuizSummaryText(content) {
	if (typeof content !== "string") {
		return false;
	}
	return content.trim().startsWith("📝 Quiz:");
}

function isQuizSummaryMessage(message) {
	if (!message || typeof message !== "object") {
		return false;
	}
	return message.role === "assistant" && isQuizSummaryText(message.content);
}

function buildQuizSavePayload(quizData) {
	const normalizedQuiz = normalizeQuizPayload(quizData);
	if (!normalizedQuiz) {
		return null;
	}

	const questions = normalizedQuiz.questions.map((question) => ({
		question: question.question,
		options: {
			A: question.options.A,
			B: question.options.B,
			C: question.options.C,
			D: question.options.D,
		},
		correct_answer: question.correct_option,
		explanation: question.explanation || "",
	}));

	return {
		topic: normalizedQuiz.topic,
		questions,
	};
}

async function saveQuizForChat(quizData, responsePayload) {
	if (!state.userId || !state.activeChatId) {
		return null;
	}

	const quizSavePayload = buildQuizSavePayload(quizData);
	if (!quizSavePayload) {
		return null;
	}

	const responseMessageIndex = responsePayload && responsePayload.message_index;
	const messageIndex = Number.isInteger(responseMessageIndex)
		? responseMessageIndex
		: null;

	if (messageIndex === null || messageIndex < 0) {
		console.error("Cannot persist quiz without a valid message_index from backend response");
		return null;
	}

	const savedQuiz = await apiFetch("/quizzes", {
		method: "POST",
		body: {
			user_id: state.userId,
			chat_id: state.activeChatId,
			message_index: messageIndex,
			topic: quizSavePayload.topic,
			questions: quizSavePayload.questions,
		},
	});

	if (!savedQuiz || typeof savedQuiz !== "object") {
		return null;
	}

	return {
		quizId: savedQuiz.quiz_id || null,
		messageIndex: typeof savedQuiz.message_index === "number" ? savedQuiz.message_index : messageIndex,
	};
}

function normalizeStoredQuizRecord(rawQuiz) {
	if (!rawQuiz || typeof rawQuiz !== "object") {
		return null;
	}

	const rawQuestions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
	const preparedQuestions = rawQuestions.map((question, index) => ({
		id: typeof question.id === "string" ? question.id : `q${index + 1}`,
		question: question.question,
		options: question.options,
		correct_option: question.correct_answer || question.correct || question.correct_option || "A",
		explanation: question.explanation || "",
	}));

	const normalizedQuiz = normalizeQuizPayload({
		type: "quiz",
		topic: rawQuiz.topic,
		questions: preparedQuestions,
	});

	if (!normalizedQuiz) {
		return null;
	}

	return {
		quiz_id: typeof rawQuiz.quiz_id === "string" ? rawQuiz.quiz_id : "",
		message_index: Number.isInteger(rawQuiz.message_index) ? rawQuiz.message_index : 0,
		quiz: normalizedQuiz,
	};
}

function buildQuizIndexMap(quizzes) {
	const quizMap = new Map();
	quizzes.forEach((quizRecord) => {
		const index = quizRecord.message_index;
		if (!quizMap.has(index)) {
			quizMap.set(index, []);
		}
		quizMap.get(index).push(quizRecord);
	});
	return quizMap;
}

function renderQuizzesAtMessageIndex(quizMap, messageIndex, responseLevel = null, autoScroll = false) {
	const quizRecords = quizMap.get(messageIndex) || [];
	quizRecords.forEach((quizRecord) => {
		renderQuizLauncherCard(
			quizRecord.quiz,
			responseLevel,
			{
				quizId: quizRecord.quiz_id,
				messageIndex: quizRecord.message_index,
			},
			autoScroll,
		);
	});
}

const flashcardModalState = {
	overlay: null,
	topic: null,
	loadingView: null,
	loadingBar: null,
	contentView: null,
	counter: null,
	cardInner: null,
	frontFace: null,
	backFace: null,
	flipBtn: null,
	prevBtn: null,
	nextBtn: null,
	closeFooterBtn: null,
	flashcardData: null,
	flashcardId: null,
	currentIndex: 0,
	isFlipped: false,
	loadingTimeout: null,
};

function ensureFlashcardModal() {
	if (flashcardModalState.overlay) {
		return flashcardModalState;
	}

	const overlay = document.createElement("div");
	overlay.id = "flashcard-modal-overlay";
	overlay.className = "flashcard-modal-overlay";
	overlay.setAttribute("aria-hidden", "true");
	overlay.setAttribute("role", "dialog");

	const modal = document.createElement("div");
	modal.className = "flashcard-modal";

	const header = document.createElement("div");
	header.className = "flashcard-modal-header";

	const titleWrap = document.createElement("div");
	titleWrap.className = "flashcard-modal-title-wrap";

	const title = document.createElement("h3");
	title.className = "flashcard-modal-title";
	title.textContent = "Flashcards";
	titleWrap.appendChild(title);

	const topic = document.createElement("div");
	topic.className = "flashcard-modal-topic";
	topic.textContent = "General Topic";
	titleWrap.appendChild(topic);
	header.appendChild(titleWrap);

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.className = "flashcard-modal-close";
	closeBtn.textContent = "Close";
	header.appendChild(closeBtn);

	const loadingView = document.createElement("div");
	loadingView.className = "flashcard-loading-view";

	const loadingLabel = document.createElement("div");
	loadingLabel.className = "flashcard-loading-label";
	loadingLabel.textContent = "Preparing your flashcards...";
	loadingView.appendChild(loadingLabel);

	const loadingTrack = document.createElement("div");
	loadingTrack.className = "flashcard-loading-track";
	const loadingBar = document.createElement("div");
	loadingBar.className = "flashcard-loading-bar";
	loadingTrack.appendChild(loadingBar);
	loadingView.appendChild(loadingTrack);

	const contentView = document.createElement("div");
	contentView.className = "flashcard-modal-content";
	contentView.hidden = true;

	const counter = document.createElement("div");
	counter.className = "flashcard-modal-counter";
	contentView.appendChild(counter);

	const stage = document.createElement("div");
	stage.className = "flashcard-stage";

	const cardInner = document.createElement("div");
	cardInner.className = "flashcard-3d";

	const frontFace = document.createElement("div");
	frontFace.className = "flashcard-face flashcard-face-front";
	cardInner.appendChild(frontFace);

	const backFace = document.createElement("div");
	backFace.className = "flashcard-face flashcard-face-back";
	cardInner.appendChild(backFace);

	stage.appendChild(cardInner);
	contentView.appendChild(stage);

	const flipBtn = document.createElement("button");
	flipBtn.type = "button";
	flipBtn.className = "flashcard-flip-btn";
	flipBtn.textContent = "Flip Card";
	contentView.appendChild(flipBtn);

	const footer = document.createElement("div");
	footer.className = "flashcard-modal-footer";

	const prevBtn = document.createElement("button");
	prevBtn.type = "button";
	prevBtn.className = "flashcard-modal-nav-btn";
	prevBtn.textContent = "Previous";
	footer.appendChild(prevBtn);

	const nextBtn = document.createElement("button");
	nextBtn.type = "button";
	nextBtn.className = "flashcard-modal-nav-btn";
	nextBtn.textContent = "Next";
	footer.appendChild(nextBtn);

	const closeFooterBtn = document.createElement("button");
	closeFooterBtn.type = "button";
	closeFooterBtn.className = "flashcard-modal-close-footer";
	closeFooterBtn.textContent = "Close";
	footer.appendChild(closeFooterBtn);

	contentView.appendChild(footer);

	modal.appendChild(header);
	modal.appendChild(loadingView);
	modal.appendChild(contentView);
	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	flashcardModalState.overlay = overlay;
	flashcardModalState.topic = topic;
	flashcardModalState.loadingView = loadingView;
	flashcardModalState.loadingBar = loadingBar;
	flashcardModalState.contentView = contentView;
	flashcardModalState.counter = counter;
	flashcardModalState.cardInner = cardInner;
	flashcardModalState.frontFace = frontFace;
	flashcardModalState.backFace = backFace;
	flashcardModalState.flipBtn = flipBtn;
	flashcardModalState.prevBtn = prevBtn;
	flashcardModalState.nextBtn = nextBtn;
	flashcardModalState.closeFooterBtn = closeFooterBtn;

	overlay.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeFlashcardModal();
		}
	});

	closeBtn.addEventListener("click", closeFlashcardModal);
	closeFooterBtn.addEventListener("click", closeFlashcardModal);

	flipBtn.addEventListener("click", () => {
		if (!flashcardModalState.flashcardData) {
			return;
		}
		flashcardModalState.isFlipped = !flashcardModalState.isFlipped;
		if (flashcardModalState.cardInner) {
			flashcardModalState.cardInner.classList.toggle("flipped", flashcardModalState.isFlipped);
		}
		flashcardModalState.flipBtn.textContent = flashcardModalState.isFlipped ? "Show Front" : "Flip Card";
	});

	prevBtn.addEventListener("click", () => {
		if (!flashcardModalState.flashcardData || flashcardModalState.currentIndex <= 0) {
			return;
		}
		flashcardModalState.currentIndex -= 1;
		flashcardModalState.isFlipped = false;
		renderFlashcardModalCard();
	});

	nextBtn.addEventListener("click", () => {
		if (!flashcardModalState.flashcardData) {
			return;
		}
		const maxIndex = flashcardModalState.flashcardData.cards.length - 1;
		if (flashcardModalState.currentIndex >= maxIndex) {
			return;
		}
		flashcardModalState.currentIndex += 1;
		flashcardModalState.isFlipped = false;
		renderFlashcardModalCard();
	});

	return flashcardModalState;
}

function handleFlashcardModalKeydown(event) {
	if (event.key === "Escape" && flashcardModalState.overlay && flashcardModalState.overlay.classList.contains("active")) {
		event.preventDefault();
		closeFlashcardModal();
	}
}

function renderFlashcardModalCard() {
	if (
		!flashcardModalState.flashcardData ||
		!flashcardModalState.counter ||
		!flashcardModalState.frontFace ||
		!flashcardModalState.backFace
	) {
		return;
	}

	const cards = flashcardModalState.flashcardData.cards;
	const index = flashcardModalState.currentIndex;
	const activeCard = cards[index];
	if (!activeCard) {
		return;
	}

	flashcardModalState.counter.textContent = `Card ${index + 1} of ${cards.length}`;
	flashcardModalState.frontFace.textContent = activeCard.front;
	flashcardModalState.backFace.textContent = activeCard.back;

	if (flashcardModalState.cardInner) {
		flashcardModalState.cardInner.classList.toggle("flipped", flashcardModalState.isFlipped);
	}
	if (flashcardModalState.flipBtn) {
		flashcardModalState.flipBtn.textContent = flashcardModalState.isFlipped ? "Show Front" : "Flip Card";
	}
	if (flashcardModalState.prevBtn) {
		flashcardModalState.prevBtn.disabled = index === 0;
	}
	if (flashcardModalState.nextBtn) {
		flashcardModalState.nextBtn.disabled = index === cards.length - 1;
	}
}

function openFlashcardModal(flashcardData, metadata = {}) {
	const normalizedFlashcard = normalizeFlashcardPayload(flashcardData);
	if (!normalizedFlashcard) {
		return;
	}

	ensureFlashcardModal();

	flashcardModalState.flashcardData = normalizedFlashcard;
	flashcardModalState.flashcardId =
		typeof metadata.flashcardId === "string" && metadata.flashcardId ? metadata.flashcardId : null;
	flashcardModalState.currentIndex = 0;
	flashcardModalState.isFlipped = false;

	if (flashcardModalState.topic) {
		flashcardModalState.topic.textContent = normalizedFlashcard.topic;
	}

	if (flashcardModalState.overlay) {
		flashcardModalState.overlay.classList.add("active");
		flashcardModalState.overlay.setAttribute("aria-hidden", "false");
	}

	document.body.classList.add("flashcard-modal-open");
	document.addEventListener("keydown", handleFlashcardModalKeydown);

	if (flashcardModalState.loadingTimeout) {
		clearTimeout(flashcardModalState.loadingTimeout);
	}

	if (flashcardModalState.loadingView && flashcardModalState.contentView && flashcardModalState.loadingBar) {
		flashcardModalState.loadingView.hidden = false;
		flashcardModalState.contentView.hidden = true;

		flashcardModalState.loadingBar.style.transition = "none";
		flashcardModalState.loadingBar.style.width = "0%";
		void flashcardModalState.loadingBar.offsetWidth;
		flashcardModalState.loadingBar.style.transition = "width 1.5s linear";
		flashcardModalState.loadingBar.style.width = "100%";
	}

	flashcardModalState.loadingTimeout = setTimeout(() => {
		if (flashcardModalState.loadingView) {
			flashcardModalState.loadingView.hidden = true;
		}
		if (flashcardModalState.contentView) {
			flashcardModalState.contentView.hidden = false;
		}
		renderFlashcardModalCard();
	}, 1500);
}

function closeFlashcardModal() {
	if (flashcardModalState.loadingTimeout) {
		clearTimeout(flashcardModalState.loadingTimeout);
		flashcardModalState.loadingTimeout = null;
	}

	if (flashcardModalState.overlay) {
		flashcardModalState.overlay.classList.remove("active");
		flashcardModalState.overlay.setAttribute("aria-hidden", "true");
	}

	document.body.classList.remove("flashcard-modal-open");
	document.removeEventListener("keydown", handleFlashcardModalKeydown);
}

function renderFlashcardLauncherCard(flashcardData, responseLevel = null, metadata = {}, autoScroll = true) {
	const normalizedFlashcard = normalizeFlashcardPayload(flashcardData);
	if (!normalizedFlashcard) {
		return null;
	}

	const wrapper = document.createElement("div");
	wrapper.classList.add("message", "ai-message");

	const avatar = document.createElement("div");
	avatar.classList.add("message-avatar");
	const logo = document.createElement("img");
	logo.src = "assests/logo.png";
	logo.alt = "Saivo";
	logo.classList.add("bot-logo");
	avatar.appendChild(logo);
	wrapper.appendChild(avatar);

	const card = document.createElement("div");
	card.classList.add("flashcard-card", "flashcard-launcher-card");
	const levelBadge = createResponseLevelBadge(responseLevel);
	if (levelBadge) {
		card.appendChild(levelBadge);
	}

	const header = document.createElement("div");
	header.classList.add("flashcard-card-header");
	const icon = document.createElement("div");
	icon.classList.add("flashcard-card-icon");
	icon.textContent = "📚";
	header.appendChild(icon);

	const headerText = document.createElement("div");
	const title = document.createElement("div");
	title.classList.add("flashcard-card-title");
	title.textContent = "Flashcards Ready";
	headerText.appendChild(title);
	const topic = document.createElement("div");
	topic.classList.add("flashcard-card-topic");
	topic.textContent = normalizedFlashcard.topic;
	headerText.appendChild(topic);
	header.appendChild(headerText);
	card.appendChild(header);

	const launcherBody = document.createElement("div");
	launcherBody.classList.add("flashcard-launcher-body");

	const meta = document.createElement("div");
	meta.classList.add("flashcard-launcher-meta");
	meta.textContent = `${normalizedFlashcard.cards.length} cards available`;
	launcherBody.appendChild(meta);

	const openBtn = document.createElement("button");
	openBtn.type = "button";
	openBtn.classList.add("open-flashcard-btn");
	openBtn.textContent = "Open Flashcards";
	launcherBody.appendChild(openBtn);

	card.appendChild(launcherBody);

	card.__flashcardData = normalizedFlashcard;
	card.dataset.flashcardPayload = JSON.stringify(normalizedFlashcard);
	if (metadata && metadata.flashcardId) {
		card.dataset.flashcardId = metadata.flashcardId;
	}
	if (metadata && Number.isInteger(metadata.messageIndex)) {
		card.dataset.messageIndex = String(metadata.messageIndex);
	}

	openBtn.addEventListener("click", () => {
		let storedFlashcards = card.__flashcardData || null;
		if (!storedFlashcards && card.dataset.flashcardPayload) {
			try {
				storedFlashcards = normalizeFlashcardPayload(JSON.parse(card.dataset.flashcardPayload));
			} catch (_error) {
				storedFlashcards = null;
			}
		}

		if (!storedFlashcards) {
			return;
		}

		openFlashcardModal(storedFlashcards, {
			flashcardId: card.dataset.flashcardId || "",
		});
	});

	wrapper.appendChild(card);
	messagesContainer.appendChild(wrapper);
	if (autoScroll) {
		chatArea.scrollTop = chatArea.scrollHeight;
	}
	return wrapper;
}

const quizModalState = {
	overlay: null,
	topic: null,
	contentView: null,
	counter: null,
	questionText: null,
	options: null,
	tipBox: null,
	scoreBox: null,
	resultView: null,
	resultCorrectValue: null,
	resultWrongValue: null,
	resultMessage: null,
	retryBtn: null,
	resultCloseBtn: null,
	prevBtn: null,
	nextBtn: null,
	closeFooterBtn: null,
	quizData: null,
	quizId: null,
	currentIndex: 0,
	answers: {},
	attemptsByQuestion: {},
	tips: {},
	correctCount: 0,
	wrongCount: 0,
	isResultView: false,
};

function ensureQuizModal() {
	if (quizModalState.overlay) {
		return quizModalState;
	}

	const overlay = document.createElement("div");
	overlay.id = "quiz-modal-overlay";
	overlay.className = "quiz-modal-overlay";
	overlay.setAttribute("aria-hidden", "true");
	overlay.setAttribute("role", "dialog");

	const modal = document.createElement("div");
	modal.className = "quiz-modal";

	const header = document.createElement("div");
	header.className = "quiz-modal-header";

	const titleWrap = document.createElement("div");
	titleWrap.className = "quiz-modal-title-wrap";

	const title = document.createElement("h3");
	title.className = "quiz-modal-title";
	title.textContent = "Quiz";
	titleWrap.appendChild(title);

	const topic = document.createElement("div");
	topic.className = "quiz-modal-topic";
	topic.textContent = "General Knowledge";
	titleWrap.appendChild(topic);
	header.appendChild(titleWrap);

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.className = "quiz-modal-close";
	closeBtn.textContent = "Close";
	header.appendChild(closeBtn);

	const contentView = document.createElement("div");
	contentView.className = "quiz-modal-content";

	const counter = document.createElement("div");
	counter.className = "quiz-modal-counter";
	contentView.appendChild(counter);

	const questionText = document.createElement("div");
	questionText.className = "quiz-modal-question-text";
	contentView.appendChild(questionText);

	const options = document.createElement("div");
	options.className = "quiz-modal-options";
	contentView.appendChild(options);

	const tipBox = document.createElement("div");
	tipBox.className = "quiz-modal-tip";
	tipBox.hidden = true;
	contentView.appendChild(tipBox);

	const scoreBox = document.createElement("div");
	scoreBox.className = "quiz-modal-score";
	scoreBox.hidden = true;
	contentView.appendChild(scoreBox);

	const resultView = document.createElement("div");
	resultView.className = "quiz-modal-result";
	resultView.hidden = true;

	const resultTitle = document.createElement("div");
	resultTitle.className = "quiz-modal-result-title";
	resultTitle.textContent = "Quiz Result";
	resultView.appendChild(resultTitle);

	const resultValues = document.createElement("div");
	resultValues.className = "quiz-modal-result-values";

	const resultCorrectValue = document.createElement("span");
	resultCorrectValue.className = "score-correct";
	resultCorrectValue.textContent = "0 Correct";
	resultValues.appendChild(resultCorrectValue);

	const resultWrongValue = document.createElement("span");
	resultWrongValue.className = "score-wrong";
	resultWrongValue.textContent = "0 Wrong";
	resultValues.appendChild(resultWrongValue);

	resultView.appendChild(resultValues);

	const resultMessage = document.createElement("p");
	resultMessage.className = "quiz-modal-result-message";
	resultMessage.textContent = "Keep practicing!";
	resultView.appendChild(resultMessage);

	const resultActions = document.createElement("div");
	resultActions.className = "quiz-modal-result-actions";

	const retryBtn = document.createElement("button");
	retryBtn.type = "button";
	retryBtn.className = "quiz-modal-retry-btn";
	retryBtn.textContent = "Retry Quiz";
	resultActions.appendChild(retryBtn);

	const resultCloseBtn = document.createElement("button");
	resultCloseBtn.type = "button";
	resultCloseBtn.className = "quiz-modal-result-close-btn";
	resultCloseBtn.textContent = "Close";
	resultActions.appendChild(resultCloseBtn);

	resultView.appendChild(resultActions);
	contentView.appendChild(resultView);

	const footer = document.createElement("div");
	footer.className = "quiz-modal-footer";

	const prevBtn = document.createElement("button");
	prevBtn.type = "button";
	prevBtn.className = "quiz-modal-nav-btn";
	prevBtn.textContent = "Previous";
	footer.appendChild(prevBtn);

	const nextBtn = document.createElement("button");
	nextBtn.type = "button";
	nextBtn.className = "quiz-modal-nav-btn";
	nextBtn.textContent = "Next";
	footer.appendChild(nextBtn);

	const closeFooterBtn = document.createElement("button");
	closeFooterBtn.type = "button";
	closeFooterBtn.className = "quiz-modal-close-footer";
	closeFooterBtn.textContent = "Close";
	footer.appendChild(closeFooterBtn);

	contentView.appendChild(footer);

	modal.appendChild(header);
	modal.appendChild(contentView);
	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	quizModalState.overlay = overlay;
	quizModalState.topic = topic;
	quizModalState.contentView = contentView;
	quizModalState.counter = counter;
	quizModalState.questionText = questionText;
	quizModalState.options = options;
	quizModalState.tipBox = tipBox;
	quizModalState.scoreBox = scoreBox;
	quizModalState.resultView = resultView;
	quizModalState.resultCorrectValue = resultCorrectValue;
	quizModalState.resultWrongValue = resultWrongValue;
	quizModalState.resultMessage = resultMessage;
	quizModalState.retryBtn = retryBtn;
	quizModalState.resultCloseBtn = resultCloseBtn;
	quizModalState.prevBtn = prevBtn;
	quizModalState.nextBtn = nextBtn;
	quizModalState.closeFooterBtn = closeFooterBtn;

	overlay.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeQuizModal();
		}
	});

	closeBtn.addEventListener("click", closeQuizModal);
	closeFooterBtn.addEventListener("click", closeQuizModal);

	prevBtn.addEventListener("click", () => {
		if (!quizModalState.quizData || quizModalState.currentIndex <= 0) {
			return;
		}
		quizModalState.isResultView = false;
		quizModalState.currentIndex -= 1;
		renderQuizModalQuestion();
	});

	nextBtn.addEventListener("click", () => {
		if (!quizModalState.quizData) {
			return;
		}
		const maxIndex = quizModalState.quizData.questions.length - 1;
		if (quizModalState.currentIndex < maxIndex) {
			quizModalState.isResultView = false;
			quizModalState.currentIndex += 1;
			renderQuizModalQuestion();
			return;
		}

		const finalAttempt = getQuestionAttempt(maxIndex);
		if (!finalAttempt) {
			return;
		}

		showQuizModalResultView();
	});

	retryBtn.addEventListener("click", () => {
		quizModalState.currentIndex = 0;
		quizModalState.answers = {};
		quizModalState.attemptsByQuestion = {};
		quizModalState.tips = {};
		quizModalState.correctCount = 0;
		quizModalState.wrongCount = 0;
		quizModalState.isResultView = false;
		renderQuizModalQuestion();
	});

	resultCloseBtn.addEventListener("click", closeQuizModal);

	return quizModalState;
}

function handleQuizModalKeydown(event) {
	if (event.key === "Escape" && quizModalState.overlay && quizModalState.overlay.classList.contains("active")) {
		event.preventDefault();
		closeQuizModal();
	}
}

function setQuizScoreFromMergedAttempts() {
	const mergedAttempts = {
		...quizModalState.attemptsByQuestion,
		...quizModalState.answers,
	};

	let correct = 0;
	let wrong = 0;
	Object.values(mergedAttempts).forEach((attempt) => {
		if (!attempt || typeof attempt !== "object") {
			return;
		}

		if (attempt.is_correct) {
			correct += 1;
		} else {
			wrong += 1;
		}
	});

	quizModalState.correctCount = correct;
	quizModalState.wrongCount = wrong;
}

function updateQuizScoreCounters(previousAttempt, nextAttempt) {
	if (previousAttempt) {
		if (previousAttempt.is_correct) {
			quizModalState.correctCount = Math.max(0, quizModalState.correctCount - 1);
		} else {
			quizModalState.wrongCount = Math.max(0, quizModalState.wrongCount - 1);
		}
	}

	if (nextAttempt) {
		if (nextAttempt.is_correct) {
			quizModalState.correctCount += 1;
		} else {
			quizModalState.wrongCount += 1;
		}
	}
}

function getQuizResultMessage(correctCount, totalQuestions) {
	if (!totalQuestions || totalQuestions <= 0) {
		return "Keep practicing!";
	}

	if (correctCount >= Math.ceil(totalQuestions * 0.7)) {
		return "Great job!";
	}

	return "Keep practicing!";
}

function normalizeAttemptRecord(rawAttempt) {
	if (!rawAttempt || typeof rawAttempt !== "object") {
		return null;
	}

	const questionIndex = Number(rawAttempt.question_index);
	const selectedOption = String(rawAttempt.selected_option || "").trim().toUpperCase();
	if (!Number.isInteger(questionIndex) || questionIndex < 0 || !selectedOption) {
		return null;
	}

	return {
		question_index: questionIndex,
		selected_option: selectedOption.charAt(0),
		is_correct: Boolean(rawAttempt.is_correct),
	};
}

function buildLatestAttemptMap(rawAttempts) {
	const latestMap = {};
	if (!Array.isArray(rawAttempts)) {
		return latestMap;
	}

	rawAttempts.forEach((rawAttempt) => {
		const attempt = normalizeAttemptRecord(rawAttempt);
		if (!attempt) {
			return;
		}
		latestMap[attempt.question_index] = attempt;
	});

	return latestMap;
}

function getQuestionAttempt(questionIndex) {
	return quizModalState.answers[questionIndex] || quizModalState.attemptsByQuestion[questionIndex] || null;
}

async function loadQuizAttempts(quizId) {
	if (!quizId) {
		quizModalState.attemptsByQuestion = {};
		quizModalState.correctCount = 0;
		quizModalState.wrongCount = 0;
		return;
	}

	try {
		const result = await apiFetch(`/quizzes/${quizId}/attempts`);
		const latestMap = buildLatestAttemptMap(result && result.attempts);
		Object.keys(latestMap).forEach((questionIndex) => {
			if (quizModalState.answers[questionIndex]) {
				return;
			}
			quizModalState.attemptsByQuestion[questionIndex] = latestMap[questionIndex];
		});
		setQuizScoreFromMergedAttempts();
	} catch (error) {
		console.error("Failed to load quiz attempts:", error);
	}
}

async function saveQuizAttempt(quizId, questionIndex, selectedOption, isCorrect) {
	if (!quizId) {
		return;
	}

	try {
		await apiFetch("/quizzes/attempts", {
			method: "POST",
			body: {
				quiz_id: quizId,
				question_index: questionIndex,
				selected_option: selectedOption,
				is_correct: isCorrect,
			},
		});
	} catch (error) {
		console.error("Failed to save quiz attempt:", error);
	}
}

function buildQuizTipMessage(question, feedbackText) {
	const correctKey = question.correct_option || "A";
	const correctText = question.options && question.options[correctKey] ? question.options[correctKey] : "";
	const whyText = (feedbackText || question.explanation || "Review each option carefully and focus on the core concept.").trim();

	return `Correct answer: ${correctKey}. ${correctText}\nWhy: ${whyText}`;
}

async function fetchQuizModalTip(questionIndex, question, selectedKey) {
	let feedbackText = "";
	try {
		const result = await apiFetch("/chat/quiz-answer", {
			method: "POST",
			body: {
				chat_id: state.activeChatId,
				user_id: state.userId,
				topic: question.topic || (quizModalState.quizData && quizModalState.quizData.topic) || "the topic",
				question: question.question,
				options: question.options,
				selected_option: selectedKey,
				correct_option: question.correct_option,
				explanation: question.explanation || "",
				difficulty_level: state.difficultyLevel,
				session_subject: normalizeSessionSubject(state.sessionSubject),
			},
		});
		feedbackText = result && typeof result.feedback === "string" ? result.feedback : "";
	} catch (_error) {
		feedbackText = "";
	}

	quizModalState.tips[questionIndex] = {
		loading: false,
		text: buildQuizTipMessage(question, feedbackText),
	};

	if (quizModalState.currentIndex === questionIndex) {
		renderQuizModalQuestion();
	}
}

function renderQuizModalQuestion() {
	if (!quizModalState.quizData || !quizModalState.options || !quizModalState.questionText || !quizModalState.counter) {
		return;
	}

	quizModalState.isResultView = false;

	if (quizModalState.counter) {
		quizModalState.counter.hidden = false;
	}
	if (quizModalState.questionText) {
		quizModalState.questionText.hidden = false;
	}
	if (quizModalState.options) {
		quizModalState.options.hidden = false;
	}
	if (quizModalState.resultView) {
		quizModalState.resultView.hidden = true;
	}
	if (quizModalState.prevBtn && quizModalState.prevBtn.parentElement) {
		quizModalState.prevBtn.parentElement.hidden = false;
	}

	const questions = quizModalState.quizData.questions;
	const index = quizModalState.currentIndex;
	const question = questions[index];
	if (!question) {
		return;
	}

	quizModalState.counter.textContent = `Question ${index + 1} of ${questions.length}`;
	quizModalState.questionText.textContent = question.question;
	quizModalState.options.innerHTML = "";

	const activeAttempt = getQuestionAttempt(index);
	const tipState = quizModalState.tips[index] || null;
	["A", "B", "C", "D"].forEach((key) => {
		const optionText = question.options[key];
		if (!optionText) {
			return;
		}

		const optionBtn = document.createElement("button");
		optionBtn.type = "button";
		optionBtn.className = "quiz-modal-option";

		const label = document.createElement("span");
		label.className = "quiz-modal-option-label";
		label.textContent = key;
		optionBtn.appendChild(label);

		const text = document.createElement("span");
		text.className = "quiz-modal-option-text";
		text.textContent = optionText;
		optionBtn.appendChild(text);

		if (activeAttempt) {
			if (key === question.correct_option) {
				optionBtn.classList.add("correct");
			} else if (key === activeAttempt.selected_option && !activeAttempt.is_correct) {
				optionBtn.classList.add("wrong");
			} else {
				optionBtn.classList.add("muted");
			}
		}

		optionBtn.addEventListener("click", () => {
			const isCorrect = key === question.correct_option;
			const previousAttempt = getQuestionAttempt(index);
			const currentAttempt = {
				question_index: index,
				selected_option: key,
				is_correct: isCorrect,
			};

			updateQuizScoreCounters(previousAttempt, currentAttempt);

			quizModalState.answers[index] = currentAttempt;
			quizModalState.attemptsByQuestion[index] = currentAttempt;
			saveQuizAttempt(quizModalState.quizId, index, key, isCorrect);

			if (!isCorrect) {
				quizModalState.tips[index] = { loading: true, text: "" };
				fetchQuizModalTip(index, question, key);
			} else {
				quizModalState.tips[index] = null;
			}

			renderQuizModalQuestion();
		});

		quizModalState.options.appendChild(optionBtn);
	});

	if (quizModalState.tipBox) {
		const isWrong = !!activeAttempt && !activeAttempt.is_correct;
		if (!isWrong) {
			quizModalState.tipBox.hidden = true;
			quizModalState.tipBox.innerHTML = "";
		} else {
			quizModalState.tipBox.hidden = false;
			if (tipState && tipState.loading) {
				quizModalState.tipBox.innerHTML = '<div class="quiz-modal-tip-title">Tip</div><div class="quiz-modal-tip-text">Checking the best explanation...</div>';
			} else {
				const finalTip = tipState && tipState.text ? tipState.text : buildQuizTipMessage(question, "");
				const safeTip = escapeHtml(finalTip).replace(/\n/g, "<br>");
				quizModalState.tipBox.innerHTML = `<div class="quiz-modal-tip-title">Tip</div><div class="quiz-modal-tip-text">${safeTip}</div>`;
			}
		}
	}

	if (quizModalState.scoreBox) {
		quizModalState.scoreBox.hidden = false;
		quizModalState.scoreBox.innerHTML = (
			`<div class="quiz-modal-score-title">Score So Far</div>` +
			`<div class="quiz-modal-score-values">` +
			`<span class="score-correct">${quizModalState.correctCount} Correct</span>` +
			`<span class="score-wrong">${quizModalState.wrongCount} Wrong</span>` +
			`</div>`
		);
	}

	if (quizModalState.prevBtn) {
		quizModalState.prevBtn.disabled = index === 0;
	}
	if (quizModalState.nextBtn) {
		if (index === questions.length - 1) {
			quizModalState.nextBtn.textContent = "View Result";
			quizModalState.nextBtn.disabled = !activeAttempt;
		} else {
			quizModalState.nextBtn.textContent = "Next";
			quizModalState.nextBtn.disabled = false;
		}
	}
}

function showQuizModalResultView() {
	if (!quizModalState.quizData || !quizModalState.resultView) {
		return;
	}

	quizModalState.isResultView = true;

	if (quizModalState.counter) {
		quizModalState.counter.hidden = true;
	}
	if (quizModalState.questionText) {
		quizModalState.questionText.hidden = true;
	}
	if (quizModalState.options) {
		quizModalState.options.hidden = true;
	}
	if (quizModalState.tipBox) {
		quizModalState.tipBox.hidden = true;
	}
	if (quizModalState.scoreBox) {
		quizModalState.scoreBox.hidden = true;
	}
	if (quizModalState.prevBtn && quizModalState.prevBtn.parentElement) {
		quizModalState.prevBtn.parentElement.hidden = true;
	}

	const totalQuestions = Array.isArray(quizModalState.quizData.questions)
		? quizModalState.quizData.questions.length
		: 0;
	if (quizModalState.resultCorrectValue) {
		quizModalState.resultCorrectValue.textContent = `${quizModalState.correctCount} Correct`;
	}
	if (quizModalState.resultWrongValue) {
		quizModalState.resultWrongValue.textContent = `${quizModalState.wrongCount} Wrong`;
	}
	if (quizModalState.resultMessage) {
		quizModalState.resultMessage.textContent = getQuizResultMessage(quizModalState.correctCount, totalQuestions);
	}

	quizModalState.resultView.hidden = false;
}

function openQuizModal(quizData, metadata = {}) {
	const normalizedQuiz = normalizeQuizPayload(quizData);
	if (!normalizedQuiz) {
		return;
	}

	ensureQuizModal();

	quizModalState.quizData = normalizedQuiz;
	quizModalState.quizId = typeof metadata.quizId === "string" && metadata.quizId ? metadata.quizId : null;
	quizModalState.currentIndex = 0;
	quizModalState.answers = {};
	quizModalState.attemptsByQuestion = {};
	quizModalState.tips = {};
	quizModalState.correctCount = 0;
	quizModalState.wrongCount = 0;
	quizModalState.isResultView = false;

	if (quizModalState.topic) {
		quizModalState.topic.textContent = normalizedQuiz.topic;
	}
	if (quizModalState.resultView) {
		quizModalState.resultView.hidden = true;
	}

	if (quizModalState.overlay) {
		quizModalState.overlay.classList.add("active");
		quizModalState.overlay.setAttribute("aria-hidden", "false");
	}

	document.body.classList.add("quiz-modal-open");
	document.addEventListener("keydown", handleQuizModalKeydown);
	renderQuizModalQuestion();

	loadQuizAttempts(quizModalState.quizId).then(() => {
		renderQuizModalQuestion();
	});
}

function closeQuizModal() {
	if (quizModalState.overlay) {
		quizModalState.overlay.classList.remove("active");
		quizModalState.overlay.setAttribute("aria-hidden", "true");
	}

	document.body.classList.remove("quiz-modal-open");
	document.removeEventListener("keydown", handleQuizModalKeydown);
}

function createQuizCardElement(quizData, responseLevel = null) {
	const normalizedQuiz = normalizeQuizPayload(quizData);
	if (!normalizedQuiz) {
		return null;
	}

	const wrapper = document.createElement("div");
	wrapper.classList.add("message", "ai-message");

	const avatar = document.createElement("div");
	avatar.classList.add("message-avatar");
	const logo = document.createElement("img");
	logo.src = "assests/logo.png";
	logo.alt = "Saivo";
	logo.classList.add("bot-logo");
	avatar.appendChild(logo);
	wrapper.appendChild(avatar);

	const card = document.createElement("div");
	card.classList.add("quiz-card");
	const levelBadge = createResponseLevelBadge(responseLevel);
	if (levelBadge) {
		card.appendChild(levelBadge);
	}

	// Header
	const header = document.createElement("div");
	header.classList.add("quiz-card-header");
	const icon = document.createElement("div");
	icon.classList.add("quiz-card-icon");
	icon.textContent = "📝";
	header.appendChild(icon);

	const headerText = document.createElement("div");
	const title = document.createElement("div");
	title.classList.add("quiz-card-title");
	title.textContent = "Quick Quiz";
	headerText.appendChild(title);
	const topic = document.createElement("div");
	topic.classList.add("quiz-card-topic");
	topic.textContent = normalizedQuiz.topic;
	headerText.appendChild(topic);
	header.appendChild(headerText);
	card.appendChild(header);

	// Questions
	const questions = normalizedQuiz.questions || [];
	questions.forEach((q, qIndex) => {
		const questionDiv = document.createElement("div");
		questionDiv.classList.add("quiz-question");

		const qNum = document.createElement("div");
		qNum.classList.add("quiz-question-num");
		qNum.textContent = `Question ${qIndex + 1}`;
		questionDiv.appendChild(qNum);

		const qText = document.createElement("div");
		qText.classList.add("quiz-question-text");
		qText.textContent = q.question;
		questionDiv.appendChild(qText);

		const optionsDiv = document.createElement("div");
		optionsDiv.classList.add("quiz-options");

		const optionKeys = ["A", "B", "C", "D"];
		const optionButtons = [];

		optionKeys.forEach(key => {
			if (!q.options[key]) return;
			const btn = document.createElement("button");
			btn.classList.add("quiz-option-btn");
			btn.type = "button";

			const label = document.createElement("span");
			label.classList.add("quiz-option-label");
			label.textContent = key;
			btn.appendChild(label);

			const text = document.createElement("span");
			text.textContent = q.options[key];
			btn.appendChild(text);

			btn.addEventListener("click", () => {
				handleQuizAnswer(btn, optionButtons, questionDiv, q, key);
			});

			optionButtons.push({ key, btn });
			optionsDiv.appendChild(btn);
		});

		questionDiv.appendChild(optionsDiv);
		card.appendChild(questionDiv);
	});

	wrapper.appendChild(card);
	return wrapper;
}

/**
 * Renders a quiz launcher card with an Open Quiz action and stores quiz payload on the card.
 */
function renderQuizLauncherCard(quizData, responseLevel = null, metadata = {}, autoScroll = true) {
	const normalizedQuiz = normalizeQuizPayload(quizData);
	if (!normalizedQuiz) {
		return null;
	}

	const wrapper = document.createElement("div");
	wrapper.classList.add("message", "ai-message");

	const avatar = document.createElement("div");
	avatar.classList.add("message-avatar");
	const logo = document.createElement("img");
	logo.src = "assests/logo.png";
	logo.alt = "Saivo";
	logo.classList.add("bot-logo");
	avatar.appendChild(logo);
	wrapper.appendChild(avatar);

	const card = document.createElement("div");
	card.classList.add("quiz-card", "quiz-launcher-card");
	const levelBadge = createResponseLevelBadge(responseLevel);
	if (levelBadge) {
		card.appendChild(levelBadge);
	}

	const header = document.createElement("div");
	header.classList.add("quiz-card-header");
	const icon = document.createElement("div");
	icon.classList.add("quiz-card-icon");
	icon.textContent = "📝";
	header.appendChild(icon);

	const headerText = document.createElement("div");
	const title = document.createElement("div");
	title.classList.add("quiz-card-title");
	title.textContent = "Quiz Ready";
	headerText.appendChild(title);
	const topic = document.createElement("div");
	topic.classList.add("quiz-card-topic");
	topic.textContent = normalizedQuiz.topic;
	headerText.appendChild(topic);
	header.appendChild(headerText);
	card.appendChild(header);

	const launcherBody = document.createElement("div");
	launcherBody.classList.add("quiz-launcher-body");

	const meta = document.createElement("div");
	meta.classList.add("quiz-launcher-meta");
	meta.textContent = `${normalizedQuiz.questions.length} questions available`;
	launcherBody.appendChild(meta);

	const openBtn = document.createElement("button");
	openBtn.type = "button";
	openBtn.classList.add("open-quiz-btn");
	openBtn.textContent = "Open Quiz";
	launcherBody.appendChild(openBtn);

	card.appendChild(launcherBody);

	// Attach quiz payload to this specific card for modal launch.
	card.__quizData = normalizedQuiz;
	card.dataset.quizPayload = JSON.stringify(normalizedQuiz);
	if (metadata && metadata.quizId) {
		card.dataset.quizId = metadata.quizId;
	}
	if (metadata && Number.isInteger(metadata.messageIndex)) {
		card.dataset.messageIndex = String(metadata.messageIndex);
	}

	openBtn.addEventListener("click", () => {
		let storedQuiz = card.__quizData || null;
		if (!storedQuiz && card.dataset.quizPayload) {
			try {
				storedQuiz = normalizeQuizPayload(JSON.parse(card.dataset.quizPayload));
			} catch (_error) {
				storedQuiz = null;
			}
		}

		if (!storedQuiz) {
			return;
		}

		openQuizModal(storedQuiz, {
			quizId: card.dataset.quizId || "",
		});
	});

	wrapper.appendChild(card);
	messagesContainer.appendChild(wrapper);
	if (autoScroll) {
		chatArea.scrollTop = chatArea.scrollHeight;
	}
	return wrapper;
}

/**
 * Renders a quiz card with clickable MCQ option buttons.
 * @param {Object} quizData - { type, topic, questions: [{ id, question, options: {A,B,C,D}, correct_option, explanation }] }
 */
function renderQuizCard(quizData, responseLevel = null) {
	const wrapper = createQuizCardElement(quizData, responseLevel);
	if (!wrapper) {
		return null;
	}

	messagesContainer.appendChild(wrapper);
	chatArea.scrollTop = chatArea.scrollHeight;
	return wrapper;
}

/**
 * Handles quiz answer selection — shows correct/incorrect, calls backend for AI feedback.
 */
async function handleQuizAnswer(selectedBtn, allButtons, questionDiv, questionData, selectedKey) {
	const isCorrect = selectedKey === questionData.correct_option;

	// Disable all buttons and show states
	allButtons.forEach(({ key, btn }) => {
		btn.disabled = true;
		if (key === selectedKey) {
			btn.classList.add(isCorrect ? "correct" : "incorrect");
		} else if (key === questionData.correct_option && !isCorrect) {
			btn.classList.add("show-correct");
		} else {
			btn.classList.add("dimmed");
		}
	});

	// Show loading feedback
	const loadingDiv = document.createElement("div");
	loadingDiv.classList.add("quiz-loading");
	loadingDiv.innerHTML = 'Getting feedback <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
	questionDiv.appendChild(loadingDiv);
	chatArea.scrollTop = chatArea.scrollHeight;

	try {
		const result = await apiFetch("/chat/quiz-answer", {
			method: "POST",
			body: {
				chat_id: state.activeChatId,
				user_id: state.userId,
				topic: questionData.topic || "the topic",
				question: questionData.question,
				options: questionData.options,
				selected_option: selectedKey,
				correct_option: questionData.correct_option,
				explanation: questionData.explanation || "",
				difficulty_level: state.difficultyLevel,
				session_subject: normalizeSessionSubject(state.sessionSubject),
			},
		});

		loadingDiv.remove();

		const feedbackDiv = document.createElement("div");
		feedbackDiv.classList.add("quiz-feedback", isCorrect ? "correct-feedback" : "incorrect-feedback");
		const feedbackIcon = isCorrect ? "✅" : "💡";
		feedbackDiv.innerHTML = `<span class="quiz-feedback-icon">${feedbackIcon}</span> ${escapeHtml(result.feedback || questionData.explanation)}`;
		questionDiv.appendChild(feedbackDiv);

	} catch (error) {
		loadingDiv.remove();
		const feedbackDiv = document.createElement("div");
		feedbackDiv.classList.add("quiz-feedback", isCorrect ? "correct-feedback" : "incorrect-feedback");
		const feedbackIcon = isCorrect ? "✅" : "💡";
		feedbackDiv.innerHTML = `<span class="quiz-feedback-icon">${feedbackIcon}</span> ${isCorrect ? "Correct!" : "Not quite."} ${escapeHtml(questionData.explanation)}`;
		questionDiv.appendChild(feedbackDiv);
	}

	chatArea.scrollTop = chatArea.scrollHeight;
}

/**
 * Renders a summary card with structured sections.
 * @param {Object} summaryData - { type, topic, one_line_definition, key_points: [] }
 */
function renderSummaryCard(summaryData, responseLevel = null) {
	const wrapper = document.createElement("div");
	wrapper.classList.add("message", "ai-message");

	const avatar = document.createElement("div");
	avatar.classList.add("message-avatar");
	const logo = document.createElement("img");
	logo.src = "assests/logo.png";
	logo.alt = "Saivo";
	logo.classList.add("bot-logo");
	avatar.appendChild(logo);
	wrapper.appendChild(avatar);

	const card = document.createElement("div");
	card.classList.add("summary-card");
	const levelBadge = createResponseLevelBadge(responseLevel);
	if (levelBadge) {
		card.appendChild(levelBadge);
	}

	// Header
	const header = document.createElement("div");
	header.classList.add("summary-card-header");
	const icon = document.createElement("div");
	icon.classList.add("summary-card-icon");
	icon.textContent = "📋";
	header.appendChild(icon);
	const title = document.createElement("div");
	title.classList.add("summary-card-title");
	title.textContent = summaryData.topic || "Concept Summary";
	header.appendChild(title);
	card.appendChild(header);

	// Definition section
	const defSection = document.createElement("div");
	defSection.classList.add("summary-section");
	const defLabel = document.createElement("div");
	defLabel.classList.add("summary-section-label");
	defLabel.textContent = "One-Line Definition";
	defSection.appendChild(defLabel);
	const defText = document.createElement("div");
	defText.classList.add("summary-definition");
	defText.textContent = summaryData.one_line_definition || "";
	defSection.appendChild(defText);
	card.appendChild(defSection);

	// Key Points section
	const kpSection = document.createElement("div");
	kpSection.classList.add("summary-section");
	const kpLabel = document.createElement("div");
	kpLabel.classList.add("summary-section-label");
	kpLabel.textContent = "Key Points";
	kpSection.appendChild(kpLabel);

	const kpList = document.createElement("ul");
	kpList.classList.add("summary-key-points");
	const keyPoints = summaryData.key_points || [];
	keyPoints.forEach((point, i) => {
		const li = document.createElement("li");
		li.classList.add("summary-key-point");
		const pointIcon = document.createElement("span");
		pointIcon.classList.add("summary-point-icon");
		pointIcon.textContent = `${i + 1}`;
		li.appendChild(pointIcon);
		const pointText = document.createElement("span");
		pointText.textContent = point;
		li.appendChild(pointText);
		kpList.appendChild(li);
	});
	kpSection.appendChild(kpList);
	card.appendChild(kpSection);

	wrapper.appendChild(card);
	messagesContainer.appendChild(wrapper);
	chatArea.scrollTop = chatArea.scrollHeight;
}

// ========================
// DIFFICULTY LEVEL BUTTONS
// ========================
const difficultyBtns = document.querySelectorAll(".diff-btn");
const DIFFICULTY_LEVELS = ["Neutral", "Beginner", "Intermediate", "Advanced"];
const SESSION_SUBJECTS = ["Anyone", "Maths", "Physics", "Chemistry", "Coding"];

function normalizeDifficultyLevel(level) {
	if (typeof level !== "string") {
		return "Neutral";
	}

	const normalized = level.trim().toLowerCase();
	if (normalized === "beginner") return "Beginner";
	if (normalized === "intermediate") return "Intermediate";
	if (normalized === "advanced") return "Advanced";
	return "Neutral";
}

function normalizeSessionSubject(subject) {
	if (typeof subject !== "string") {
		return "Anyone";
	}

	const normalized = subject.trim().toLowerCase();
	if (normalized === "maths") return "Maths";
	if (normalized === "physics") return "Physics";
	if (normalized === "chemistry") return "Chemistry";
	if (normalized === "coding") return "Coding";
	return "Anyone";
}

function buildApiPrompt(content, difficultyLevel) {
	const normalizedDifficulty = normalizeDifficultyLevel(difficultyLevel);
	let prompt = content;

	if (normalizedDifficulty !== "Neutral") {
		prompt = `${prompt} at ${normalizedDifficulty.toLowerCase()} level`;
	}

	const normalizedSubject = normalizeSessionSubject(state.sessionSubject);
	if (normalizedSubject === "Anyone") {
		return prompt;
	}

	const mismatchMessage = `This question is not related to the current session subject (${normalizedSubject}). Please ask a ${normalizedSubject}-related question or switch subject to Anyone.`;

	return `${prompt}\n\n[SESSION SUBJECT MODE]\nCurrent session subject: ${normalizedSubject}.\nAnswer only in the context of ${normalizedSubject}.\nIf the user's question is unrelated, respond with ONLY this exact sentence and nothing else:\n"${mismatchMessage}"`;
}

function setDifficultyLevel(level) {
	const normalizedLevel = normalizeDifficultyLevel(level);
	if (!DIFFICULTY_LEVELS.includes(normalizedLevel)) {
		return;
	}

	state.difficultyLevel = normalizedLevel;
	localStorage.setItem("difficultyLevel", normalizedLevel);

	difficultyBtns.forEach(btn => {
		btn.classList.toggle("active", btn.dataset.level === normalizedLevel);
	});
}

function setSessionSubject(subject) {
	const normalizedSubject = normalizeSessionSubject(subject);
	if (!SESSION_SUBJECTS.includes(normalizedSubject)) {
		return;
	}

	state.sessionSubject = normalizedSubject;
	localStorage.setItem("sessionSubject", normalizedSubject);

	if (subjectSelect) {
		subjectSelect.value = normalizedSubject;
	}
}

difficultyBtns.forEach(btn => {
	btn.addEventListener("click", () => {
		setDifficultyLevel(btn.dataset.level);
	});
});

// Restore difficulty on load
if (state.difficultyLevel) {
	setDifficultyLevel(state.difficultyLevel);
}

if (subjectSelect) {
	subjectSelect.addEventListener("change", () => {
		setSessionSubject(subjectSelect.value);
	});
}

setSessionSubject(state.sessionSubject);

async function initializeApp() {
	if (!state.userId) {
		window.location.href = "login.html";
		return;
	}

	// Set username and initials
	const username = state.username || "User";
	sidebarUsername.textContent = username;

	// Generate initials (first 2 letters)
	const initials = username
		.split(" ")
		.map(word => word[0])
		.join("")
		.substring(0, 2)
		.toUpperCase();
	avatarInitials.textContent = initials || "ND";

	// Update mobile profile avatar with first letter
	updateMobileProfileAvatar(username);

	// Fetch AI suggestions from backend (updates 2x daily)
	fetchAndDisplaySuggestions();

	// Setup suggestion card click handlers
	setupSuggestionCards();

	await loadChats();

	// If user had an active chat before reload, restore it
	if (state.activeChatId) {
		await loadMessages();
	} else {
		updateTitleBar("Saivo");
		showWelcomeScreen();  // Show welcome on initial load with no active chat
	}
}

// --- AUTO-RESIZE TEXTAREA ---
// Grows textarea height as user types, up to CSS max-height.
// After max-height, textarea scrolls internally.
function autoResizeTextarea() {
	// Reset to min-height to calculate true scrollHeight
	messageInput.style.height = 'auto';
	// Set height to content, CSS max-height will cap it
	messageInput.style.height = messageInput.scrollHeight + 'px';
}

messageInput.addEventListener('input', autoResizeTextarea);

// Reset textarea height after form submission
function resetTextareaHeight() {
	messageInput.style.height = 'auto';
}

messageInput.addEventListener('keypress', function (e) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		messageForm.dispatchEvent(new Event('submit'));
	}
});

// --- EVENT LISTENERS ---
newChatButton.addEventListener("click", () => {
	setChatStatus("");
	createNewChat();

	// Close sidebar on mobile
	if (isMobileView()) {
		closeMobileSidebar();
	}
});

// Stop button click handler
stopBtn.addEventListener("click", () => {
	stopRendering();
});

logoutButton.addEventListener("click", () => {
	loadingMessage.textContent = "Logging out...";
	loadingScreen.classList.add("active");

	setTimeout(() => {
		clearSession();
		window.location.href = "login.html";
	}, 1000);
});

messageForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const content = messageInput.value.trim();
	if (!content) {
		return;
	}
	sendMessage(content);
});

// --- TOAST NOTIFICATION ---
function showToast(message, duration = 2500) {
	// Remove existing toast if any
	const existingToast = document.querySelector('.toast-notification');
	if (existingToast) {
		existingToast.remove();
	}

	const toast = document.createElement('div');
	toast.className = 'toast-notification';
	toast.textContent = message;
	document.body.appendChild(toast);

	// Trigger animation
	requestAnimationFrame(() => {
		toast.classList.add('show');
	});

	// Auto-remove after duration
	setTimeout(() => {
		toast.classList.remove('show');
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

// ========================
// INFO / HELP MODAL
// ========================
// Single card modal with tabs:
// 1. Get Help (default) - Submit problems
// 2. Account - View account & delete
//
// Backend endpoints:
// - POST /help/submit - Submit help request
// - GET /account/info/{user_id} - Get account info
// - POST /account/delete-request - Schedule deletion
// ========================

const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const infoModalClose = document.getElementById("info-modal-close");

// Tab elements
const tabHelp = document.getElementById("tab-help");
const tabAccount = document.getElementById("tab-account");
const panelHelp = document.getElementById("panel-help");
const panelAccount = document.getElementById("panel-account");

// Help form elements
const helpForm = document.getElementById("help-form");
const helpProblem = document.getElementById("help-problem");
const helpSubmitBtn = document.getElementById("help-submit-btn");
const helpSuccess = document.getElementById("help-success");
const helpAnotherBtn = document.getElementById("help-another-btn");

// Account info elements
const infoAvatar = document.getElementById("info-avatar");
const infoUsername = document.getElementById("info-username");
const infoCreatedAt = document.getElementById("info-created-at");
const infoStatus = document.getElementById("info-status");
const deleteAccountBtn = document.getElementById("delete-account-btn");

// Help history elements
const helpHistoryBtn = document.getElementById("help-history-btn");
const helpHistoryPanel = document.getElementById("help-history");
const helpHistoryList = document.getElementById("help-history-list");
const helpHistoryBack = document.getElementById("help-history-back");

// Delete modal elements
const deleteModal = document.getElementById("delete-modal");
const deleteModalClose = document.getElementById("delete-modal-close");
const deleteForm = document.getElementById("delete-form");
const deleteUsernameInput = document.getElementById("delete-username");
const deletePassword = document.getElementById("delete-password");
const deleteKeyword = document.getElementById("delete-keyword");
const deleteError = document.getElementById("delete-error");
const deleteCancelBtn = document.getElementById("delete-cancel-btn");
const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
const deleteSuccessEl = document.getElementById("delete-success");
const deleteDoneBtn = document.getElementById("delete-done-btn");

// Deletion rate limit modal elements
const deletionRatelimitModal = document.getElementById("deletion-ratelimit-modal");
const deletionNextDate = document.getElementById("deletion-next-date");
const deletionRatelimitOk = document.getElementById("deletion-ratelimit-ok");

/**
 * Switches to the specified tab
 */
function switchTab(tabName) {
	// Update tab buttons
	if (tabHelp) tabHelp.classList.toggle("active", tabName === "help");
	if (tabAccount) tabAccount.classList.toggle("active", tabName === "account");
	
	// Update panels
	if (panelHelp) panelHelp.classList.toggle("active", tabName === "help");
	if (panelAccount) panelAccount.classList.toggle("active", tabName === "account");
}

/**
 * Opens the info modal and populates account data
 */
function openInfoModal() {
	if (!infoModal) return;
	
	// Switch to help tab by default
	switchTab("help");
	
	// Populate account info from localStorage
	const username = state.username || localStorage.getItem("username") || "User";
	const userInitials = username.substring(0, 2).toUpperCase();
	
	if (infoAvatar) infoAvatar.textContent = userInitials;
	if (infoUsername) infoUsername.textContent = username;
	
	// For now, show placeholder date (Phase 2 will fetch from backend)
	if (infoCreatedAt) infoCreatedAt.textContent = "Loading...";
	if (infoStatus) {
		infoStatus.textContent = "Active";
		infoStatus.className = "account-value account-status-active";
	}
	
	// Reset help card to form view
	showHelpForm();
	
	// Reset help form state
	if (helpForm) helpForm.style.display = "block";
	if (helpSuccess) helpSuccess.style.display = "none";
	if (helpProblem) helpProblem.value = "";
	
	// Show modal
	infoModal.classList.add("active");
	infoModal.setAttribute("aria-hidden", "false");
	
	// Add ESC key listener
	document.addEventListener("keydown", handleInfoModalKeydown);
	
	// Phase 2: Fetch account info from backend
	fetchAccountInfo();
}

/**
 * Closes the info modal
 */
function closeInfoModal() {
	if (!infoModal) return;
	
	infoModal.classList.remove("active");
	infoModal.setAttribute("aria-hidden", "true");
	
	document.removeEventListener("keydown", handleInfoModalKeydown);
}

/**
 * Handles keydown events for info modal
 */
function handleInfoModalKeydown(e) {
	if (e.key === "Escape") {
		e.preventDefault();
		// If deletion rate limit modal is open, close that first
		if (deletionRatelimitModal && deletionRatelimitModal.classList.contains("active")) {
			closeDeletionRatelimitModal();
		// If delete modal is open, close that
		} else if (deleteModal && deleteModal.classList.contains("active")) {
			closeDeleteModal();
		} else {
			closeInfoModal();
		}
	}
}

/**
 * Fetches account info from backend
 */
async function fetchAccountInfo() {
	try {
		const response = await fetch(`${API_BASE}/account/info/${state.userId}`);
		if (response.ok) {
			const user = await response.json();
			if (infoCreatedAt && user.created_at) {
				const date = new Date(user.created_at);
				infoCreatedAt.textContent = date.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				});
			}
			// Check deletion status and update display
			if (infoStatus) {
				const status = user.deletion_status || "none";
				if (status === "scheduled") {
					infoStatus.textContent = "Scheduled for deletion";
					infoStatus.className = "account-value account-status-scheduled";
				} else if (status === "cancelled") {
					infoStatus.textContent = "Active (deletion cancelled)";
					infoStatus.className = "account-value account-status-active";
				} else {
					infoStatus.textContent = "Active";
					infoStatus.className = "account-value account-status-active";
				}
			}
		}
	} catch (error) {
		console.log("Could not fetch account info:", error);
		if (infoCreatedAt) infoCreatedAt.textContent = "Unknown";
	}
}

/**
 * Handles help form submission
 */
async function handleHelpSubmit(e) {
	e.preventDefault();
	
	const problem = helpProblem?.value.trim();
	if (!problem) return;
	
	// Disable button and show loading
	if (helpSubmitBtn) {
		helpSubmitBtn.disabled = true;
		helpSubmitBtn.innerHTML = '<span>Submitting...</span>';
	}
	
	try {
		// Call backend API to submit help request
		const response = await fetch(`${API_BASE}/help/submit`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				user_id: state.userId,
				username: state.username,
				problem 
			})
		});
		
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Failed to submit request");
		}
		
		// Show success message
		if (helpForm) helpForm.style.display = "none";
		if (helpSuccess) helpSuccess.style.display = "block";
		
	} catch (error) {
		console.error("Failed to submit help request:", error);
		// Show error in a user-friendly way
		alert(error.message || "Failed to submit help request. Please try again.");
	} finally {
		if (helpSubmitBtn) {
			helpSubmitBtn.disabled = false;
			helpSubmitBtn.innerHTML = '<span>Submit Problem</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
		}
	}
}

/**
 * Resets help form to allow another submission
 */
function resetHelpForm() {
	if (helpForm) helpForm.style.display = "block";
	if (helpSuccess) helpSuccess.style.display = "none";
	if (helpHistoryPanel) helpHistoryPanel.classList.remove("active");
	if (helpProblem) helpProblem.value = "";
}

/**
 * Shows the help form view
 */
function showHelpForm() {
	if (helpForm) helpForm.style.display = "flex";
	if (helpHistoryPanel) helpHistoryPanel.classList.remove("active");
	if (helpSuccess) helpSuccess.style.display = "none";
}

/**
 * Shows the help history view and loads history
 */
async function showHelpHistory() {
	if (helpForm) helpForm.style.display = "none";
	if (helpSuccess) helpSuccess.style.display = "none";
	if (helpHistoryPanel) helpHistoryPanel.classList.add("active");
	
	// Load history from backend
	await loadHelpHistory();
}

/**
 * Loads help history from backend
 */
async function loadHelpHistory() {
	if (!helpHistoryList) return;
	
	// Show loading
	helpHistoryList.innerHTML = '<div class="help-history-empty">Loading...</div>';
	
	try {
		const response = await fetch(`${API_BASE}/help/status/${state.userId}`);
		
		if (!response.ok) {
			throw new Error("Failed to load history");
		}
		
		const data = await response.json();
		
		if (data.requests && data.requests.length > 0) {
			// Render history items
			helpHistoryList.innerHTML = data.requests.map(item => {
				const date = new Date(item.created_at);
				const formattedDate = date.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				});
				const statusClass = item.status === 'fixed' ? 'fixed' : 'working';
				const statusText = item.status === 'fixed' ? '✓ Fixed' : 'Working...';
				
				return `
					<div class="help-history-item">
						<div class="help-history-item-header">
							<span class="help-history-date">${formattedDate}</span>
							<span class="help-history-status ${statusClass}">${statusText}</span>
						</div>
						<p class="help-history-problem">${escapeHtml(item.problem)}</p>
					</div>
				`;
			}).join('');
		} else {
			helpHistoryList.innerHTML = '<div class="help-history-empty">No submissions yet</div>';
		}
		
	} catch (error) {
		console.error("Failed to load help history:", error);
		helpHistoryList.innerHTML = '<div class="help-history-empty">Failed to load history</div>';
	}
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Event listeners for help history
if (helpHistoryBtn) {
	helpHistoryBtn.addEventListener("click", showHelpHistory);
}

if (helpHistoryBack) {
	helpHistoryBack.addEventListener("click", showHelpForm);
}

// Event listeners for tab switching
if (tabHelp) {
	tabHelp.addEventListener("click", () => switchTab("help"));
}

if (tabAccount) {
	tabAccount.addEventListener("click", () => switchTab("account"));
}

// Event listener for deletion rate limit modal
if (deletionRatelimitOk) {
	deletionRatelimitOk.addEventListener("click", closeDeletionRatelimitModal);
}

/**
 * Opens the deletion rate limit modal
 */
function openDeletionRatelimitModal(nextDate) {
	if (!deletionRatelimitModal) return;
	
	// Format the next available date
	if (deletionNextDate) {
		const date = new Date(nextDate);
		deletionNextDate.textContent = date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
	
	deletionRatelimitModal.classList.add("active");
	deletionRatelimitModal.setAttribute("aria-hidden", "false");
}

/**
 * Closes the deletion rate limit modal
 */
function closeDeletionRatelimitModal() {
	if (!deletionRatelimitModal) return;
	
	deletionRatelimitModal.classList.remove("active");
	deletionRatelimitModal.setAttribute("aria-hidden", "true");
}

/**
 * Opens the delete confirmation modal
 */
function openDeleteModal() {
	if (!deleteModal) return;
	
	// Reset form
	if (deleteForm) deleteForm.style.display = "block";
	if (deleteSuccessEl) deleteSuccessEl.style.display = "none";
	// Auto-fill username with current logged in user (readonly)
	if (deleteUsernameInput) deleteUsernameInput.value = state.username || localStorage.getItem("username") || "";
	if (deletePassword) deletePassword.value = "";
	if (deleteKeyword) deleteKeyword.value = "";
	if (deleteError) deleteError.textContent = "";
	
	// Show modal
	deleteModal.classList.add("active");
	deleteModal.setAttribute("aria-hidden", "false");
}

/**
 * Closes the delete confirmation modal
 */
function closeDeleteModal() {
	if (!deleteModal) return;
	
	deleteModal.classList.remove("active");
	deleteModal.setAttribute("aria-hidden", "true");
}

/**
 * Handles delete form submission
 */
async function handleDeleteSubmit(e) {
	e.preventDefault();
	
	const username = deleteUsernameInput?.value.trim();
	const password = deletePassword?.value;
	const keyword = deleteKeyword?.value.trim().toLowerCase();
	
	// Validate inputs
	if (!username || !password || !keyword) {
		if (deleteError) deleteError.textContent = "All fields are required";
		return;
	}
	
	// Validate keyword
	if (keyword !== "delete") {
		if (deleteError) deleteError.textContent = "Please type 'delete' to confirm";
		return;
	}
	
	// Clear error
	if (deleteError) deleteError.textContent = "";
	
	// Disable button and show loading
	if (deleteConfirmBtn) {
		deleteConfirmBtn.disabled = true;
		deleteConfirmBtn.textContent = "Processing...";
	}
	
	try {
		// Call backend API to schedule account deletion
		const response = await fetch(`${API_BASE}/account/delete-request`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password, keyword })
		});
		
		const data = await response.json();
		
		if (!response.ok) {
			// Check for rate limit error (429)
			if (response.status === 429) {
				// Close delete modal and show rate limit modal
				closeDeleteModal();
				const nextAvailable = data.detail?.next_available || null;
				openDeletionRatelimitModal(nextAvailable);
				return;
			}
			
			throw new Error(data.detail || "Failed to process request");
		}
		
		// Show success message with countdown
		if (deleteForm) deleteForm.style.display = "none";
		if (deleteSuccessEl) deleteSuccessEl.style.display = "block";
		
		// Update account status in info modal
		if (infoStatus) {
			infoStatus.textContent = "Scheduled for deletion";
			infoStatus.className = "account-value account-status-scheduled";
		}
		
		// Set flag in localStorage to handle page refresh during countdown
		localStorage.setItem("deletionInProgress", "true");
		
		// Start countdown and auto-logout
		startDeletionCountdown();
		
	} catch (error) {
		if (deleteError) deleteError.textContent = error.message || "Failed to process request";
	} finally {
		if (deleteConfirmBtn) {
			deleteConfirmBtn.disabled = false;
			deleteConfirmBtn.textContent = "Confirm Deletion";
		}
	}
}

/**
 * Countdown timer for auto-logout after deletion
 */
const deleteCountdownTimer = document.getElementById("delete-countdown-timer");
let deletionCountdownInterval = null;

function startDeletionCountdown() {
	let seconds = 5;
	
	// Update timer immediately
	if (deleteCountdownTimer) {
		deleteCountdownTimer.textContent = seconds;
	}
	
	// Disable all interactions during countdown
	disableAllInteractions();
	
	deletionCountdownInterval = setInterval(() => {
		seconds--;
		
		if (deleteCountdownTimer) {
			deleteCountdownTimer.textContent = seconds;
		}
		
		if (seconds <= 0) {
			clearInterval(deletionCountdownInterval);
			performLogout();
		}
	}, 1000);
}

/**
 * Disable all interactions during deletion countdown
 */
function disableAllInteractions() {
	// Create overlay to block all interactions
	const blockOverlay = document.createElement("div");
	blockOverlay.id = "deletion-block-overlay";
	blockOverlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		z-index: 99998;
		cursor: not-allowed;
	`;
	document.body.appendChild(blockOverlay);
	
	// Disable keyboard shortcuts
	document.addEventListener("keydown", preventAllKeys, true);
}

/**
 * Prevent all keyboard shortcuts during deletion
 */
function preventAllKeys(e) {
	// Allow nothing during deletion countdown
	e.preventDefault();
	e.stopPropagation();
}

/**
 * Perform logout and redirect to login page
 */
function performLogout() {
	// Clear localStorage
	localStorage.removeItem("userId");
	localStorage.removeItem("username");
	localStorage.removeItem("activeChatId");
	localStorage.removeItem("deletionInProgress");
	
	// Redirect to login
	window.location.href = "login.html";
}

/**
 * Check on page load if deletion was in progress (user refreshed)
 */
function checkDeletionInProgress() {
	if (localStorage.getItem("deletionInProgress") === "true") {
		// User refreshed during deletion countdown - logout immediately
		performLogout();
	}
}

// Check for deletion in progress on page load
checkDeletionInProgress();

// Event listeners for info modal
if (infoBtn) {
	infoBtn.addEventListener("click", openInfoModal);
}

if (infoModalClose) {
	infoModalClose.addEventListener("click", closeInfoModal);
}

if (infoModal) {
	infoModal.addEventListener("click", (e) => {
		if (e.target === infoModal) {
			closeInfoModal();
		}
	});
}

// Event listeners for help form
if (helpForm) {
	helpForm.addEventListener("submit", handleHelpSubmit);
}

if (helpAnotherBtn) {
	helpAnotherBtn.addEventListener("click", resetHelpForm);
}

// Event listeners for delete account
if (deleteAccountBtn) {
	deleteAccountBtn.addEventListener("click", openDeleteModal);
}

if (deleteModalClose) {
	deleteModalClose.addEventListener("click", closeDeleteModal);
}

if (deleteCancelBtn) {
	deleteCancelBtn.addEventListener("click", closeDeleteModal);
}

if (deleteModal) {
	deleteModal.addEventListener("click", (e) => {
		if (e.target === deleteModal) {
			closeDeleteModal();
		}
	});
}

if (deleteForm) {
	deleteForm.addEventListener("submit", handleDeleteSubmit);
}

if (deleteDoneBtn) {
	deleteDoneBtn.addEventListener("click", handleDeleteDone);
}


// ========================
// FILE UPLOAD MODAL
// ========================
// Custom modal to inform users that file upload is temporarily unavailable.
// 
// WHY DISABLED:
// File upload feature is temporarily disabled due to high server demand.
// Instead of showing a confusing error or browser alert, we display a
// user-friendly modal that matches the Saivo design system.
//
// ACCESSIBILITY:
// - ESC key closes the modal
// - Focus is trapped inside modal while open
// - ARIA attributes for screen readers
// ========================

const uploadModal = document.getElementById("upload-modal");
const uploadModalCloseBtn = document.getElementById("upload-modal-close");
const uploadModalGotItBtn = document.getElementById("upload-modal-got-it");

// Store the element that had focus before modal opened
let previouslyFocusedElement = null;

function openUploadModal() {
	if (!uploadModal) return;
	
	// Store current focus to restore later
	previouslyFocusedElement = document.activeElement;
	
	// Show modal
	uploadModal.classList.add("active");
	uploadModal.setAttribute("aria-hidden", "false");
	
	// Focus the "Got it" button for accessibility
	setTimeout(() => {
		if (uploadModalGotItBtn) {
			uploadModalGotItBtn.focus();
		}
	}, 50);
	
	// Add ESC key listener
	document.addEventListener("keydown", handleUploadModalKeydown);
}

function closeUploadModal() {
	if (!uploadModal) return;
	
	// Hide modal
	uploadModal.classList.remove("active");
	uploadModal.setAttribute("aria-hidden", "true");
	
	// Remove ESC key listener
	document.removeEventListener("keydown", handleUploadModalKeydown);
	
	// Restore focus to previously focused element
	if (previouslyFocusedElement) {
		previouslyFocusedElement.focus();
		previouslyFocusedElement = null;
	}
}

function handleUploadModalKeydown(e) {
	// Close on ESC key
	if (e.key === "Escape") {
		e.preventDefault();
		closeUploadModal();
		return;
	}
	
	// Trap focus inside modal (Tab key handling)
	if (e.key === "Tab") {
		const focusableElements = uploadModal.querySelectorAll(
			'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];
		
		if (e.shiftKey) {
			// Shift+Tab: if on first element, wrap to last
			if (document.activeElement === firstElement) {
				e.preventDefault();
				lastElement.focus();
			}
		} else {
			// Tab: if on last element, wrap to first
			if (document.activeElement === lastElement) {
				e.preventDefault();
				firstElement.focus();
			}
		}
	}
}

// Upload button click handler - shows custom modal instead of file picker
uploadBtn.addEventListener("click", (e) => {
	e.preventDefault();  // Prevent any default file picker behavior
	openUploadModal();
});

// Close button (✕) click handler
if (uploadModalCloseBtn) {
	uploadModalCloseBtn.addEventListener("click", closeUploadModal);
}

// "Got it" button click handler
if (uploadModalGotItBtn) {
	uploadModalGotItBtn.addEventListener("click", closeUploadModal);
}

// Click outside modal to close
if (uploadModal) {
	uploadModal.addEventListener("click", (e) => {
		// Only close if clicking on the overlay, not the card
		if (e.target === uploadModal) {
			closeUploadModal();
		}
	});
}

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
	initializeApp();
});
