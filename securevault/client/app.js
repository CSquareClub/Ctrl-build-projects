// ===== GLOBAL VARIABLES =====
let masterKey = null;
let userId = null;
let allPasswords = [];
let currentCategory = 'all';
let sessionTimeout = null;
const SESSION_DURATION = 15 * 60 * 1000;

const CATEGORIES = {
  social: { icon: '👥', name: 'Social Media' },
  work: { icon: '💼', name: 'Work' },
  finance: { icon: '🏦', name: 'Finance' },
  shopping: { icon: '🛒', name: 'Shopping' },
  entertainment: { icon: '🎮', name: 'Entertainment' },
  other: { icon: '📌', name: 'Other' }
};

// ===== AUTHENTICATION =====
function unlockVault() {
  const masterPassword = document.getElementById('master-password').value;
  
  if (masterPassword.length < 8) {
    showNotification('Master password must be at least 8 characters', 'error');
    return;
  }

  masterKey = CryptoJS.SHA256(masterPassword).toString();
  userId = CryptoJS.MD5(masterPassword).toString();

  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('vault-section').style.display = 'flex';

  loadPasswords();
  startSessionTimeout();
  showNotification('✅ Vault unlocked successfully!', 'success');
}

function lockVault() {
  masterKey = null;
  userId = null;
  allPasswords = [];
  document.getElementById('auth-section').style.display = 'flex';
  document.getElementById('vault-section').style.display = 'none';
  document.getElementById('master-password').value = '';
  clearTimeout(sessionTimeout);
  showNotification('🔒 Vault locked', 'info');
}

function startSessionTimeout() {
  clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    lockVault();
    showNotification('⏰ Session expired', 'warning');
  }, SESSION_DURATION);
}

document.addEventListener('click', () => {
  if (masterKey) startSessionTimeout();
});

// ===== ENCRYPTION =====
function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, masterKey).toString();
}

function decryptPassword(encryptedPassword) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, masterKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return '';
  }
}

// ===== PASSWORD MANAGEMENT =====
async function savePassword() {
  const id = document.getElementById('edit-id').value;
  const website = document.getElementById('input-website').value.trim();
  const username = document.getElementById('input-username').value.trim();
  const password = document.getElementById('input-password').value;
  const category = document.getElementById('input-category').value;
  const notes = document.getElementById('input-notes').value.trim();

  if (!website || !username || !password) {
    showNotification('❌ Please fill all required fields', 'error');
    return;
  }

  // If editing, delete old entry first
  if (id) {
    await fetch(`/api/vault/delete/${id}`, { method: 'DELETE' });
  }

  const encryptedPassword = encryptPassword(password);
  const encryptedNotes = notes ? encryptPassword(notes) : '';

  try {
    const response = await fetch('/api/vault/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        website, 
        username, 
        encryptedPassword,
        category,
        encryptedNotes
      })
    });

    const data = await response.json();
    
    if (data.success) {
      closeModal();
      loadPasswords();
      showNotification(id ? '✅ Password updated!' : '✅ Password saved!', 'success');
    }
  } catch (error) {
    showNotification('❌ Error saving password', 'error');
  }
}

async function loadPasswords() {
  try {
    const response = await fetch(`/api/vault/retrieve/${userId}`);
    const data = await response.json();

    if (data.success) {
      allPasswords = data.data;
      displayPasswords(allPasswords);
      updateStats();
      updateCategoryCounts();
      runSecurityAudit();
      renderCategoriesView();
    }
  } catch (error) {
    showNotification('❌ Error loading passwords', 'error');
  }
}

function displayPasswords(entries) {
  const listDiv = document.getElementById('password-list');
  
  // Filter by category
  let filtered = currentCategory === 'all' 
    ? entries 
    : entries.filter(e => e.category === currentCategory);
  
  // Filter by search
  const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
  if (searchTerm) {
    filtered = filtered.filter(e => 
      e.website.toLowerCase().includes(searchTerm) ||
      e.username.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filtered.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state">
        <span>📭</span>
        <p>No passwords found</p>
      </div>
    `;
    return;
  }

  listDiv.innerHTML = filtered.map(entry => {
    const decrypted = decryptPassword(entry.encryptedPassword);
    const strength = getPasswordStrength(decrypted);
    const cat = CATEGORIES[entry.category] || CATEGORIES.other;
    
    return `
      <div class="password-row">
        <div class="website-cell">
          <div class="website-icon">${getWebsiteIcon(entry.website)}</div>
          <div>
            <div class="website-name">${escapeHtml(entry.website)}</div>
            <div class="website-url">${getDomain(entry.website)}</div>
          </div>
        </div>
        <div class="username-cell">${escapeHtml(entry.username)}</div>
        <div>
          <span class="category-badge">${cat.icon} ${cat.name}</span>
        </div>
        <div>
          <span class="strength-badge strength-${strength.class}">${strength.label}</span>
        </div>
        <div class="action-buttons">
          <button class="action-btn" onclick="copyPassword('${entry.encryptedPassword}')" title="Copy">📋</button>
          <button class="action-btn" onclick="togglePasswordView('${entry._id}', '${entry.encryptedPassword}')" title="View">👁️</button>
          <button class="action-btn" onclick="openEditModal('${entry._id}')" title="Edit">✏️</button>
          <button class="action-btn danger" onclick="deletePassword('${entry._id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function copyPassword(encryptedPassword) {
  const password = decryptPassword(encryptedPassword);
  navigator.clipboard.writeText(password);
  showNotification('📋 Password copied!', 'success');
}

function togglePasswordView(id, encryptedPassword) {
  const decrypted = decryptPassword(encryptedPassword);
  showNotification(`🔑 Password: ${decrypted}`, 'info');
}

async function deletePassword(id) {
  if (!confirm('🗑️ Are you sure you want to delete this password?')) return;

  try {
    const response = await fetch(`/api/vault/delete/${id}`, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.success) {
      loadPasswords();
      showNotification('🗑️ Password deleted', 'success');
    }
  } catch (error) {
    showNotification('❌ Error deleting password', 'error');
  }
}

// ===== STATISTICS =====
function updateStats() {
  document.getElementById('stat-total').textContent = allPasswords.length;
  
  let weak = 0, reused = 0, old = 0;
  const passwordHashes = {};
  const now = new Date();
  
  allPasswords.forEach(entry => {
    const decrypted = decryptPassword(entry.encryptedPassword);
    const strength = getPasswordStrength(decrypted);
    
    if (strength.score < 3) weak++;
    
    const hash = CryptoJS.MD5(decrypted).toString();
    passwordHashes[hash] = (passwordHashes[hash] || 0) + 1;
    
    const created = new Date(entry.createdAt);
    const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) old++;
  });
  
  reused = Object.values(passwordHashes).filter(count => count > 1).reduce((a, b) => a + b, 0);
  
  document.getElementById('stat-weak').textContent = weak;
  document.getElementById('stat-reused').textContent = reused;
  document.getElementById('stat-old').textContent = old;
}

function updateCategoryCounts() {
  const counts = { all: allPasswords.length };
  Object.keys(CATEGORIES).forEach(cat => counts[cat] = 0);
  
  allPasswords.forEach(entry => {
    const cat = entry.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  Object.keys(counts).forEach(cat => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.textContent = counts[cat];
  });
}

// ===== SECURITY AUDIT =====
function runSecurityAudit() {
  const weakList = document.getElementById('weak-passwords-list');
  const reusedList = document.getElementById('reused-passwords-list');
  const oldList = document.getElementById('old-passwords-list');
  
  let weakPasswords = [];
  let reusedPasswords = [];
  let oldPasswords = [];
  
  const passwordHashes = {};
  const now = new Date();
  
  // Analyze passwords
  allPasswords.forEach(entry => {
    const decrypted = decryptPassword(entry.encryptedPassword);
    const strength = getPasswordStrength(decrypted);
    
    // Check weak
    if (strength.score < 3) {
      weakPasswords.push({ ...entry, strength });
    }
    
    // Track for reuse check
    const hash = CryptoJS.MD5(decrypted).toString();
    if (!passwordHashes[hash]) passwordHashes[hash] = [];
    passwordHashes[hash].push(entry);
    
    // Check old
    const created = new Date(entry.createdAt);
    const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      oldPasswords.push({ ...entry, days: daysDiff });
    }
  });
  
  // Find reused
  Object.values(passwordHashes).forEach(entries => {
    if (entries.length > 1) {
      reusedPasswords = reusedPasswords.concat(entries);
    }
  });
  
  // Render weak passwords
  if (weakPasswords.length === 0) {
    weakList.innerHTML = '<div class="audit-empty">✅ No weak passwords!</div>';
  } else {
    weakList.innerHTML = weakPasswords.map(e => `
      <div class="audit-item">
        <span class="audit-item-icon">${getWebsiteIcon(e.website)}</span>
        <span>${escapeHtml(e.website)}</span>
      </div>
    `).join('');
  }
  
  // Render reused passwords
  if (reusedPasswords.length === 0) {
    reusedList.innerHTML = '<div class="audit-empty">✅ No reused passwords!</div>';
  } else {
    reusedList.innerHTML = reusedPasswords.map(e => `
      <div class="audit-item">
        <span class="audit-item-icon">${getWebsiteIcon(e.website)}</span>
        <span>${escapeHtml(e.website)}</span>
      </div>
    `).join('');
  }
  
  // Render old passwords
  if (oldPasswords.length === 0) {
    oldList.innerHTML = '<div class="audit-empty">✅ All passwords are fresh!</div>';
  } else {
    oldList.innerHTML = oldPasswords.map(e => `
      <div class="audit-item">
        <span class="audit-item-icon">${getWebsiteIcon(e.website)}</span>
        <span>${escapeHtml(e.website)} (${e.days} days)</span>
      </div>
    `).join('');
  }
  
  // Calculate security score
  const total = allPasswords.length || 1;
  const weakPenalty = (weakPasswords.length / total) * 40;
  const reusedPenalty = (reusedPasswords.length / total) * 35;
  const oldPenalty = (oldPasswords.length / total) * 25;
  
  let score = Math.max(0, Math.round(100 - weakPenalty - reusedPenalty - oldPenalty));
  if (allPasswords.length === 0) score = 100;
  
  // Update score display
  document.getElementById('security-score').textContent = score;
  
  const circle = document.getElementById('score-circle');
  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;
  circle.style.strokeDashoffset = offset;
  
  // Update message
  const messageEl = document.getElementById('score-message');
  if (score >= 90) {
    messageEl.textContent = '🛡️ Excellent! Your vault is very secure.';
    circle.style.stroke = '#10b981';
  } else if (score >= 70) {
    messageEl.textContent = '👍 Good, but there\'s room for improvement.';
    circle.style.stroke = '#3b82f6';
  } else if (score >= 50) {
    messageEl.textContent = '⚠️ Fair. Consider updating weak passwords.';
    circle.style.stroke = '#f59e0b';
  } else {
    messageEl.textContent = '🚨 Poor security. Take action now!';
    circle.style.stroke = '#ef4444';
  }
}

// ===== CATEGORIES VIEW =====
function renderCategoriesView() {
  const grid = document.getElementById('categories-grid');
  
  const counts = {};
  Object.keys(CATEGORIES).forEach(cat => counts[cat] = 0);
  
  allPasswords.forEach(entry => {
    const cat = entry.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  grid.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <div class="category-card" onclick="filterByCategory('${key}'); showView('passwords');">
      <div class="category-card-icon">${cat.icon}</div>
      <h3>${cat.name}</h3>
      <div class="count">${counts[key]}</div>
    </div>
  `).join('');
}

// ===== VIEWS & NAVIGATION =====
function showView(view) {
  // Update nav buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Update view containers
  document.querySelectorAll('.view-container').forEach(container => {
    container.classList.toggle('active', container.id === `${view}-view`);
  });
  
  // Update header
  const titles = {
    passwords: ['All Passwords', 'Manage your secure credentials'],
    audit: ['Security Audit', 'Analyze your password health'],
    categories: ['Categories', 'Organize passwords by type'],
    export: ['Export / Backup', 'Download or import your vault']
  };
  
  document.getElementById('view-title').textContent = titles[view][0];
  document.getElementById('view-subtitle').textContent = titles[view][1];
}

function filterByCategory(category) {
  currentCategory = category;
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  
  displayPasswords(allPasswords);
}

function filterPasswords() {
  displayPasswords(allPasswords);
}

// ===== MODAL =====
function openAddModal() {
  document.getElementById('modal-title').textContent = '➕ Add New Password';
  document.getElementById('edit-id').value = '';
  document.getElementById('input-website').value = '';
  document.getElementById('input-username').value = '';
  document.getElementById('input-password').value = '';
  document.getElementById('input-category').value = 'other';
  document.getElementById('input-notes').value = '';
  document.getElementById('password-strength').innerHTML = '';
  document.getElementById('password-modal').classList.add('active');
}

function openEditModal(id) {
  const entry = allPasswords.find(e => e._id === id);
  if (!entry) return;
  
  document.getElementById('modal-title').textContent = '✏️ Edit Password';
  document.getElementById('edit-id').value = id;
  document.getElementById('input-website').value = entry.website;
  document.getElementById('input-username').value = entry.username;
  document.getElementById('input-password').value = decryptPassword(entry.encryptedPassword);
  document.getElementById('input-category').value = entry.category || 'other';
  document.getElementById('input-notes').value = entry.encryptedNotes ? decryptPassword(entry.encryptedNotes) : '';
  
  checkPasswordStrength(decryptPassword(entry.encryptedPassword));
  document.getElementById('password-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('password-modal').classList.remove('active');
}

// ===== PASSWORD GENERATOR =====
function generatePassword() {
  const length = 20;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  document.getElementById('input-password').value = password;
  document.getElementById('input-password').type = 'text';
  checkPasswordStrength(password);
  showNotification('🎲 Strong password generated!', 'success');
}

// ===== PASSWORD STRENGTH =====
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'None', class: 'weak' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', class: 'weak' };
  if (score <= 3) return { score, label: 'Fair', class: 'fair' };
  if (score <= 4) return { score, label: 'Good', class: 'good' };
  return { score, label: 'Strong', class: 'strong' };
}

function checkPasswordStrength(password) {
  const strengthDiv = document.getElementById('password-strength');
  if (!password) {
    strengthDiv.innerHTML = '';
    return;
  }

  const strength = getPasswordStrength(password);
  const colors = { weak: '#ef4444', fair: '#f59e0b', good: '#3b82f6', strong: '#10b981' };
  const widths = { weak: '25%', fair: '50%', good: '75%', strong: '100%' };
  
  strengthDiv.innerHTML = `
    <div class="strength-bar">
      <div class="strength-fill" style="width: ${widths[strength.class]}; background: ${colors[strength.class]};"></div>
    </div>
    <small style="color: ${colors[strength.class]};">${strength.label} password</small>
  `;
}

// ===== EXPORT FUNCTIONS =====
function exportJSON() {
  const data = allPasswords.map(entry => ({
    website: entry.website,
    username: entry.username,
    password: decryptPassword(entry.encryptedPassword),
    category: entry.category || 'other',
    notes: entry.encryptedNotes ? decryptPassword(entry.encryptedNotes) : '',
    createdAt: entry.createdAt
  }));

  downloadFile(
    JSON.stringify(data, null, 2),
    `securevault-backup-${getDateString()}.json`,
    'application/json'
  );
  
  showNotification('📄 JSON exported successfully!', 'success');
}

function exportCSV() {
  const headers = ['Website', 'Username', 'Password', 'Category', 'Notes', 'Created'];
  const rows = allPasswords.map(entry => [
    entry.website,
    entry.username,
    decryptPassword(entry.encryptedPassword),
    entry.category || 'other',
    entry.encryptedNotes ? decryptPassword(entry.encryptedNotes) : '',
    entry.createdAt
  ]);

  const csv = [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  downloadFile(
    csv,
    `securevault-backup-${getDateString()}.csv`,
    'text/csv'
  );
  
  showNotification('📊 CSV exported successfully!', 'success');
}

function exportEncrypted() {
  const data = JSON.stringify(allPasswords);
  const encrypted = CryptoJS.AES.encrypt(data, masterKey).toString();
  
  downloadFile(
    encrypted,
    `securevault-encrypted-${getDateString()}.vault`,
    'application/octet-stream'
  );
  
  showNotification('🔐 Encrypted backup created!', 'success');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const content = await file.text();
  
  try {
    let entries;
    
    if (file.name.endsWith('.json')) {
      entries = JSON.parse(content);
    } else if (file.name.endsWith('.csv')) {
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      
      entries = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const entry = {};
        headers.forEach((header, i) => {
          entry[header] = values[i]?.replace(/"/g, '').trim() || '';
        });
        return entry;
      });
    } else {
      throw new Error('Unsupported file format');
    }

    let imported = 0;
    for (const entry of entries) {
      const encryptedPassword = encryptPassword(entry.password);
      const encryptedNotes = entry.notes ? encryptPassword(entry.notes) : '';
      
      await fetch('/api/vault/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          website: entry.website,
          username: entry.username,
          encryptedPassword,
          category: entry.category || 'other',
          encryptedNotes
        })
      });
      imported++;
    }

    loadPasswords();
    showNotification(`📥 Imported ${imported} passwords!`, 'success');
  } catch (error) {
    showNotification('❌ Import failed: ' + error.message, 'error');
  }
  
  event.target.value = '';
}

// ===== DARK MODE =====
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
  showNotification(isDark ? '🌙 Dark mode' : '☀️ Light mode', 'info');
}

if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  document.getElementById('theme-icon').textContent = '☀️';
}

// ===== UTILITIES =====
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function getWebsiteIcon(website) {
  const icons = {
    google: '🔍', gmail: '📧', facebook: '👥', twitter: '🐦', x: '✖️',
    instagram: '📷', linkedin: '💼', github: '🐙', amazon: '🛒',
    netflix: '🎬', spotify: '🎵', reddit: '🤖', youtube: '▶️',
    apple: '🍎', microsoft: '🪟', dropbox: '📦', slack: '💬',
    discord: '🎮', twitch: '🟣', paypal: '💰', stripe: '💳',
    bank: '🏦', chase: '🏦', wells: '🏦'
  };
  
  const lower = website.toLowerCase();
  for (const [key, icon] of Object.entries(icons)) {
    if (lower.includes(key)) return icon;
  }
  return '🌐';
}

function getDomain(website) {
  return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function getDateString() {
  return new Date().toISOString().split('T')[0];
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modal on outside click
document.getElementById('password-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'password-modal') closeModal();
});
