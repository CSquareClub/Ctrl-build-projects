/* ═══════════════════════════════════════════════
   DevMatch — Hackathon Organizer Panel
   Vanilla JS — No frameworks
═══════════════════════════════════════════════ */

/* ────────────────────────────
   MOCK DATA
──────────────────────────── */
const MOCK_TEAMS = [
  { name: "ByteForce",      leader: "Aryan Sharma",  members: ["Aryan Sharma","Priya Nair","Kiran Das","Mehul Patel"],     roles: ["Frontend","Backend","ML"] },
  { name: "NullPointers",   leader: "Sneha Joshi",   members: ["Sneha Joshi","Rahul Verma","Tanya Singh"],                 roles: ["Backend","DevOps","Design"] },
  { name: "StackOverflow",  leader: "Dev Anand",     members: ["Dev Anand","Aisha Khan","Rohan Mehta","Lakshmi R."],       roles: ["Frontend","Backend","ML","Mobile"] },
  { name: "AlgoRhythm",     leader: "Pooja Iyer",    members: ["Pooja Iyer","Sameer Gupta","Nisha Thomas"],                roles: ["ML","Data Science","Backend"] },
  { name: "HexaDev",        leader: "Vikram Nair",   members: ["Vikram Nair","Anjali Rao","Manish Desai"],                 roles: ["Frontend","Design","Mobile"] },
  { name: "CodeNinjas",     leader: "Ritika Pande",  members: ["Ritika Pande","Akshay Borkar","Swati More","Harish K."],   roles: ["Backend","Frontend","Data Science"] },
  { name: "ZeroDay",        leader: "Suresh Rajan",  members: ["Suresh Rajan","Deepika M.","Akash N."],                   roles: ["Backend","ML","DevOps"] },
  { name: "PixelPirates",   leader: "Neha Kulkarni", members: ["Neha Kulkarni","Aman Tiwari","Ruchi Verma","Gaurav S."],   roles: ["Design","Frontend","Mobile"] }
];

const ROLE_CLASS = {
  'Frontend':    'role-fe',
  'Backend':     'role-be',
  'ML':          'role-ml',
  'Data Science':'role-ds',
  'Mobile':      'role-mob',
  'Design':      'role-des',
  'DevOps':      'role-be'
};

/* ────────────────────────────
   STATE
──────────────────────────── */
let attendanceState  = {};
let feeEnabled       = false;
let activeHkIndex    = null;   // index into dm_hackathons array

/* ────────────────────────────
   STORAGE HELPERS (multi-hackathon)
──────────────────────────── */
function getHackathons() {
  return JSON.parse(localStorage.getItem('dm_hackathons') || '[]');
}
function saveHackathons(list) {
  localStorage.setItem('dm_hackathons', JSON.stringify(list));
}
function getActiveHackathon() {
  const list = getHackathons();
  if (activeHkIndex !== null && list[activeHkIndex]) return list[activeHkIndex];
  return null;
}

/* ────────────────────────────
   INIT
──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAttendance();
  renderTeams();
  loadProfileIntoForm();

  const loggedIn = sessionStorage.getItem('dm_logged_in');
  if (!loggedIn) { showPage('page-login'); return; }

  // Migrate old single-hackathon data if present
  migrateLegacyHackathon();

  const savedIdx  = sessionStorage.getItem('dm_active_hk_index');
  const hackathons = getHackathons();

  if (hackathons.length === 0) {
    showPage('page-create');
  } else if (savedIdx !== null && hackathons[+savedIdx]) {
    activeHkIndex = +savedIdx;
    openHackathon(activeHkIndex);
  } else {
    showPage('page-hklist');
    renderHkList();
  }
});

/* Migrate pre-multi-hackathon data */
function migrateLegacyHackathon() {
  const legacy = localStorage.getItem('dm_hackathon');
  if (!legacy) return;
  const list = getHackathons();
  if (list.length === 0) {
    const data = JSON.parse(legacy);
    list.push(data);
    saveHackathons(list);
  }
  localStorage.removeItem('dm_hackathon');
}

/* ────────────────────────────
   PAGE NAVIGATION
──────────────────────────── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById(id);
  if (t) t.classList.add('active');
}

function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (name === 'dashboard') updatePresentCount();
}

/* ────────────────────────────
   HACKATHON LIST
──────────────────────────── */
function goHkList() {
  showPage('page-hklist');
  renderHkList();
}

function renderHkList() {
  const list  = getHackathons();
  const grid  = document.getElementById('hk-list-grid');
  const empty = document.getElementById('hklist-empty');
  if (!grid) return;
  grid.innerHTML = '';

  if (list.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.forEach((hk, idx) => {
    const card = document.createElement('div');
    card.className = 'hk-list-card' + (idx === activeHkIndex ? ' active-card' : '');

    const startFmt = hk.start ? fmtDate(hk.start.split('T')[0] || hk.start) : '—';
    const modeTxt  = hk.mode || 'Offline';

    card.innerHTML = `
      <div class="hk-card-name">${hk.name}</div>
      <div class="hk-card-meta">${startFmt}${hk.venue ? ' · ' + hk.venue : ''}</div>
      <span class="hk-card-mode">${modeTxt}</span>
      <div class="hk-card-actions">
        <button class="btn-delete-hk" onclick="deleteHackathon(${idx}, event)">Delete</button>
        <button class="btn-open-hk"   onclick="openHackathon(${idx})">Open →</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openHackathon(idx) {
  const list = getHackathons();
  if (!list[idx]) return;
  activeHkIndex = idx;
  sessionStorage.setItem('dm_active_hk_index', idx);

  // Reset attendance for the newly opened event
  initAttendance();

  showPage('page-app');
  renderDashboard(list[idx]);
  loadProfileIntoForm();
  switchTab('dashboard');
}

function deleteHackathon(idx, e) {
  e.stopPropagation();
  const list = getHackathons();
  list.splice(idx, 1);
  saveHackathons(list);
  if (activeHkIndex === idx) {
    activeHkIndex = null;
    sessionStorage.removeItem('dm_active_hk_index');
  } else if (activeHkIndex > idx) {
    activeHkIndex--;
    sessionStorage.setItem('dm_active_hk_index', activeHkIndex);
  }
  renderHkList();
}

function goCreateHackathon() {
  // Reset the create form
  ['hk-name','hk-desc','hk-problems','hk-start','hk-end','hk-venue','hk-reg-start','hk-reg-end','hk-fee']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  feeEnabled = false;
  const toggle = document.getElementById('fee-toggle');
  if (toggle) toggle.classList.remove('on');
  const feeWrap = document.getElementById('fee-amount-wrap');
  if (feeWrap) feeWrap.style.display = 'none';

  showPage('page-create');
}

function goBackFromCreate() {
  const hackathons = getHackathons();
  if (hackathons.length > 0) {
    showPage('page-hklist');
    renderHkList();
  } else {
    showPage('page-login');
  }
}

/* ────────────────────────────
   LOGIN
──────────────────────────── */
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value.trim();
  if (!email || !pass) { flashInput('login-email'); flashInput('login-password'); return; }

  sessionStorage.setItem('dm_logged_in', 'true');

  const profile = JSON.parse(localStorage.getItem('dm_profile') || '{}');
  if (!profile.email) {
    profile.email = email;
    localStorage.setItem('dm_profile', JSON.stringify(profile));
  }

  migrateLegacyHackathon();

  const hackathons = getHackathons();
  if (hackathons.length === 0) {
    showPage('page-create');
  } else {
    showPage('page-hklist');
    renderHkList();
  }
}

function flashInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--cream)';
  el.style.boxShadow   = '0 0 0 3px rgba(245,233,174,0.2)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1500);
}

/* ────────────────────────────
   CREATE HACKATHON
──────────────────────────── */
function toggleFee() {
  feeEnabled = !feeEnabled;
  document.getElementById('fee-toggle').classList.toggle('on', feeEnabled);
  document.getElementById('fee-amount-wrap').style.display = feeEnabled ? 'block' : 'none';
}

function createHackathon() {
  const name = document.getElementById('hk-name').value.trim();
  if (!name) { flashCreate('hk-name'); return; }

  const data = {
    name:     name,
    desc:     document.getElementById('hk-desc').value.trim()     || 'No description provided.',
    problems: document.getElementById('hk-problems').value.trim() || 'No problem statements listed yet.',
    start:    document.getElementById('hk-start').value,
    end:      document.getElementById('hk-end').value,
    venue:    document.getElementById('hk-venue').value.trim()    || 'TBD',
    mode:     document.getElementById('hk-mode').value,
    regStart: document.getElementById('hk-reg-start').value,
    regEnd:   document.getElementById('hk-reg-end').value,
    fee:      feeEnabled ? (document.getElementById('hk-fee').value || '0') : null
  };

  const list = getHackathons();
  list.push(data);
  saveHackathons(list);
  activeHkIndex = list.length - 1;
  sessionStorage.setItem('dm_active_hk_index', activeHkIndex);

  initAttendance();
  showPage('page-app');
  renderDashboard(data);
  loadProfileIntoForm();
  switchTab('dashboard');
}

function flashCreate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.style.borderColor = 'var(--cream)';
  el.style.boxShadow   = '0 0 0 3px rgba(245,233,174,0.15)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1500);
}

/* ────────────────────────────
   DASHBOARD
──────────────────────────── */
function renderDashboard(hk) {
  setText('dash-title', hk.name || 'Hackathon');
  setText('dash-mode-badge', hk.mode || 'Offline');
  setText('dash-desc', hk.desc || '—');
  setText('dash-problems', hk.problems || '—');
  setText('dash-venue', hk.venue || '—');
  setText('dash-fee', hk.fee ? `₹${hk.fee}` : 'Free');

  const startFmt = hk.start ? fmtDateTime(hk.start) : '—';
  const endFmt   = hk.end   ? fmtDateTime(hk.end)   : '—';
  setText('dash-dates', startFmt + (hk.end ? ' → ' + endFmt : ''));
  setText('dash-meta',  hk.venue ? `${hk.venue}  ·  ${hk.mode}` : hk.mode || '');

  const rs = hk.regStart ? fmtDate(hk.regStart) : '—';
  const re = hk.regEnd   ? fmtDate(hk.regEnd)   : '—';
  setText('dash-reg', rs + ' → ' + re);

  setText('stat-participants', MOCK_TEAMS.reduce((a,t) => a + t.members.length, 0));
  setText('stat-teams', MOCK_TEAMS.length);
  updatePresentCount();

  // Update sidebar current event name
  setText('shk-name', hk.name || '—');
}

function updatePresentCount() {
  const count = Object.values(attendanceState).filter(v => v === 'present').length;
  setText('stat-present', count);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmtDateTime(dt) {
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit', hour12:true
    });
  } catch { return dt; }
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day:'2-digit', month:'short', year:'numeric'
    });
  } catch { return d; }
}

/* ────────────────────────────
   TEAMS
──────────────────────────── */
function renderTeams() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  grid.innerHTML = '';

  MOCK_TEAMS.forEach(team => {
    const card = document.createElement('div');
    card.className = 'team-card';

    const rolesHTML = team.roles.map(r => `<span class="role-tag ${ROLE_CLASS[r]||'role-be'}">${r}</span>`).join('');

    card.innerHTML = `
      <div class="team-name">${team.name}</div>
      <div class="team-leader">Led by <span>${team.leader}</span></div>
      <div class="team-member-count">◈ ${team.members.length} member${team.members.length !== 1 ? 's' : ''}</div>
      <div class="team-roles">${rolesHTML}</div>
    `;
    grid.appendChild(card);
  });

  setText('teams-count-badge', `${MOCK_TEAMS.length} Teams`);
}

/* ────────────────────────────
   ATTENDANCE
──────────────────────────── */
function initAttendance() {
  attendanceState = {};
  MOCK_TEAMS.forEach(t => { attendanceState[t.name] = 'pending'; });
  renderAttendance();
}

function renderAttendance() {
  const tbody = document.getElementById('att-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  MOCK_TEAMS.forEach((team, idx) => {
    const status = attendanceState[team.name] || 'pending';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${String(idx+1).padStart(2,'0')}</td>
      <td>${team.name}</td>
      <td>${team.leader}</td>
      <td><span class="status-badge status-${status}" id="status-${idx}">${cap(status)}</span></td>
      <td class="att-actions">
        <button class="btn-present" onclick="markAttendance('${team.name}','present',${idx})">✓ Present</button>
        <button class="btn-absent"  onclick="markAttendance('${team.name}','absent',${idx})">✗ Absent</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  refreshAttSummary();
}

function markAttendance(teamName, status, idx) {
  attendanceState[teamName] = status;
  const badge = document.getElementById(`status-${idx}`);
  if (badge) { badge.className = `status-badge status-${status}`; badge.textContent = cap(status); }
  refreshAttSummary();
  updatePresentCount();
}

function refreshAttSummary() {
  const vals    = Object.values(attendanceState);
  const present = vals.filter(v => v === 'present').length;
  const absent  = vals.filter(v => v === 'absent').length;
  setText('att-present-count', `${present} Present`);
  setText('att-absent-count',  `${absent} Absent`);
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ────────────────────────────
   PROFILE
──────────────────────────── */
function loadProfileIntoForm() {
  const p = JSON.parse(localStorage.getItem('dm_profile') || '{}');

  setVal('prof-name',        p.name        || '');
  setVal('prof-username',    p.username    || '');
  setVal('prof-email',       p.email       || '');
  setVal('prof-phone',       p.phone       || '');
  setVal('prof-org',         p.org         || '');
  setVal('prof-designation', p.designation || '');
  setVal('prof-bio',         p.bio         || '');
  setVal('prof-linkedin',    p.linkedin    || '');
  setVal('prof-github',      p.github      || '');
  setVal('prof-website',     p.website     || '');

  syncProfilePreview(p);
}

function saveProfile() {
  const p = {
    name:        getVal('prof-name'),
    username:    getVal('prof-username'),
    email:       getVal('prof-email'),
    phone:       getVal('prof-phone'),
    org:         getVal('prof-org'),
    designation: getVal('prof-designation'),
    bio:         getVal('prof-bio'),
    linkedin:    getVal('prof-linkedin'),
    github:      getVal('prof-github'),
    website:     getVal('prof-website')
  };

  localStorage.setItem('dm_profile', JSON.stringify(p));
  syncProfilePreview(p);

  const badge = document.getElementById('profile-saved-badge');
  if (badge) {
    badge.style.display = 'inline-block';
    clearTimeout(badge._timeout);
    badge._timeout = setTimeout(() => { badge.style.display = 'none'; }, 2800);
  }
}

function syncProfilePreview(p) {
  const initials = getInitials(p.name || p.username || '?');
  setTextSafe('profile-avatar-display', initials);
  setTextSafe('profile-display-name',   p.name || p.username || 'Your Name');
  setTextSafe('profile-display-email',  p.email || '—');

  setTextSafe('spm-avatar', initials);
  setTextSafe('spm-name',   p.name || p.username || 'Your Name');

  const linksEl = document.getElementById('profile-social-links');
  if (linksEl) {
    linksEl.innerHTML = '';
    if (p.linkedin) linksEl.innerHTML += socialLink('LinkedIn', p.linkedin);
    if (p.github)   linksEl.innerHTML += socialLink('GitHub',   p.github);
    if (p.website)  linksEl.innerHTML += socialLink('Website',  p.website);
  }
}

function socialLink(label, url) {
  return `<a class="profile-social-link" href="${url}" target="_blank" rel="noopener">${label}</a>`;
}

function getInitials(name) {
  if (!name || name === '?') return '?';
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0,2).join('');
}

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function setTextSafe(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

/* ────────────────────────────
   LOGOUT
──────────────────────────── */
function logout() {
  sessionStorage.removeItem('dm_logged_in');
  sessionStorage.removeItem('dm_active_hk_index');
  activeHkIndex = null;
  showPage('page-login');
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
}

/* ────────────────────────────
   MOBILE NAV
──────────────────────────── */
function toggleMobileNav() {
  document.getElementById('mobile-nav')?.classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav')?.classList.remove('open');
}
document.addEventListener('click', e => {
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('hamburger');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
    nav.classList.remove('open');
  }
});

/* ────────────────────────────
   KEYBOARD: Enter on login
──────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('page-login')?.classList.contains('active')) {
    handleLogin();
  }
});
