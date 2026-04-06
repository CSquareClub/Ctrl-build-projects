/* ═══════════════════════════════════════════════
   DevMatch — Hackathon Organizer Panel
   Vanilla JS — No frameworks
═══════════════════════════════════════════════ */

/* ────────────────────────────
   MOCK DATA
──────────────────────────── */
const MOCK_TEAMS = [
  {
    name: "ByteForce",
    leader: "Aryan Sharma",
    members: ["Aryan Sharma", "Priya Nair", "Kiran Das", "Mehul Patel"],
    roles: ["Frontend", "Backend", "ML"]
  },
  {
    name: "NullPointers",
    leader: "Sneha Joshi",
    members: ["Sneha Joshi", "Rahul Verma", "Tanya Singh"],
    roles: ["Backend", "DevOps", "Design"]
  },
  {
    name: "StackOverflow",
    leader: "Dev Anand",
    members: ["Dev Anand", "Aisha Khan", "Rohan Mehta", "Lakshmi R."],
    roles: ["Frontend", "Backend", "ML", "Mobile"]
  },
  {
    name: "AlgoRhythm",
    leader: "Pooja Iyer",
    members: ["Pooja Iyer", "Sameer Gupta", "Nisha Thomas"],
    roles: ["ML", "Data Science", "Backend"]
  },
  {
    name: "HexaDev",
    leader: "Vikram Nair",
    members: ["Vikram Nair", "Anjali Rao", "Manish Desai"],
    roles: ["Frontend", "Design", "Mobile"]
  },
  {
    name: "CodeNinjas",
    leader: "Ritika Pande",
    members: ["Ritika Pande", "Akshay Borkar", "Swati More", "Harish K."],
    roles: ["Backend", "Frontend", "Data Science"]
  },
  {
    name: "ZeroDay",
    leader: "Suresh Rajan",
    members: ["Suresh Rajan", "Deepika M.", "Akash N."],
    roles: ["Backend", "ML", "DevOps"]
  },
  {
    name: "PixelPirates",
    leader: "Neha Kulkarni",
    members: ["Neha Kulkarni", "Aman Tiwari", "Ruchi Verma", "Gaurav S."],
    roles: ["Design", "Frontend", "Mobile"]
  }
];

/* ────────────────────────────
   STATE
──────────────────────────── */
let attendanceState = {};   // { teamName: 'present' | 'absent' | 'pending' }
let feeEnabled = false;

/* ────────────────────────────
   INIT
──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAttendance();
  renderTeams();

  // Check if hackathon exists and user was "logged in"
  const loggedIn = sessionStorage.getItem('dm_logged_in');
  const hackathon = JSON.parse(localStorage.getItem('dm_hackathon') || 'null');

  if (loggedIn && hackathon) {
    showPage('page-app');
    renderDashboard(hackathon);
  } else {
    showPage('page-login');
  }
});

/* ────────────────────────────
   PAGE NAVIGATION
──────────────────────────── */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
}

function switchTab(tabName) {
  // Update sidebar nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Show/hide tabs
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabName);
  if (tab) tab.classList.add('active');

  // If switching to dashboard, refresh stats
  if (tabName === 'dashboard') {
    updatePresentCount();
  }
}

/* ────────────────────────────
   LOGIN
──────────────────────────── */
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value.trim();

  if (!email || !pass) {
    flashInput('login-email');
    flashInput('login-password');
    return;
  }

  sessionStorage.setItem('dm_logged_in', 'true');

  const hackathon = JSON.parse(localStorage.getItem('dm_hackathon') || 'null');
  if (hackathon) {
    showPage('page-app');
    renderDashboard(hackathon);
    switchTab('dashboard');
  } else {
    showPage('page-create');
  }
}

function flashInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--accent2)';
  el.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.2)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1400);
}

/* ────────────────────────────
   CREATE HACKATHON
──────────────────────────── */
function toggleFee() {
  feeEnabled = !feeEnabled;
  const toggle = document.getElementById('fee-toggle');
  const amtWrap = document.getElementById('fee-amount-wrap');
  toggle.classList.toggle('on', feeEnabled);
  amtWrap.style.display = feeEnabled ? 'block' : 'none';
}

function createHackathon() {
  const name = document.getElementById('hk-name').value.trim();
  if (!name) { flashCreate('hk-name'); return; }

  const data = {
    name:     name,
    desc:     document.getElementById('hk-desc').value.trim() || 'No description provided.',
    problems: document.getElementById('hk-problems').value.trim() || 'No problem statements listed yet.',
    start:    document.getElementById('hk-start').value,
    end:      document.getElementById('hk-end').value,
    venue:    document.getElementById('hk-venue').value.trim() || 'TBD',
    mode:     document.getElementById('hk-mode').value,
    regStart: document.getElementById('hk-reg-start').value,
    regEnd:   document.getElementById('hk-reg-end').value,
    fee:      feeEnabled ? (document.getElementById('hk-fee').value || '0') : null
  };

  localStorage.setItem('dm_hackathon', JSON.stringify(data));

  showPage('page-app');
  renderDashboard(data);
  switchTab('dashboard');
}

function flashCreate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.style.borderColor = 'var(--accent2)';
  el.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.2)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1400);
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

  // Dates
  const startFmt = hk.start ? fmtDateTime(hk.start) : '—';
  const endFmt   = hk.end   ? fmtDateTime(hk.end)   : '—';
  setText('dash-dates', startFmt + (hk.end ? ' → ' + endFmt : ''));
  setText('dash-meta',  hk.venue ? `${hk.venue}  ·  ${hk.mode}` : hk.mode || '');

  // Registration
  const rs = hk.regStart ? fmtDate(hk.regStart) : '—';
  const re = hk.regEnd   ? fmtDate(hk.regEnd)   : '—';
  setText('dash-reg', rs + ' → ' + re);

  // Static/mock stats
  setText('stat-participants', MOCK_TEAMS.reduce((a, t) => a + t.members.length, 0));
  setText('stat-teams', MOCK_TEAMS.length);
  updatePresentCount();
}

function updatePresentCount() {
  const count = Object.values(attendanceState).filter(v => v === 'present').length;
  const el = document.getElementById('stat-present');
  if (el) el.textContent = count;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return dt; }
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return d; }
}

/* ────────────────────────────
   TEAMS
──────────────────────────── */
const ROLE_CLASS = {
  'Frontend':    'role-fe',
  'Backend':     'role-be',
  'ML':          'role-ml',
  'Data Science':'role-ds',
  'Mobile':      'role-mob',
  'Design':      'role-des',
  'DevOps':      'role-be'
};

function renderTeams() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;

  grid.innerHTML = '';
  MOCK_TEAMS.forEach(team => {
    const card = document.createElement('div');
    card.className = 'team-card';

    const membersHTML = team.members.map(m =>
      `<span class="member-pill">${m}</span>`
    ).join('');

    const rolesHTML = team.roles.map(r =>
      `<span class="role-tag ${ROLE_CLASS[r] || 'role-be'}">${r}</span>`
    ).join('');

    card.innerHTML = `
      <div class="team-name">${team.name}</div>
      <div class="team-leader">Led by <span>${team.leader}</span></div>
      <div class="team-members-label">Members</div>
      <div class="team-members">${membersHTML}</div>
      <div class="team-roles">${rolesHTML}</div>
    `;

    grid.appendChild(card);
  });

  const badge = document.getElementById('teams-count-badge');
  if (badge) badge.textContent = `${MOCK_TEAMS.length} Teams`;
}

/* ────────────────────────────
   ATTENDANCE
──────────────────────────── */
function initAttendance() {
  MOCK_TEAMS.forEach(t => {
    attendanceState[t.name] = 'pending';
  });
  renderAttendance();
}

function renderAttendance() {
  const tbody = document.getElementById('att-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  MOCK_TEAMS.forEach((team, idx) => {
    const status = attendanceState[team.name] || 'pending';
    const row = document.createElement('tr');
    row.id = `att-row-${idx}`;

    row.innerHTML = `
      <td>${String(idx + 1).padStart(2, '0')}</td>
      <td>${team.name}</td>
      <td>${team.leader}</td>
      <td><span class="status-badge status-${status}" id="status-${idx}">${capitalise(status)}</span></td>
      <td class="att-actions">
        <button class="btn-present" onclick="markAttendance('${team.name}', 'present', ${idx})">✓ Present</button>
        <button class="btn-absent"  onclick="markAttendance('${team.name}', 'absent', ${idx})">✗ Absent</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  refreshAttSummary();
}

function markAttendance(teamName, status, idx) {
  attendanceState[teamName] = status;

  const badge = document.getElementById(`status-${idx}`);
  if (badge) {
    badge.className = `status-badge status-${status}`;
    badge.textContent = capitalise(status);
  }

  refreshAttSummary();
  updatePresentCount();
}

function refreshAttSummary() {
  const values = Object.values(attendanceState);
  const present = values.filter(v => v === 'present').length;
  const absent  = values.filter(v => v === 'absent').length;

  const pc = document.getElementById('att-present-count');
  const ac = document.getElementById('att-absent-count');
  if (pc) pc.textContent = `${present} Present`;
  if (ac) ac.textContent = `${absent} Absent`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ────────────────────────────
   LOGOUT
──────────────────────────── */
function logout() {
  sessionStorage.removeItem('dm_logged_in');
  showPage('page-login');
  // Reset form inputs
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

/* ────────────────────────────
   MOBILE NAV
──────────────────────────── */
function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.toggle('open');
}

function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.remove('open');
}

// Close mobile nav on outside click
document.addEventListener('click', (e) => {
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('hamburger');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
    nav.classList.remove('open');
  }
});

/* ────────────────────────────
   KEYBOARD: Enter on login
──────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginPage = document.getElementById('page-login');
    if (loginPage && loginPage.classList.contains('active')) {
      handleLogin();
    }
  }
});
