/* ═══════════════════════════════════════════════
   DevMatch — Participant Portal
   Vanilla JS — No frameworks
═══════════════════════════════════════════════ */

/* ════════════════════════════════
   MOCK DATA
════════════════════════════════ */
const HACKATHONS = [
  {
    id: 1,
    name: "BuildFest 2025",
    desc: "A 36-hour sprint to solve real-world problems in healthcare, fintech, and sustainability using cutting-edge technology.",
    problems: "1. AI-driven patient triage for rural hospitals.\n2. Micro-investment platform for Tier-3 cities.\n3. Carbon footprint tracker for SMEs.",
    start: "2025-08-15T09:00", end: "2025-08-16T21:00",
    venue: "IIT Bombay Auditorium", city: "Mumbai", state: "Maharashtra",
    mode: "Offline", regStart: "2025-07-01", regEnd: "2025-08-10",
    fee: null, participants: 340, maxTeams: 80,
    tags: ["Healthcare","FinTech","Sustainability"]
  },
  {
    id: 2,
    name: "CodeSprint Hyderabad",
    desc: "48-hour hackathon focused on open-source contributions and developer tooling for the next generation of engineers.",
    problems: "1. Build a VS Code extension for live collaborative debugging.\n2. Improve accessibility tooling for web apps.\n3. Open-source CI/CD pipeline visualiser.",
    start: "2025-09-05T10:00", end: "2025-09-07T10:00",
    venue: "HICC Convention Center", city: "Hyderabad", state: "Telangana",
    mode: "Hybrid", regStart: "2025-08-01", regEnd: "2025-09-01",
    fee: "299", participants: 220, maxTeams: 55,
    tags: ["Open Source","DevTools","Accessibility"]
  },
  {
    id: 3,
    name: "HackNITR 5.0",
    desc: "NIT Rourkela's flagship hackathon — building tomorrow's infrastructure, one commit at a time.",
    problems: "1. Smart campus energy management.\n2. Decentralised identity for college credentials.\n3. Peer-to-peer tutoring marketplace.",
    start: "2025-10-18T08:00", end: "2025-10-19T20:00",
    venue: "NIT Rourkela Campus", city: "Rourkela", state: "Odisha",
    mode: "Offline", regStart: "2025-09-10", regEnd: "2025-10-12",
    fee: null, participants: 180, maxTeams: 45,
    tags: ["Infrastructure","EdTech","Web3"]
  },
  {
    id: 4,
    name: "AI Frontier Hackathon",
    desc: "A fully online 24-hour challenge to push the boundaries of AI and machine learning applications.",
    problems: "1. Real-time sign language translation.\n2. Personalised mental health companion AI.\n3. AI-powered code review assistant.",
    start: "2025-07-26T18:00", end: "2025-07-27T18:00",
    venue: "Online", city: "Online", state: "",
    mode: "Online", regStart: "2025-07-01", regEnd: "2025-07-24",
    fee: null, participants: 650, maxTeams: 130,
    tags: ["AI","ML","NLP","Computer Vision"]
  },
  {
    id: 5,
    name: "StartupWeekend Bengaluru",
    desc: "54 hours of ideation, building, and pitching. Turn your startup idea into a reality with mentors and investors in the room.",
    problems: "Open theme — bring your best startup idea.",
    start: "2025-11-07T18:00", end: "2025-11-09T21:00",
    venue: "91springboard Koramangala", city: "Bengaluru", state: "Karnataka",
    mode: "Offline", regStart: "2025-10-01", regEnd: "2025-11-01",
    fee: "499", participants: 120, maxTeams: 24,
    tags: ["Startup","Product","Design","Business"]
  },
  {
    id: 6,
    name: "GreenHack 2025",
    desc: "24-hour climate-focused hackathon challenging devs to build tech solutions for a sustainable planet.",
    problems: "1. Real-time air quality monitoring dashboard.\n2. Community composting network app.\n3. EV charging station finder & booking.",
    start: "2025-12-06T09:00", end: "2025-12-07T09:00",
    venue: "Delhi Habitat Centre", city: "New Delhi", state: "Delhi",
    mode: "Hybrid", regStart: "2025-11-01", regEnd: "2025-12-01",
    fee: null, participants: 90, maxTeams: 22,
    tags: ["Climate","Sustainability","IoT"]
  }
];

const POOL_PARTICIPANTS = [
  { name:"Aryan Sharma",  role:"Frontend",    level:"Intermediate", city:"Mumbai",    state:"Maharashtra", avail:"Weekends", reliability:88, skills:"React,Vue,Tailwind" },
  { name:"Priya Nair",    role:"Backend",     level:"Advanced",     city:"Bengaluru", state:"Karnataka",   avail:"Both",     reliability:92, skills:"Node.js,Go,PostgreSQL" },
  { name:"Kiran Das",     role:"ML",          level:"Intermediate", city:"Hyderabad", state:"Telangana",   avail:"Flexible", reliability:75, skills:"PyTorch,TensorFlow,Sklearn" },
  { name:"Mehul Patel",   role:"Design",      level:"Advanced",     city:"Ahmedabad", state:"Gujarat",     avail:"Weekends", reliability:84, skills:"Figma,Sketch,Framer" },
  { name:"Sneha Joshi",   role:"Backend",     level:"Advanced",     city:"Pune",      state:"Maharashtra", avail:"Both",     reliability:95, skills:"Java,Spring,Kafka" },
  { name:"Rahul Verma",   role:"DevOps",      level:"Intermediate", city:"Delhi",     state:"Delhi",       avail:"Flexible", reliability:79, skills:"Docker,K8s,Terraform" },
  { name:"Tanya Singh",   role:"Fullstack",   level:"Intermediate", city:"Mumbai",    state:"Maharashtra", avail:"Weekends", reliability:82, skills:"React,Node.js,MongoDB" },
  { name:"Dev Anand",     role:"ML",          level:"Advanced",     city:"Bengaluru", state:"Karnataka",   avail:"Both",     reliability:91, skills:"GPT-4,LangChain,HuggingFace" },
  { name:"Aisha Khan",    role:"Mobile",      level:"Intermediate", city:"Hyderabad", state:"Telangana",   avail:"Weekends", reliability:77, skills:"Flutter,Swift,Kotlin" },
  { name:"Rohan Mehta",   role:"Data Science",level:"Intermediate", city:"Chennai",   state:"Tamil Nadu",  avail:"Flexible", reliability:83, skills:"Pandas,Spark,Tableau" },
  { name:"Pooja Iyer",    role:"Frontend",    level:"Advanced",     city:"Bengaluru", state:"Karnataka",   avail:"Both",     reliability:90, skills:"React,TypeScript,Svelte" },
  { name:"Sameer Gupta",  role:"Backend",     level:"Beginner",     city:"Delhi",     state:"Delhi",       avail:"Weekends", reliability:62, skills:"Python,FastAPI,MySQL" },
  { name:"Nisha Thomas",  role:"Design",      level:"Intermediate", city:"Kochi",     state:"Kerala",      avail:"Flexible", reliability:86, skills:"Figma,AdobeXD,Motion" },
  { name:"Vikram Nair",   role:"DevOps",      level:"Advanced",     city:"Pune",      state:"Maharashtra", avail:"Both",     reliability:88, skills:"AWS,GCP,Ansible" },
  { name:"Anjali Rao",    role:"Fullstack",   level:"Advanced",     city:"Mumbai",    state:"Maharashtra", avail:"Flexible", reliability:93, skills:"Next.js,GraphQL,Prisma" },
];

const HISTORY_ENTRIES = [
  { hk:"BuildFest 2024",    team:"ByteForce",    date:"2024-08-15", status:"attended",  impact:+15 },
  { hk:"HackNITR 4.0",     team:"NullPointers", date:"2024-10-18", status:"attended",  impact:+15 },
  { hk:"AI Frontier 2024", team:"StackOverflow",date:"2024-07-26", status:"attended",  impact:+15 },
  { hk:"CodeSprint 2024",  team:"AlgoRhythm",   date:"2024-09-05", status:"withdrawn", impact:-20 },
  { hk:"GreenHack 2024",   team:"HexaDev",      date:"2024-12-06", status:"attended",  impact:+15 },
];

const ROLE_CLASS = {
  'Frontend':'role-fe','Backend':'role-be','ML':'role-ml',
  'Data Science':'role-ds','Mobile':'role-mob','Design':'role-des',
  'DevOps':'role-devops','Fullstack':'role-full'
};
const ROLES_ALL = ['Frontend','Backend','ML','Data Science','Mobile','Design','DevOps','Fullstack'];

/* ════════════════════════════════
   STATE
════════════════════════════════ */
let memberRowCount = 1;
let setupModes     = ['Offline'];
let activeModalHk  = null;

/* ════════════════════════════════
   STORAGE HELPERS
════════════════════════════════ */
function getProfile()        { return JSON.parse(localStorage.getItem('dm_p_profile') || '{}'); }
function saveProfileData(p)  { localStorage.setItem('dm_p_profile', JSON.stringify(p)); }
function getMyTeam()         { return JSON.parse(localStorage.getItem('dm_p_myteam') || 'null'); }
function saveMyTeam(t)       { localStorage.setItem('dm_p_myteam', JSON.stringify(t)); }
function getRegistered()     { return JSON.parse(localStorage.getItem('dm_p_registered') || '[]'); }
function saveRegistered(arr) { localStorage.setItem('dm_p_registered', JSON.stringify(arr)); }

/* ════════════════════════════════
   INIT
════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const loggedIn = sessionStorage.getItem('dm_p_logged_in');
  if (!loggedIn) { showPage('page-auth'); showAuthTab('login'); return; }

  const p = getProfile();
  if (!p.setupDone) {
    prefillSetup(p);
    showPage('page-profile-setup');
  } else {
    launchApp();
  }
});

/* ════════════════════════════════
   PAGE NAVIGATION
════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById(id);
  if (t) t.classList.add('active');
}

function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === name)
  );
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (name === 'reliability') renderReliability();
  if (name === 'search') filterHackathons();
  // Scroll to top on tab switch
  const mc = document.getElementById('main-content');
  if (mc) mc.scrollTop = 0;
}

/* ════════════════════════════════
   AUTH
════════════════════════════════ */
function showAuthTab(which) {
  document.getElementById('at-login').classList.toggle('active', which === 'login');
  document.getElementById('at-register').classList.toggle('active', which !== 'login');
  document.getElementById('auth-login').classList.toggle('active', which === 'login');
  document.getElementById('auth-register').classList.toggle('active', which !== 'login');
}

function handleLogin() {
  const email = _v('login-email');
  const pass  = _v('login-password');
  if (!email || !pass) { flash('login-email'); return; }

  sessionStorage.setItem('dm_p_logged_in', 'true');
  const p = getProfile();
  if (!p.email) { p.email = email; saveProfileData(p); }

  if (!p.setupDone) { prefillSetup(p); showPage('page-profile-setup'); }
  else launchApp();
}

function handleRegister() {
  const name  = _v('reg-name');
  const email = _v('reg-email');
  const pass  = _v('reg-password');
  if (!name)  { flash('reg-name');  return; }
  if (!email) { flash('reg-email'); return; }
  if (!pass)  { flash('reg-password'); return; }

  const p = {
    name,
    username: _v('reg-username') || name.toLowerCase().replace(/\s+/g,'_'),
    email,
    org:  _v('reg-org'),
    role: document.getElementById('reg-role').value,
  };
  saveProfileData(p);
  sessionStorage.setItem('dm_p_logged_in', 'true');
  prefillSetup(p);
  showPage('page-profile-setup');
}

/* ════════════════════════════════
   PROFILE SETUP WIZARD
════════════════════════════════ */
function prefillSetup(p) {
  setVal('setup-name',    p.name     || '');
  setVal('setup-phone',   p.phone    || '');
  setVal('setup-city',    p.city     || '');
  setVal('setup-state',   p.state    || '');
  setVal('setup-bio',     p.bio      || '');
  setVal('setup-skills',  p.skills   || '');
  setVal('setup-org',     p.org      || '');
  setVal('setup-year',    p.year     || '');
  setVal('setup-github',  p.github   || '');
  setVal('setup-linkedin',p.linkedin || '');
  setVal('setup-website', p.website  || '');

  const roleEl  = document.getElementById('setup-role');
  const levelEl = document.getElementById('setup-level');
  const availEl = document.getElementById('setup-avail');
  if (roleEl  && p.role)  roleEl.value  = p.role;
  if (levelEl && p.level) levelEl.value = p.level;
  if (availEl && p.avail) availEl.value = p.avail;
}

function setupNext(step) {
  document.querySelectorAll('.setup-pane').forEach((p, i) =>
    p.classList.toggle('active', i + 1 === step)
  );
  document.querySelectorAll('.setup-step').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === step);
    d.classList.toggle('done',   i + 1 < step);
  });
  const card = document.querySelector('.setup-card');
  if (card) card.scrollTop = 0;
}

function toggleModePill(el, mode) {
  el.classList.toggle('active');
  if (el.classList.contains('active')) {
    if (!setupModes.includes(mode)) setupModes.push(mode);
  } else {
    setupModes = setupModes.filter(m => m !== mode);
  }
}

function completeSetup() {
  const p = getProfile();
  Object.assign(p, {
    name:      _v('setup-name')     || p.name,
    phone:     _v('setup-phone'),
    city:      _v('setup-city'),
    state:     _v('setup-state'),
    bio:       _v('setup-bio'),
    role:      document.getElementById('setup-role')?.value  || p.role,
    level:     document.getElementById('setup-level')?.value || '',
    skills:    _v('setup-skills'),
    org:       _v('setup-org')      || p.org,
    year:      _v('setup-year'),
    avail:     document.getElementById('setup-avail')?.value || 'Flexible',
    github:    _v('setup-github'),
    linkedin:  _v('setup-linkedin'),
    website:   _v('setup-website'),
    prefModes: setupModes,
    setupDone: true
  });
  saveProfileData(p);
  launchApp();
}

/* ════════════════════════════════
   LAUNCH APP
════════════════════════════════ */
function launchApp() {
  showPage('page-app');
  const p = getProfile();

  populateHkSelects();
  buildRoleCheckboxes('team-roles-checks', 'team-role');
  buildRoleCheckboxes('builder-roles-checks', 'builder-role');

  renderDashboard(p);
  renderSearchGrid(HACKATHONS);
  loadMyTeamView();
  loadProfileForm();
  updateSidebarProfile(p);
  switchTab('dashboard');
}

function populateHkSelects() {
  ['new-team-hk','builder-hk'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select hackathon…</option>';
    HACKATHONS.forEach(hk => {
      const opt = document.createElement('option');
      opt.value = hk.id;
      opt.textContent = hk.name;
      sel.appendChild(opt);
    });
  });
}

function buildRoleCheckboxes(containerId, prefix) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  ROLES_ALL.forEach(role => {
    const id  = `${prefix}-${role.replace(/[\s/]/g,'_')}`;
    const wrap = document.createElement('label');
    wrap.className = 'role-check-label';
    wrap.htmlFor = id;

    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.className = 'role-check';
    inp.id = id;
    inp.value = role;

    wrap.appendChild(inp);
    wrap.appendChild(document.createTextNode(' ' + role));
    container.appendChild(wrap);
  });
}

/* ════════════════════════════════
   SIDEBAR PROFILE
════════════════════════════════ */
function updateSidebarProfile(p) {
  const ini = getInitials(p.name || p.username || '?');
  setText('spm-avatar',     ini);
  setText('spm-name',       p.name || p.username || 'Your Name');
  setText('spm-role',       p.role || 'Participant');
  const score = calcReliabilityScore(p);
  setText('spm-score-mini', score);
}

/* ════════════════════════════════
   DASHBOARD
════════════════════════════════ */
function renderDashboard(p) {
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (p.name || 'Participant').split(' ')[0];
  setText('dash-greeting', `${greet}, ${firstName}!`);
  setText('dash-sub', "Here's your hackathon overview");
  setText('dash-role-badge', p.role || 'Participant');

  const score    = calcReliabilityScore(p);
  const attended = HISTORY_ENTRIES.filter(h => h.status === 'attended').length;
  const regIds   = getRegistered();

  setText('dash-reliability',     score);
  setText('dash-attended',        attended);
  setText('dash-teams-joined',    HISTORY_ENTRIES.length);
  setText('dash-registered-count',regIds.length);

  // Upcoming registered events
  const upcoming = HACKATHONS.filter(hk => regIds.includes(hk.id));
  const upList   = document.getElementById('dash-upcoming-list');
  if (upList) {
    if (upcoming.length === 0) {
      upList.innerHTML = `<div class="empty-state-sm">
        <div>No upcoming events registered yet.</div>
        <button class="btn-sm" style="margin-top:.6rem" onclick="switchTab('search')">Browse Hackathons →</button>
      </div>`;
    } else {
      upList.innerHTML = '';
      upcoming.forEach(hk => {
        const d = document.createElement('div');
        d.className = 'upcoming-card';
        d.innerHTML = `
          <div>
            <div class="uc-name">${hk.name}</div>
            <div class="uc-meta">${hk.venue} · <span class="mode-pill-sm">${hk.mode}</span></div>
          </div>
          <div class="uc-date">${fmtDate(hk.start.split('T')[0])}</div>
        `;
        upList.appendChild(d);
      });
    }
  }

  // Activity feed
  const feed = document.getElementById('dash-activity-feed');
  if (feed) {
    const items = [
      {
        icon: '◷',
        text: `<strong>Profile ${p.setupDone ? 'complete' : 'setup in progress'}</strong> — Your participant profile is ${p.setupDone ? 'ready' : 'not yet complete'}`,
        time: 'Just now'
      },
      ...HISTORY_ENTRIES.slice(0, 4).map(h => ({
        icon: h.status === 'attended' ? '▣' : '◉',
        text: `<strong>${h.status === 'attended' ? 'Attended' : 'Withdrew from'}</strong> ${h.hk} with team <em>${h.team}</em>`,
        time: fmtDate(h.date)
      }))
    ];
    feed.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'activity-item';
      el.innerHTML = `
        <div class="ai-icon ${item.icon === '◉' ? 'ai-icon-warn' : ''}">${item.icon}</div>
        <div class="ai-body">
          <div class="ai-text">${item.text}</div>
          <div class="ai-time">${item.time}</div>
        </div>`;
      feed.appendChild(el);
    });
  }
}

/* ════════════════════════════════
   HACKATHON SEARCH
════════════════════════════════ */
function renderSearchGrid(list) {
  const grid  = document.getElementById('hk-search-results');
  const noRes = document.getElementById('hk-no-results');
  if (!grid) return;
  grid.innerHTML = '';

  setText('search-count-badge', `${list.length} Event${list.length !== 1 ? 's' : ''}`);

  if (list.length === 0) {
    if (noRes) noRes.style.display = 'flex';
    return;
  }
  if (noRes) noRes.style.display = 'none';

  const registered = getRegistered();
  list.forEach(hk => {
    const isReg = registered.includes(hk.id);
    const card  = document.createElement('div');
    card.className = 'hk-card' + (isReg ? ' registered' : '');
    card.innerHTML = `
      <div class="hk-card-top">
        <div class="hk-mode-badge hk-mode-${hk.mode.toLowerCase()}">${hk.mode}</div>
        ${isReg ? '<div class="hk-reg-tag">✓ Registered</div>' : ''}
      </div>
      <div class="card-name">${hk.name}</div>
      <div class="card-meta">${hk.city}${hk.state ? ', ' + hk.state : ''}</div>
      <div class="card-date">📅 ${fmtDate(hk.start.split('T')[0])}</div>
      <div class="card-tags">
        ${hk.tags.slice(0,3).map(t => `<span class="tag-chip">${t}</span>`).join('')}
        ${!hk.fee ? '<span class="tag-chip tag-free">Free</span>' : `<span class="tag-chip tag-paid">₹${hk.fee}</span>`}
      </div>
      <div class="card-footer">
        <span class="card-participants">◈ ${hk.participants} participants</span>
        <button class="btn-card-view" onclick="openHkModal(${hk.id})">View →</button>
      </div>`;
    grid.appendChild(card);
  });
}

function filterHackathons() {
  const query = (_v('hk-search-input')).toLowerCase();
  const modeF = document.getElementById('filter-mode')?.value || '';
  const feeF  = document.getElementById('filter-fee')?.value  || '';
  const sortF = document.getElementById('filter-sort')?.value || 'date';

  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = query ? 'inline-block' : 'none';

  let list = HACKATHONS.filter(hk => {
    const matchQ = !query ||
      hk.name.toLowerCase().includes(query) ||
      hk.city.toLowerCase().includes(query) ||
      (hk.state || '').toLowerCase().includes(query) ||
      hk.tags.some(t => t.toLowerCase().includes(query)) ||
      hk.mode.toLowerCase().includes(query);
    const matchM = !modeF || hk.mode === modeF;
    const matchF = !feeF  || (feeF === 'free' ? !hk.fee : !!hk.fee);
    return matchQ && matchM && matchF;
  });

  if (sortF === 'name')         list = list.sort((a,b) => a.name.localeCompare(b.name));
  else if (sortF === 'participants') list = list.sort((a,b) => b.participants - a.participants);
  else                          list = list.sort((a,b) => new Date(a.start) - new Date(b.start));

  renderSearchGrid(list);
}

function clearSearch() {
  const inp = document.getElementById('hk-search-input');
  if (inp) inp.value = '';
  filterHackathons();
}

/* ════════════════════════════════
   HACKATHON MODAL
════════════════════════════════ */
function openHkModal(hkId) {
  const hk = HACKATHONS.find(h => h.id === hkId);
  if (!hk) return;
  activeModalHk = hk;
  const registered = getRegistered();
  const isReg = registered.includes(hk.id);

  setText('modal-title', hk.name);
  setText('modal-meta',  `${hk.city}${hk.state ? ', ' + hk.state : ''} · ${fmtDateTime(hk.start)} → ${fmtDateTime(hk.end)}`);

  document.getElementById('modal-mode-badge').innerHTML =
    `<span class="badge">${hk.mode}</span> ${!hk.fee ? '<span class="badge green">Free</span>' : `<span class="badge">₹${hk.fee}</span>`}`;

  document.getElementById('modal-body').innerHTML = `
    <strong>About</strong>${hk.desc}
    <strong>Problem Statements</strong>${hk.problems.replace(/\n/g,'<br>')}
    <strong>Venue</strong>${hk.venue}
    <strong>Registration Window</strong>${fmtDate(hk.regStart)} → ${fmtDate(hk.regEnd)}
    <strong>Participants</strong>${hk.participants} registered · Max ${hk.maxTeams} teams
    <strong>Themes</strong>${hk.tags.map(t => `<span class="tag-chip" style="margin-right:4px">${t}</span>`).join('')}
  `;

  const regBtn = document.getElementById('modal-register-btn');
  if (regBtn) {
    regBtn.textContent = isReg ? '✓ Registered' : 'Register Now →';
    regBtn.disabled    = isReg;
    regBtn.style.opacity = isReg ? '0.55' : '1';
  }

  document.getElementById('hk-modal').classList.add('open');
}

function closeHkModal(e) {
  if (e.target === document.getElementById('hk-modal')) closeHkModalDirect();
}
function closeHkModalDirect() {
  document.getElementById('hk-modal').classList.remove('open');
  activeModalHk = null;
}

function registerFromModal() {
  if (!activeModalHk) return;
  const reg = getRegistered();
  if (!reg.includes(activeModalHk.id)) {
    reg.push(activeModalHk.id);
    saveRegistered(reg);
  }
  closeHkModalDirect();
  filterHackathons();
  renderDashboard(getProfile());
}

/* ════════════════════════════════
   MY TEAM
════════════════════════════════ */
function loadMyTeamView() {
  const team = getMyTeam();
  const p    = getProfile();
  resetMemberInputs(p.name || '');
  if (team) showTeamView(team);
  else showNoTeam();
}

function resetMemberInputs(leaderName) {
  memberRowCount = 1;
  const container = document.getElementById('member-inputs');
  if (!container) return;
  container.innerHTML = `
    <div class="member-input-row">
      <input type="text" id="member-0" value="${leaderName}" placeholder="Your name (leader)"/>
    </div>`;
}

function showNoTeam() {
  const noT  = document.getElementById('no-team-view');
  const crtT = document.getElementById('create-team-view');
  const hasT = document.getElementById('has-team-view');
  if (noT)  noT.style.display  = 'block';
  if (crtT) crtT.style.display = 'none';
  if (hasT) hasT.style.display = 'none';
  const badge = document.getElementById('myteam-status-badge');
  if (badge) badge.style.display = 'none';
}

function showCreateTeamForm() {
  document.getElementById('no-team-view').style.display     = 'none';
  document.getElementById('create-team-view').style.display = 'block';
  document.getElementById('has-team-view').style.display    = 'none';
}

function cancelCreateTeam() {
  const team = getMyTeam();
  if (team) showTeamView(team);
  else showNoTeam();
}

function addMemberRow() {
  if (memberRowCount >= 5) return;
  const container = document.getElementById('member-inputs');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'member-input-row';
  row.id = `member-row-${memberRowCount}`;
  row.innerHTML = `
    <input type="text" id="member-${memberRowCount}" placeholder="Member ${memberRowCount + 1} name"/>
    <button class="btn-remove-member" onclick="removeMemberRow(${memberRowCount})">×</button>`;
  container.appendChild(row);
  memberRowCount++;
}

function removeMemberRow(idx) {
  const row = document.getElementById(`member-row-${idx}`);
  if (row) row.remove();
}

function createTeam() {
  const name = _v('new-team-name');
  if (!name) { flash('new-team-name'); return; }

  const members = [];
  for (let i = 0; i < memberRowCount; i++) {
    const el = document.getElementById(`member-${i}`);
    if (el && el.value.trim()) members.push(el.value.trim());
  }
  if (!members.length) { flash('member-0'); return; }

  const hkId  = parseInt(document.getElementById('new-team-hk')?.value) || null;
  const hkObj = HACKATHONS.find(h => h.id === hkId);
  const roles = Array.from(document.querySelectorAll('#team-roles-checks .role-check:checked')).map(el => el.value);
  const idea  = _v('new-team-idea');

  const team = { name, leader: members[0], members, roles, idea, hackathonId: hkId, hackathonName: hkObj ? hkObj.name : '' };
  saveMyTeam(team);

  if (hkId) {
    const reg = getRegistered();
    if (!reg.includes(hkId)) { reg.push(hkId); saveRegistered(reg); }
  }

  showTeamView(team);
  renderDashboard(getProfile());
  filterHackathons();
}

function showTeamView(team) {
  document.getElementById('no-team-view').style.display     = 'none';
  document.getElementById('create-team-view').style.display = 'none';
  document.getElementById('has-team-view').style.display    = 'block';

  setText('mtc-name',   team.name);
  setText('mtc-leader', team.leader);
  setText('mtc-hk',     team.hackathonName ? `◎ ${team.hackathonName}` : '');

  const badge = document.getElementById('myteam-status-badge');
  if (badge) { badge.textContent = '✓ Registered'; badge.style.display = 'inline-block'; }

  const membersEl = document.getElementById('mtc-members');
  if (membersEl) {
    membersEl.innerHTML = team.members.map((m, i) =>
      `<span class="member-pill${i === 0 ? ' leader-pill' : ''}">${i === 0 ? '♛ ' : ''}${m}</span>`
    ).join('');
  }

  const rolesEl = document.getElementById('mtc-roles');
  if (rolesEl) {
    rolesEl.innerHTML = team.roles && team.roles.length
      ? team.roles.map(r => `<span class="role-tag ${ROLE_CLASS[r] || 'role-be'}">${r}</span>`).join('')
      : '<span style="font-size:.82rem;color:var(--text3);font-style:italic">No roles specified</span>';
  }

  const iw = document.getElementById('mtc-idea-wrap');
  const it = document.getElementById('mtc-idea');
  if (iw && it) {
    iw.style.display = team.idea ? 'block' : 'none';
    it.textContent   = team.idea || '';
  }
}

function editTeam() {
  const team = getMyTeam();
  if (!team) return;

  setVal('new-team-name', team.name);
  setVal('new-team-idea', team.idea || '');

  const hkSel = document.getElementById('new-team-hk');
  if (hkSel && team.hackathonId) hkSel.value = String(team.hackathonId);

  const container = document.getElementById('member-inputs');
  if (!container) return;
  container.innerHTML = '';
  memberRowCount = 0;
  team.members.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'member-input-row';
    if (i > 0) row.id = `member-row-${i}`;
    row.innerHTML = `
      <input type="text" id="member-${i}" value="${m}" placeholder="${i === 0 ? 'Your name (leader)' : `Member ${i + 1} name`}"/>
      ${i > 0 ? `<button class="btn-remove-member" onclick="removeMemberRow(${i})">×</button>` : ''}`;
    container.appendChild(row);
    memberRowCount++;
  });

  document.querySelectorAll('#team-roles-checks .role-check').forEach(el => {
    el.checked = (team.roles || []).includes(el.value);
  });
  showCreateTeamForm();
}

/* ════════════════════════════════
   TEAM BUILDER
════════════════════════════════ */
function updateSizeLabel(v) { setText('builder-size-label', v); }
function updateRelLabel(v)  { setText('builder-rel-label',  v); }

function runTeamBuilder() {
  const hkId   = parseInt(document.getElementById('builder-hk')?.value);
  const hk     = HACKATHONS.find(h => h.id === hkId);
  const size   = parseInt(document.getElementById('builder-size')?.value)    || 4;
  const minRel = parseInt(document.getElementById('builder-min-rel')?.value) || 70;
  const mode   = document.getElementById('builder-mode')?.value || '';
  const roles  = Array.from(document.querySelectorAll('#builder-roles-checks .role-check:checked')).map(el => el.value);

  const resultsList = document.getElementById('builder-results-list');
  if (!resultsList) return;

  // Filter pool by reliability
  let pool = POOL_PARTICIPANTS.filter(p => p.reliability >= minRel);

  // Filter by proximity if offline/hybrid
  if (mode && mode !== 'Online' && hk && hk.city !== 'Online') {
    const nearbyPool = pool.filter(p => p.state === hk.state || p.city === hk.city);
    if (nearbyPool.length >= 2) pool = nearbyPool;
  }

  if (pool.length < 2) {
    resultsList.innerHTML = `<div class="browse-empty">
      <div class="be-icon">◉</div>
      <div class="be-title">Not enough matches</div>
      <div class="be-sub">Try lowering the reliability threshold or choosing a different mode.</div>
    </div>`;
    return;
  }

  // Build 3 suggested teams using different strategies
  const strategies = [
    { label: 'Balanced', rolePriority: roles.length ? roles : ['Frontend','Backend','Design','ML'] },
    { label: 'High Reliability', rolePriority: roles.length ? roles : ['Backend','Fullstack','DevOps','Frontend'] },
    { label: 'Diverse Skills', rolePriority: roles.length ? roles : ['ML','Data Science','Mobile','Design'] },
  ];

  const teams = [];
  const globalUsed = new Set();

  strategies.forEach((strategy, stratIdx) => {
    let poolCopy = shuffleArray(pool);
    if (stratIdx === 1) poolCopy = [...pool].sort((a,b) => b.reliability - a.reliability);

    const teamMembers = [];
    const used = new Set();

    // Try to fill each required role
    strategy.rolePriority.slice(0, size).forEach(role => {
      const candidate = poolCopy.find(p => p.role === role && !used.has(p.name) && (stratIdx === 0 || !globalUsed.has(p.name)));
      if (candidate) { teamMembers.push(candidate); used.add(candidate.name); globalUsed.add(candidate.name); }
    });

    // Backfill remaining spots
    while (teamMembers.length < Math.min(size, poolCopy.length)) {
      const fallback = poolCopy.find(p => !used.has(p.name));
      if (!fallback) break;
      teamMembers.push(fallback);
      used.add(fallback.name);
    }

    if (teamMembers.length > 0) {
      const avgRel = Math.round(teamMembers.reduce((s, m) => s + m.reliability, 0) / teamMembers.length);
      teams.push({ members: teamMembers, avgReliability: avgRel, name: genTeamName(), label: strategy.label });
    }
  });

  resultsList.innerHTML = '';

  if (teams.length === 0) {
    resultsList.innerHTML = `<div class="browse-empty">
      <div class="be-icon">◉</div>
      <div class="be-title">Could not build teams</div>
      <div class="be-sub">Try different criteria or a wider mode selection.</div>
    </div>`;
    return;
  }

  teams.forEach((team, idx) => {
    const card = document.createElement('div');
    card.className = 'suggested-team-card';
    const membersHTML = team.members.map(m => `
      <div class="stc-member">
        <div class="stc-m-avatar">${getInitials(m.name)}</div>
        <div class="stc-m-info">
          <div class="stc-m-name">${m.name}</div>
          <div class="stc-m-role">${m.role} · ${m.level}</div>
          <div class="stc-m-skills">${m.skills.split(',').slice(0,3).join(', ')}</div>
        </div>
        <div class="stc-m-rel ${m.reliability >= 85 ? 'rel-high' : m.reliability >= 70 ? 'rel-mid' : 'rel-low'}">${m.reliability}</div>
      </div>`).join('');
    card.innerHTML = `
      <div class="stc-header">
        <div>
          <div class="stc-label">${team.label}</div>
          <div class="stc-name">${team.name}</div>
        </div>
        <div class="stc-score">⌀ ${team.avgReliability} reliability</div>
      </div>
      <div class="stc-members">${membersHTML}</div>
      <div class="stc-footer">
        <div class="stc-hk">${hk ? '◎ ' + hk.name : 'No hackathon selected'}</div>
        <button class="btn-primary" style="padding:.4rem 1.2rem;font-size:.82rem" onclick="adoptSuggestedTeam(${idx})">Adopt Team →</button>
      </div>`;
    resultsList.appendChild(card);
  });

  window._suggestedTeams = teams;
  window._builderHkId    = hkId;
}

function adoptSuggestedTeam(idx) {
  const team = window._suggestedTeams?.[idx];
  const hkId = window._builderHkId;
  const hk   = HACKATHONS.find(h => h.id === hkId);
  if (!team) return;

  const saved = {
    name:          team.name,
    leader:        team.members[0].name,
    members:       team.members.map(m => m.name),
    roles:         team.members.map(m => m.role),
    idea:          '',
    hackathonId:   hkId || null,
    hackathonName: hk ? hk.name : ''
  };
  saveMyTeam(saved);

  if (hkId) {
    const reg = getRegistered();
    if (!reg.includes(hkId)) { reg.push(hkId); saveRegistered(reg); }
  }

  loadMyTeamView();
  renderDashboard(getProfile());
  filterHackathons();
  switchTab('myteam');
}

function genTeamName() {
  const prefixes = ['Byte','Code','Null','Stack','Algo','Hex','Pixel','Zero','Neon','Qubit','Sigma','Delta'];
  const suffixes = ['Force','Pirates','Ninjas','Overflow','Rhythm','Dev','Storm','Surge','Core','Squad','Shift'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ════════════════════════════════
   RELIABILITY SCORE
════════════════════════════════ */
function calcReliabilityScore(p) {
  let score = 50; // base
  HISTORY_ENTRIES.forEach(h => { score += h.impact; });
  if (p.setupDone)               score += 5;
  if (p.github || p.linkedin)    score += 3;
  return Math.min(100, Math.max(0, score));
}

function renderReliability() {
  const p         = getProfile();
  const score     = calcReliabilityScore(p);
  const attended  = HISTORY_ENTRIES.filter(h => h.status === 'attended').length;
  const withdrawn = HISTORY_ENTRIES.filter(h => h.status === 'withdrawn').length;
  const submitted = Math.floor(attended * 0.8);

  setText('rel-score-badge', score + ' / 100');
  setText('rel-score-big',   score);

  const arc = document.getElementById('rel-gauge-arc');
  if (arc) {
    const total  = 251;
    const offset = total - (score / 100) * total;
    arc.style.strokeDashoffset = offset;
  }

  let tier, tierDesc, tierColor;
  if (score >= 90)      { tier = 'Elite Hacker';      tierDesc = 'You are in the top tier — teams trust you completely. Your commitment record is exceptional.'; tierColor = '#00e5ff'; }
  else if (score >= 75) { tier = 'Reliable Builder';  tierDesc = 'Great track record! Teams love working with you. Keep attending and submitting to reach Elite.'; tierColor = '#4cffaa'; }
  else if (score >= 55) { tier = 'Active Participant'; tierDesc = "You're building a solid history. Avoid last-minute withdrawals to grow your score faster."; tierColor = '#ffe066'; }
  else if (score >= 35) { tier = 'Getting Started';   tierDesc = "You're new or recovering from some setbacks. Attend your next hackathon consistently to improve."; tierColor = '#ff9966'; }
  else                  { tier = 'Needs Work';         tierDesc = 'Your score has been affected by withdrawals or inactivity. Commit to your next event to rebuild trust.'; tierColor = '#ff6688'; }

  const tierEl = document.getElementById('rel-tier');
  if (tierEl) { tierEl.textContent = tier; tierEl.style.color = tierColor; }
  setText('rel-tier-desc', tierDesc);

  // Breakdown
  const bg = document.getElementById('rel-breakdown-grid');
  if (bg) {
    const breakdownData = [
      { label:'Hackathons Attended', val: attended,  barPct: Math.min(100, attended * 10) },
      { label:'Submissions Made',    val: submitted, barPct: Math.min(100, submitted * 10) },
      { label:'Withdrawals',         val: withdrawn, barPct: Math.max(0, 100 - withdrawn * 20) },
      { label:'Profile Complete',    val: p.setupDone ? 'Yes' : 'No', barPct: p.setupDone ? 100 : 0 },
    ];
    bg.innerHTML = '';
    breakdownData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'rel-breakdown-card';
      card.innerHTML = `
        <div class="rbc-label">${item.label}</div>
        <div class="rbc-val">${item.val}</div>
        <div class="rbc-bar-wrap"><div class="rbc-bar" style="width:${item.barPct}%"></div></div>`;
      bg.appendChild(card);
    });
  }

  // History table
  const tbody = document.getElementById('rel-history-body');
  if (tbody) {
    tbody.innerHTML = '';
    HISTORY_ENTRIES.forEach((h, i) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${String(i + 1).padStart(2,'0')}</td>
        <td>${h.hk}</td>
        <td>${h.team}</td>
        <td>${fmtDate(h.date)}</td>
        <td><span class="status-badge s-${h.status}">${cap(h.status)}</span></td>
        <td class="${h.impact >= 0 ? 'impact-pos' : 'impact-neg'}">${h.impact >= 0 ? '+' : ''}${h.impact}</td>`;
      tbody.appendChild(row);
    });
  }

  // Profile card reliability mini
  const prm = document.getElementById('prm-score');
  const bar = document.getElementById('prm-bar');
  if (prm) prm.textContent = score + ' / 100';
  if (bar) bar.style.width = score + '%';
}

/* ════════════════════════════════
   PROFILE
════════════════════════════════ */
function loadProfileForm() {
  const p = getProfile();
  setVal('prof-name',     p.name     || '');
  setVal('prof-username', p.username || '');
  setVal('prof-email',    p.email    || '');
  setVal('prof-phone',    p.phone    || '');
  setVal('prof-city',     p.city     || '');
  setVal('prof-state',    p.state    || '');
  setVal('prof-org',      p.org      || '');
  setVal('prof-year',     p.year     || '');
  setVal('prof-skills',   p.skills   || '');
  setVal('prof-bio',      p.bio      || '');
  setVal('prof-github',   p.github   || '');
  setVal('prof-linkedin', p.linkedin || '');
  setVal('prof-website',  p.website  || '');

  const roleEl  = document.getElementById('prof-role');
  const levelEl = document.getElementById('prof-level');
  const availEl = document.getElementById('prof-avail');
  if (roleEl  && p.role)  roleEl.value  = p.role;
  if (levelEl && p.level) levelEl.value = p.level;
  if (availEl && p.avail) availEl.value = p.avail;

  syncProfileUI(p);
}

function saveProfile() {
  const p = {
    ...getProfile(),
    name:     _v('prof-name'),
    username: _v('prof-username'),
    email:    _v('prof-email'),
    phone:    _v('prof-phone'),
    city:     _v('prof-city'),
    state:    _v('prof-state'),
    org:      _v('prof-org'),
    year:     _v('prof-year'),
    skills:   _v('prof-skills'),
    bio:      _v('prof-bio'),
    github:   _v('prof-github'),
    linkedin: _v('prof-linkedin'),
    website:  _v('prof-website'),
    role:     document.getElementById('prof-role')?.value  || '',
    level:    document.getElementById('prof-level')?.value || '',
    avail:    document.getElementById('prof-avail')?.value || '',
    setupDone: true
  };
  saveProfileData(p);
  syncProfileUI(p);
  updateSidebarProfile(p);
  renderDashboard(p);

  const badge = document.getElementById('profile-saved-badge');
  if (badge) {
    badge.style.display = 'inline-block';
    clearTimeout(badge._t);
    badge._t = setTimeout(() => { badge.style.display = 'none'; }, 2800);
  }
}

function syncProfileUI(p) {
  const ini = getInitials(p.name || p.username || '?');
  setText('profile-avatar-display', ini);
  setText('profile-display-name',   p.name || p.username || 'Your Name');
  setText('profile-display-role',   (p.role ? p.role + ' · ' : '') + 'DevMatch');
  setText('profile-display-email',  p.email || '—');

  const score = calcReliabilityScore(p);
  const prm   = document.getElementById('prm-score');
  const bar   = document.getElementById('prm-bar');
  if (prm) prm.textContent = score + ' / 100';
  if (bar) bar.style.width  = score + '%';

  const linksEl = document.getElementById('profile-social-links');
  if (linksEl) {
    linksEl.innerHTML = '';
    if (p.github)   linksEl.innerHTML += socialLink('GitHub',   p.github);
    if (p.linkedin) linksEl.innerHTML += socialLink('LinkedIn', p.linkedin);
    if (p.website)  linksEl.innerHTML += socialLink('Website',  p.website);
  }
}

function socialLink(label, url) {
  return `<a class="profile-social-link" href="${url}" target="_blank" rel="noopener">${label}</a>`;
}

/* ════════════════════════════════
   LOGOUT
════════════════════════════════ */
function logout() {
  sessionStorage.removeItem('dm_p_logged_in');
  showPage('page-auth');
  showAuthTab('login');
  setVal('login-email',    '');
  setVal('login-password', '');
}

/* ════════════════════════════════
   MOBILE NAV
════════════════════════════════ */
function toggleMobileNav() { document.getElementById('mobile-nav')?.classList.toggle('open'); }
function closeMobileNav()  { document.getElementById('mobile-nav')?.classList.remove('open'); }

document.addEventListener('click', e => {
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('hamburger');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
    nav.classList.remove('open');
  }
});

/* ════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeHkModalDirect();
  if (e.key === 'Enter' && document.getElementById('page-auth')?.classList.contains('active')) {
    const isLogin = document.getElementById('auth-login')?.classList.contains('active');
    isLogin ? handleLogin() : handleRegister();
  }
});

/* ════════════════════════════════
   HELPERS
════════════════════════════════ */
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setVal(id, v)  { const el = document.getElementById(id); if (el) el.value = v; }
function _v(id)         { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function cap(s)         { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function getInitials(n) {
  if (!n || n === '?') return '?';
  return n.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--accent)';
  el.style.boxShadow   = '0 0 0 3px rgba(0,229,255,0.2)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1500);
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
