let token = localStorage.cwToken || '';
let user = null;
let rows = [];
let emergencyData = null;
let countdownTimer = null;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const icons = {
  exams: '📝',
  events: '🎤',
  holidays: '🏖️',
  academic: '📚',
  fees: '₹',
  placements: '💼',
  general: '📢'
};

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const ROLE_ACCOUNTS = {
  student: {
    name: 'Alex Student',
    username: 'student',
    password: 'student123',
    roleLabel: 'Student Portal',
    avatar: '🎓',
    dept: 'Computer Science & Engineering',
    desc: 'Access your courses, final exam notices, and AI feed.'
  },
  faculty: {
    name: 'Prof. Sharma',
    username: 'faculty',
    password: 'faculty123',
    roleLabel: 'Faculty Portal',
    avatar: '👨‍🏫',
    dept: 'Academic Affairs & Instruction',
    desc: 'Broadcast circulars, track student read receipts, and upload syllabi.'
  },
  admin: {
    name: 'Director Administration',
    username: 'admin',
    password: 'admin123',
    roleLabel: 'Administrator Portal',
    avatar: '🛡️',
    dept: 'Central Campus Operations',
    desc: 'Emergency SOS broadcasts, TCP socket monitor, and campus telemetry.'
  }
};

let currentLoginPortal = 'student';

window.selectLoginPortal = function(role) {
  currentLoginPortal = role;
  const acc = ROLE_ACCOUNTS[role];
  if (!acc) return;

  ['student', 'faculty', 'admin'].forEach(r => {
    const tab = $('#tab' + r.charAt(0).toUpperCase() + r.slice(1) + 'Login');
    if (tab) tab.classList.toggle('active', r === role);
  });

  const badge = $('#loginPortalBadge');
  const heading = $('#loginHeading');
  const desc = $('#loginDesc');
  const avatar = $('#loginAvatar');
  const nameEl = $('#loginProfileName');
  const deptEl = $('#loginProfileDept');
  const submitBtn = $('#loginSubmitBtn');
  const hintEl = $('#loginPortalHint');

  if (badge) badge.textContent = `${acc.avatar} ${acc.roleLabel.toUpperCase()}`;
  if (heading) heading.textContent = `${acc.roleLabel} Authentication`;
  if (desc) desc.textContent = acc.desc;
  if (avatar) avatar.textContent = acc.avatar;
  if (nameEl) nameEl.textContent = acc.name;
  if (deptEl) deptEl.textContent = acc.dept;
  if (submitBtn) submitBtn.textContent = `Enter ${acc.roleLabel}`;
  if (hintEl) hintEl.textContent = `${acc.username} / ${acc.password}`;

  $('#username').value = acc.username;
  $('#password').value = acc.password;
  $('#loginError').textContent = '';
};

window.quickFillCurrentPortal = function() {
  const acc = ROLE_ACCOUNTS[currentLoginPortal];
  if (acc) {
    $('#username').value = acc.username;
    $('#password').value = acc.password;
  }
};

window.fillLogin = function(u, p) {
  $('#username').value = u;
  $('#password').value = p;
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + token,
      ...options.headers
    }
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('cwToken');
      token = '';
      user = null;
      $('#app').classList.add('hidden');
      $('#loginView').classList.remove('hidden');
      $('#loginError').textContent = 'Session expired. Please sign in again.';
    }
    throw Error(json.error || 'Request failed');
  }
  return json;
}

// User enters dashboard
function enter() {
  localStorage.cwToken = token;
  $('#loginView').classList.add('hidden');
  $('#app').classList.remove('hidden');
  applyUserRoleUI();
  loadAll();
  startCountdownLoop();
}

// Apply role-specific UI customizations
function applyUserRoleUI() {
  if (!user) return;
  const role = user.role || 'student';

  // Profile Header
  $('#personName').textContent = user.displayName || user.username;
  $('#personRole').textContent = role + (user.department ? ' · ' + user.department : '');
  $('#personGreeting').textContent = user.displayName ? user.displayName.split(' ')[0] : user.username;
  $('#userAvatar').textContent = role === 'faculty' ? '👨‍🏫' : role === 'admin' ? '🛡️' : '🎓';

  // Persona Switcher buttons active state
  $$('.role-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  // Ensure all Navigation Tabs remain globally visible across roles for full access
  $$('#mainNav .nav-item').forEach(item => {
    item.classList.remove('hidden');
  });

  // Role Welcome Card on Dashboard
  const cardHeading = $('#roleBannerHeading');
  const cardDesc = $('#roleBannerDesc');
  const eyebrow = $('#headerEyebrow');

  if (role === 'student') {
    eyebrow.textContent = 'Student Academic Workspace';
    cardHeading.textContent = '🎓 Student Academic & Notice Hub';
    cardDesc.textContent = 'Welcome Alex. Check final examination timetables, company placement drives, homework submissions, and fee deadlines. Real-time AI categorizes every circular.';
  } else if (role === 'faculty') {
    eyebrow.textContent = 'Faculty Instruction & Broadcast Suite';
    cardHeading.textContent = '👨‍🏫 Faculty Notice Studio & Engagement Tracker';
    cardDesc.textContent = 'Welcome Professor Sharma. Broadcast official circulars to your classes, upload lecture materials and syllabi, and monitor student read-receipt acknowledgments.';
  } else if (role === 'admin') {
    eyebrow.textContent = 'Central Campus Administration';
    cardHeading.textContent = '🛡️ Campus Control Center & TCP Monitor';
    cardDesc.textContent = 'Director Operations console. Dispatch campus-wide emergency SOS banners, publish administrative circulars, and monitor real-time TCP socket client connections on Port 2121.';
  }
}

// Role Authentication & Credential-Gated Switching
let selectedAuthRole = 'student';

window.openRoleAuthModal = function(presetRole) {
  const target = presetRole || (user && user.role === 'student' ? 'faculty' : user && user.role === 'faculty' ? 'admin' : 'student');
  selectAuthRole(target);
  const modal = $('#roleAuthModal');
  if (modal) {
    const errorEl = $('#authErrorMsg');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    $('#authPasswordInput').value = '';
    modal.showModal();
    $('#authPasswordInput').focus();
  }
};

window.closeRoleAuthModal = function() {
  const modal = $('#roleAuthModal');
  if (modal) modal.close();
};

window.selectAuthRole = function(role) {
  selectedAuthRole = role;
  const acc = ROLE_ACCOUNTS[role];
  if (!acc) return;

  ['student', 'faculty', 'admin'].forEach(r => {
    const tab = $('#authTab' + r.charAt(0).toUpperCase() + r.slice(1));
    if (tab) tab.classList.toggle('active', r === role);
  });

  const avatar = $('#authAvatar');
  const nameEl = $('#authName');
  const deptEl = $('#authDept');
  const hintEl = $('#authCredHint');
  const badge = $('#authModalBadge');
  const errorEl = $('#authErrorMsg');

  if (avatar) avatar.textContent = acc.avatar;
  if (nameEl) nameEl.textContent = acc.name;
  if (deptEl) deptEl.textContent = acc.dept;
  if (hintEl) hintEl.textContent = `Username: ${acc.username} | Pass: ${acc.password}`;
  if (badge) badge.textContent = `🔐 ${acc.roleLabel}`;
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  $('#authPasswordInput').value = '';
};

window.quickFillAuthPassword = function() {
  const acc = ROLE_ACCOUNTS[selectedAuthRole];
  if (acc) {
    $('#authPasswordInput').value = acc.password;
  }
};

window.submitRoleAuth = async function() {
  const password = ($('#authPasswordInput').value || '').trim();
  const errorEl = $('#authErrorMsg');
  const acc = ROLE_ACCOUNTS[selectedAuthRole];

  if (!password) {
    if (errorEl) {
      errorEl.textContent = `Please enter the password for ${acc.name}.`;
      errorEl.style.display = 'block';
    }
    return;
  }

  try {
    const res = await api('/api/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role: selectedAuthRole, password })
    });
    token = res.token;
    user = res.user;
    localStorage.cwToken = token;
    closeRoleAuthModal();

    applyUserRoleUI();

    // Select designated landing view for target persona
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $$('.view').forEach(v => v.classList.add('hidden'));

    if (selectedAuthRole === 'student') {
      $('nav [data-view="dashboard"]').classList.add('active');
      $('#dashboard').classList.remove('hidden');
    } else if (selectedAuthRole === 'faculty') {
      const publishNav = $('#publishNav');
      if (publishNav) publishNav.classList.add('active');
      const publishView = $('#publish');
      if (publishView) publishView.classList.remove('hidden');
    } else if (selectedAuthRole === 'admin') {
      const emNav = $('nav [data-view="emergency"]');
      if (emNav) emNav.classList.add('active');
      const emView = $('#emergency');
      if (emView) emView.classList.remove('hidden');
    }

    await loadAll();
    alert(`✓ Authenticated Successfully!\nSigned in as ${user.displayName} (${acc.roleLabel})\nWelcome to your protected portal.`);
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = '❌ ' + err.message;
      errorEl.style.display = 'block';
    } else {
      alert('Authentication error: ' + err.message);
    }
  }
};

// Programmatic switch role helper
async function switchRole(targetRole, password) {
  if (!password) {
    openRoleAuthModal(targetRole);
    return;
  }
  selectedAuthRole = targetRole;
  $('#authPasswordInput').value = password;
  await submitRoleAuth();
}

// Load all data
async function loadAll() {
  await Promise.all([
    loadNotices(),
    loadMailStatus(),
    loadEmergencyBanner(),
    loadNetworkStats()
  ]);
  renderDeadlines();
  renderDownloads();
  if (user && user.role === 'faculty') {
    loadReceiptsAnalytics();
  }
}

// Notices loader
async function loadNotices() {
  try {
    rows = await api('/api/notices');
    $('#total').textContent = rows.filter(x => !x.archived).length;
    $('#urgent').textContent = rows.filter(x => x.priority === 'urgent' && !x.archived).length;
    $('#unread').textContent = rows.filter(x => x.source === 'email' && !x.read && !x.archived).length;
    $('#favorites').textContent = rows.filter(x => x.favorite).length;
    renderNotices();
  } catch (err) {
    console.warn('Error loading notices:', err.message);
  }
}

// Mail Connection Status & Dynamic Card Rendering
let mailStatus = null;
let currentConnectType = 'college';

async function loadMailStatus() {
  try {
    mailStatus = await api('/api/status');
    renderMailCards(mailStatus);
  } catch (err) {
    console.warn('Mail status error:', err.message);
  }
}

function renderMailCards(status) {
  if (!status) return;

  // College Mail
  const isCollegeConn = Boolean(status.college && status.college.connected);
  const collegeEmail = isCollegeConn ? status.college.email : '';
  const collegeStateEl = $('#collegeState');
  const collegeMetaEl = $('#collegeMeta');
  const collegeActionsEl = $('#collegeActions');

  if (collegeStateEl) {
    collegeStateEl.textContent = isCollegeConn ? '✓ Connected: ' + collegeEmail : '○ Not connected';
    collegeStateEl.classList.toggle('connected', isCollegeConn);
    const directCol = $('#directCollegeEmailInput');
    if (directCol && (isCollegeConn || !directCol.value)) directCol.value = isCollegeConn ? collegeEmail : (user.username + '@campus.edu');
  }
  if (collegeMetaEl) {
    collegeMetaEl.textContent = isCollegeConn ? 'Active Sync · Direct Verified Inbox' : 'Ready to link college email address';
  }
  if (collegeActionsEl) {
    if (isCollegeConn) {
      collegeActionsEl.innerHTML = `
        <button class="btn-primary" onclick="syncMail('college')">↻ Sync College Mail</button>
        <button class="btn-secondary" onclick="loadSingleDemo('college')">⚡ Load Sample Notices</button>
        <button class="btn-danger btn-sm" style="margin-top:4px;background:transparent;color:var(--red);border:1px solid var(--red);" onclick="disconnectMail('college')">✕ Disconnect College Account</button>
      `;
    } else {
      collegeActionsEl.innerHTML = `
        <button class="btn-primary" onclick="openConnectModal('college')">⚡ Connect via Modal</button>
        <button class="btn-secondary" onclick="connectGoogleOauth('college')">🌐 Connect via Google Cloud OAuth</button>
        <button class="btn-ghost" onclick="loadSingleDemo('college')">Load Demo Notices</button>
      `;
    }
  }

  // Personal Mail
  const isPersonalConn = Boolean(status.personal && status.personal.connected);
  const personalEmail = isPersonalConn ? status.personal.email : '';
  const personalStateEl = $('#personalState');
  const personalMetaEl = $('#personalMeta');
  const personalActionsEl = $('#personalActions');

  if (personalStateEl) {
    personalStateEl.textContent = isPersonalConn ? '✓ Connected: ' + personalEmail : '○ Not connected';
    personalStateEl.classList.toggle('connected', isPersonalConn);
    const directPer = $('#directPersonalEmailInput');
    if (directPer && (isPersonalConn || !directPer.value)) directPer.value = isPersonalConn ? personalEmail : (user.username + '@gmail.com');
  }
  if (personalMetaEl) {
    personalMetaEl.textContent = isPersonalConn ? 'Active Sync · Direct Verified Inbox' : 'Ready to link personal Gmail address';
  }
  if (personalActionsEl) {
    if (isPersonalConn) {
      personalActionsEl.innerHTML = `
        <button class="btn-primary" onclick="syncMail('personal')">↻ Sync Personal Mail</button>
        <button class="btn-secondary" onclick="loadSingleDemo('personal')">⚡ Load Sample Notices</button>
        <button class="btn-danger btn-sm" style="margin-top:4px;background:transparent;color:var(--red);border:1px solid var(--red);" onclick="disconnectMail('personal')">✕ Disconnect Personal Account</button>
      `;
    } else {
      personalActionsEl.innerHTML = `
        <button class="btn-primary" onclick="openConnectModal('personal')">⚡ Connect Personal Gmail (Direct Sync)</button>
        <button class="btn-secondary" onclick="connectGoogleOauth('personal')">🌐 Connect via Google Cloud OAuth</button>
        <button class="btn-ghost" onclick="loadSingleDemo('personal')">Load Demo Notices</button>
      `;
    }
  }
}

// Emergency Banner
async function loadEmergencyBanner() {
  try {
    const res = await fetch('/api/emergency');
    if (!res.ok) return;
    emergencyData = await res.json();
    const banner = $('#emergencyBanner');
    if (emergencyData && emergencyData.active) {
      $('#emergencyTitle').textContent = emergencyData.title;
      $('#emergencyText').textContent = emergencyData.message;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Emergency banner error:', err.message);
  }
}

// Network Stats
async function loadNetworkStats() {
  try {
    const stats = await api('/api/network-stats');
    if ($('#netTcpPort')) $('#netTcpPort').textContent = 'Port ' + stats.tcpPort;
  } catch (err) {
    console.warn('Network stats error:', err.message);
  }
}

// Render Notices Feed
function renderNotices() {
  const box = $('#mailbox').value;
  const cat = $('#category').value;
  const state = $('#stateFilter').value;
  const q = $('#search').value.toLowerCase().trim();

  const visible = rows.filter(n => {
    const matchBox = (box === 'all' || n.mailbox === box);
    const matchCat = (cat === 'all' || n.category === cat);
    const matchState = (state === 'archived' ? n.archived : state === 'favorites' ? (n.favorite && !n.archived) : !n.archived);
    const matchSearch = ((n.subject || '') + ' ' + (n.from || '') + ' ' + (n.snippet || '') + ' ' + (n.reason || '')).toLowerCase().includes(q);
    return matchBox && matchCat && matchState && matchSearch;
  });

  $('#count').textContent = visible.length + ' notices';

  if (visible.length) {
    $('#list').innerHTML = visible.map(n => `
      <article class="notice ${n.read || n.source === 'file' ? '' : 'unread'} ${n.priority === 'urgent' ? 'urgent-card' : ''}">
        <button class="icon" onclick="openItem('${encodeURIComponent(n.id)}')">${n.source === 'file' ? '📎' : icons[n.category] || '📢'}</button>
        <div onclick="openItem('${encodeURIComponent(n.id)}')">
          <h3>${esc(n.subject)} ${n.priority === 'urgent' ? '<span class="urgent">URGENT</span>' : ''}</h3>
          <div class="meta">${esc(n.from)} · ${new Date(n.date || n.createdAt).toLocaleDateString()}</div>
          <div class="reason">
            <span class="source ${n.mailbox}">${n.mailbox === 'college' ? '🎓 College Mail' : n.mailbox === 'personal' ? '✉ Personal Mail' : '🏛 Institute'}</span>
            <span class="tag">${esc(n.category)}</span>
            <span>${esc(n.reason)}</span>
            ${n.viewsCount ? `<span class="view-tag">👁 ${n.viewsCount} views</span>` : ''}
          </div>
        </div>
        <div class="quick">
          <button title="Favorite" onclick="event.stopPropagation(); toggle('${encodeURIComponent(n.id)}','favorite',${!n.favorite})">${n.favorite ? '★' : '☆'}</button>
          ${n.source === 'email'
            ? `<button title="Archive" onclick="event.stopPropagation(); toggle('${encodeURIComponent(n.id)}','archived',${!n.archived})">↧</button>`
            : `<button title="Download" onclick="event.stopPropagation(); downloadFile('${n.id}','${esc(n.fileName)}')">↓</button>`}
        </div>
      </article>
    `).join('');
  } else {
    $('#list').innerHTML = `
      <div class="empty">
        <b>No notices match your current filters.</b><br>
        Adjust filter settings or load sample institute notices:<br>
        <button class="btn-secondary" onclick="loadAllDemos()" style="margin-top:14px;">
          ⚡ Load College & Personal Demo Notices
        </button>
      </div>
    `;
  }
}

// Deadlines & Countdown Clocks
function renderDeadlines() {
  const container = $('#countdownGrid');
  if (!container) return;

  const deadlineItems = rows.filter(n => n.deadline);
  if (!deadlineItems.length) {
    container.innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <b>No upcoming deadlines scheduled right now.</b><br>
        <button class="btn-secondary" onclick="loadAllDemos()" style="margin-top:12px;">⚡ Populate Sample Deadlines</button>
      </div>
    `;
    return;
  }

  container.innerHTML = deadlineItems.map(item => {
    const isUrgent = item.priority === 'urgent' || (new Date(item.deadline) - Date.now() < 86400000);
    return `
      <article class="countdown-card ${isUrgent ? 'urgent-cd' : ''}" data-deadline="${item.deadline}" id="cd-${encodeURIComponent(item.id)}">
        <span class="countdown-badge">${item.deadlineLabel || 'Mandatory Deadline'}</span>
        <h3>${esc(item.subject)}</h3>
        <div class="countdown-clock">
          <div class="time-slot"><span class="time-val d-val">--</span><span class="time-lbl">Days</span></div>
          <div class="time-slot"><span class="time-val h-val">--</span><span class="time-lbl">Hours</span></div>
          <div class="time-slot"><span class="time-val m-val">--</span><span class="time-lbl">Mins</span></div>
          <div class="time-slot"><span class="time-val s-val">--</span><span class="time-lbl">Secs</span></div>
        </div>
        <p class="countdown-desc">${esc(item.snippet || item.body)}</p>
        <button class="btn-secondary btn-sm" style="margin-top:14px;" onclick="openItem('${encodeURIComponent(item.id)}')">View Full Notice & Instructions</button>
      </article>
    `;
  }).join('');

  updateCountdownTimes();
}

function updateCountdownTimes() {
  $$('.countdown-card[data-deadline]').forEach(card => {
    const deadline = new Date(card.dataset.deadline).getTime();
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      card.querySelector('.d-val').textContent = '00';
      card.querySelector('.h-val').textContent = '00';
      card.querySelector('.m-val').textContent = '00';
      card.querySelector('.s-val').textContent = '00';
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    const pad = n => String(n).padStart(2, '0');
    card.querySelector('.d-val').textContent = pad(d);
    card.querySelector('.h-val').textContent = pad(h);
    card.querySelector('.m-val').textContent = pad(m);
    card.querySelector('.s-val').textContent = pad(s);
  });
}

function startCountdownLoop() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdownTimes, 1000);
}

// Downloads Locker
function renderDownloads() {
  const container = $('#downloadsGrid');
  if (!container) return;

  const fileItems = rows.filter(n => n.source === 'file' || n.fileName);
  if (!fileItems.length) {
    container.innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <b>No institute files published yet.</b><br>
        Faculty and Admins can publish circulars and attachments in the Publishing Studio.<br>
        <button class="btn-secondary" onclick="loadAllDemos()" style="margin-top:12px;">⚡ Load Demo Files</button>
      </div>
    `;
    return;
  }

  container.innerHTML = fileItems.map(item => `
    <article class="download-item">
      <div class="download-header">
        <span class="file-icon">📄</span>
        <div>
          <h3>${esc(item.subject || item.title)}</h3>
          <div class="download-meta">
            <span>By ${esc(item.createdBy || 'Institute')}</span> · 
            <span>${new Date(item.date || item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <p class="download-desc">${esc(item.description || item.snippet || 'Official institutional publication.')}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
        <span class="tag">Audience: ${esc(item.audience || 'All')}</span>
        <button class="btn-primary btn-sm" onclick="downloadFile('${item.id}','${esc(item.fileName || 'notice.pdf')}')">
          📥 Download (${esc(item.fileName || 'document')})
        </button>
      </div>
    </article>
  `).join('');
}

// Faculty Read-Receipts Analytics
async function loadReceiptsAnalytics() {
  const container = $('#receiptsContainer');
  if (!container) return;

  try {
    const list = await api('/api/receipts');
    if (!list.length) {
      container.innerHTML = `
        <div class="empty">
          <b>No manual notices published yet.</b><br>
          Use the Publishing Studio to broadcast circulars to students.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => `
      <article class="receipt-card">
        <div class="receipt-info">
          <h3>${esc(item.title)}</h3>
          <p>
            Target Audience: <b>${esc(item.audience)}</b> · 
            Published: ${new Date(item.createdAt).toLocaleDateString()} · 
            Acknowledged by: <b>${item.viewers.join(', ') || 'None yet'}</b>
          </p>
        </div>
        <div class="receipt-bar-wrap">
          <div class="receipt-stats">
            <span>Engagement</span>
            <span>${item.viewsCount} / ${item.targetSize} (${item.percentage}%)</span>
          </div>
          <div class="receipt-bar">
            <div class="receipt-progress" style="width: ${Math.max(5, item.percentage)}%;"></div>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="error">Failed to load analytics: ${err.message}</div>`;
  }
}

// Notice Details & AI Explanation Modal
async function openItem(id) {
  const n = rows.find(x => x.id === decodeURIComponent(id));
  if (!n) return;

  // Record read receipt view
  try {
    await api('/api/notices/' + id + '/view', { method: 'POST' });
  } catch {}

  if (n.source === 'email' && !n.read) {
    await toggle(id, 'read', true);
  }

  $('#detailBody').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span class="source ${n.mailbox}">${n.mailbox === 'college' ? '🎓 College Mail' : n.mailbox === 'personal' ? '✉ Personal Mail' : '🏛 Institute Portal'}</span>
      <span class="tag" style="font-size:12px;">${n.category} · ${n.confidence}% AI Confidence</span>
    </div>
    
    <h2 style="font-size:22px;line-height:1.3;margin-bottom:6px;">${esc(n.subject)}</h2>
    <p class="meta" style="font-size:13px;margin-bottom:16px;">
      From: <b>${esc(n.from)}</b> · ${new Date(n.date || n.createdAt).toLocaleString()}
    </p>

    <div style="background:var(--blue-soft);padding:12px 16px;border-radius:8px;margin-bottom:16px;">
      <strong style="color:var(--blue);font-size:12px;text-transform:uppercase;display:block;margin-bottom:4px;">🤖 AI Classification Explanation</strong>
      <span style="font-size:13.5px;color:var(--ink);">${esc(n.reason)}</span>
      <div style="margin-top:6px;font-size:12px;color:var(--muted);">
        Priority Assessment: <b style="color:${n.priority === 'urgent' ? 'var(--red)' : 'var(--ink)'}">${(n.priority || 'normal').toUpperCase()}</b>
      </div>
    </div>

    <div class="message-body">${esc(n.body || n.snippet || n.description)}</div>

    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:18px;">
      ${n.source === 'email' ? `
        <label style="margin:0;display:flex;align-items:center;gap:8px;">
          <span>Correct Category:</span>
          <select id="correctCategorySelect">
            ${Object.keys(icons).map(c => `<option value="${c}" ${c === n.category ? 'selected' : ''}>${icons[c]} ${c}</option>`).join('')}
          </select>
        </label>
      ` : `
        <button class="btn-primary btn-sm" onclick="downloadFile('${n.id}','${esc(n.fileName)}')">
          📥 Download ${esc(n.fileName || 'Attachment')}
        </button>
      `}
    </div>
  `;

  $('#detail').showModal();

  if ($('#correctCategorySelect')) {
    $('#correctCategorySelect').onchange = async e => {
      if (e.target.value) {
        await api('/api/notices/' + id, {
          method: 'PATCH',
          body: JSON.stringify({ category: e.target.value })
        });
        $('#detail').close();
        loadNotices();
      }
    };
  }
}

// Notice toggles (favorite, archive, read)
async function toggle(id, key, value) {
  try {
    await api('/api/notices/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ [key]: value })
    });
    await loadNotices();
  } catch (err) {
    alert(err.message);
  }
}

// Download file helper
async function downloadFile(id, name) {
  try {
    const response = await fetch('/api/manual/' + id + '/download', {
      headers: { authorization: 'Bearer ' + token }
    });
    if (!response.ok) throw Error('File download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await response.blob());
    a.download = name || 'notice-file.bin';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(err.message);
  }
}

// Convert file to Base64
function file64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// Populate all demos
async function loadAllDemos() {
  try {
    await api('/api/demo?type=college', { method: 'POST' });
    await api('/api/demo?type=personal', { method: 'POST' });
    await loadAll();
    alert('✓ Loaded sample notices, deadlines, and circulars!');
  } catch (err) {
    alert(err.message);
  }
}

// --- EVENT HANDLERS ---

// Sign In
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  try {
    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#username').value.trim(),
        password: $('#password').value.trim()
      })
    });
    token = result.token;
    user = result.user;
    enter();
  } catch (error) {
    $('#loginError').textContent = error.message;
  }
};

// Navigation Tabs
$$('nav [data-view]').forEach(button => {
  button.onclick = () => {
    $$('.view').forEach(v => v.classList.add('hidden'));
    const target = $('#' + button.dataset.view);
    if (target) target.classList.remove('hidden');
    $$('nav button').forEach(b => b.classList.toggle('active', b === button));

    if (button.dataset.view === 'receipts') loadReceiptsAnalytics();
    if (button.dataset.view === 'deadlines') renderDeadlines();
    if (button.dataset.view === 'downloads') renderDownloads();
  };
});

// Top Persona Switcher Buttons
$$('.role-switch-btn').forEach(button => {
  button.onclick = () => {
    const target = button.dataset.role;
    if (user && user.role === target) {
      alert(`You are currently authenticated in the ${ROLE_ACCOUNTS[user.role]?.roleLabel || target}.`);
      return;
    }
    openRoleAuthModal(target);
  };
});

// Mail Hub: Open Connect Email Modal
function openConnectModal(type) {
  currentConnectType = type;
  const isCollege = type === 'college';
  const badge = $('#connectModalTypeBadge');
  const title = $('#connectModalTitle');
  const input = $('#connectEmailInput');

  if (badge) badge.textContent = isCollege ? 'College Mail' : 'Personal Mail';
  if (title) title.textContent = isCollege ? 'Connect College Mail Account' : 'Connect Personal Gmail Account';
  if (input) {
    const defaultVal = isCollege ? (user.username + '@campus.edu') : (user.username + '@gmail.com');
    input.value = defaultVal;
  }

  const modal = $('#connectEmailModal');
  if (modal) modal.showModal();
}

// Mail Hub: Submit Inline Email Connection from Direct Card Input
async function submitInlineMail(type) {
  const input = $(type === 'college' ? '#directCollegeEmailInput' : '#directPersonalEmailInput');
  const email = (input ? input.value : '').trim();
  if (!email || !email.includes('@')) {
    return alert('Please enter a valid email address.');
  }

  try {
    const res = await api('/api/connect', {
      method: 'POST',
      body: JSON.stringify({
        type,
        email,
        mode: 'direct'
      })
    });

    alert(`✓ Successfully linked ${type === 'college' ? 'College' : 'Personal'} Mail:\n${res.email}\n\nNotice inbox has been synchronized!`);
    await loadMailStatus();
    await loadNotices();
    $('nav [data-view="dashboard"]').click();
  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
}

// Mail Hub: Submit Direct Email Connection
async function submitDirectConnect() {
  const input = $('#connectEmailInput');
  const email = input ? input.value.trim() : '';
  if (!email || !email.includes('@')) {
    return alert('Please enter a valid email address.');
  }

  try {
    const res = await api('/api/connect', {
      method: 'POST',
      body: JSON.stringify({
        type: currentConnectType,
        email,
        mode: 'direct'
      })
    });

    const modal = $('#connectEmailModal');
    if (modal) modal.close();

    alert(`✓ Successfully linked ${currentConnectType} mail:\n${res.email}\n\nNotice inbox has been synchronized!`);
    await loadMailStatus();
    await loadNotices();

    // Switch to Dashboard so user sees the new notices
    $('nav [data-view="dashboard"]').click();
  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
}

// Mail Hub: Disconnect Mail Account
async function disconnectMail(type) {
  const ok = confirm(`Are you sure you want to disconnect ${type} mail?`);
  if (!ok) return;

  try {
    const res = await api('/api/disconnect', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
    alert(res.message || `Disconnected ${type} mail.`);
    await loadMailStatus();
    await loadNotices();
  } catch (err) {
    alert('Disconnect failed: ' + err.message);
  }
}

// Mail Hub: Connect via Google Cloud OAuth
async function connectGoogleOauth(type) {
  try {
    const status = await api('/api/status');
    if (!status.configured) {
      const wantSetup = confirm('Google Cloud OAuth credentials are not configured yet.\n\nWould you like to enter your Google Client ID now? (Or click Cancel to connect directly using your email address)');
      if (wantSetup) {
        openOauthModal();
      } else {
        openConnectModal(type);
      }
      return;
    }

    const res = await api('/api/connect', {
      method: 'POST',
      body: JSON.stringify({ type, mode: 'oauth' })
    });
    if (res.url) {
      location.href = res.url;
    }
  } catch (err) {
    alert('OAuth connection failed: ' + err.message);
  }
}

// Mail Hub: Google OAuth Config Modal
function openOauthModal() {
  const modal = $('#oauthConfigModal');
  if (modal) modal.showModal();
}

async function submitOauthSettings() {
  const clientId = $('#googleClientIdInput').value.trim();
  const clientSecret = $('#googleClientSecretInput').value.trim();
  if (!clientId || !clientSecret) {
    return alert('Please provide both Client ID and Client Secret.');
  }

  try {
    const res = await api('/api/oauth-config', {
      method: 'POST',
      body: JSON.stringify({ clientId, clientSecret })
    });
    $('#oauthConfigModal').close();
    alert('✓ Google Cloud OAuth credentials saved!\nYou can now use "Connect with Google OAuth" to link real Gmail accounts.');
    await loadMailStatus();
  } catch (err) {
    alert('Failed to save OAuth settings: ' + err.message);
  }
}

// Mail Hub: Sync Mailbox
async function syncMail(type) {
  try {
    const res = await api('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
    alert(res.message || `✓ Synced ${type} mail successfully!`);
    await loadNotices();
  } catch (err) {
    alert('Sync error: ' + err.message);
  }
}

// Mail Hub: Load Single Demo
async function loadSingleDemo(type) {
  try {
    const res = await api('/api/demo?type=' + type, { method: 'POST' });
    alert(`✓ ${res.message || 'Loaded ' + type + ' demo notices!'}\n\nSwitching to Notice Feed...`);
    await loadMailStatus();
    await loadNotices();
    $('nav [data-view="dashboard"]').click();
  } catch (err) {
    alert('Demo load error: ' + err.message);
  }
}

// Publish Notice (Faculty / Admin)
$('#publishForm').onsubmit = async e => {
  e.preventDefault();
  const file = $('#attachment').files[0];
  $('#publishStatus').textContent = 'Publishing…';
  try {
    await api('/api/manual', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#noticeTitle').value,
        description: $('#description').value,
        audience: $('#audience').value,
        urgent: $('#isUrgentNotice').checked,
        fileName: file.name,
        mimeType: file.type,
        data: await file64(file)
      })
    });
    e.target.reset();
    $('#publishStatus').textContent = '✓ Notice and attachment published successfully!';
    await loadAll();
    alert('✓ Notice published successfully to ' + $('#audience').value + '!');
    $('nav [data-view="dashboard"]').click();
  } catch (error) {
    $('#publishStatus').textContent = error.message;
  }
};

// Emergency SOS Alert Dispatcher (Admin)
$('#emergencyForm').onsubmit = async e => {
  e.preventDefault();
  const statusEl = $('#emergencyStatus');
  statusEl.textContent = 'Updating campus alert…';
  try {
    const active = $('#emergencyActive').value === 'true';
    await api('/api/emergency', {
      method: 'POST',
      body: JSON.stringify({
        active,
        title: $('#emergencyTitleInput').value,
        message: $('#emergencyMessageInput').value,
        severity: $('#emergencySeverity').value
      })
    });
    statusEl.textContent = '✓ Campus emergency alert updated!';
    await loadEmergencyBanner();
    alert(active ? '🚨 Campus SOS Alert is now ACTIVE across all student & faculty screens!' : '⚪ Campus Emergency Alert deactivated.');
  } catch (err) {
    statusEl.textContent = err.message;
  }
};

// Dismiss Emergency Banner
$('#dismissEmergency').onclick = () => {
  $('#emergencyBanner').classList.add('hidden');
};

// Export
$('#export').onclick = async () => {
  try {
    const data = await api('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'campuswire-export.json';
    a.click();
  } catch (err) {
    alert(err.message);
  }
};

// Toolbar Filters
$('#refresh').onclick = loadAll;
$('#mailbox').onchange = renderNotices;
$('#category').onchange = renderNotices;
$('#stateFilter').onchange = renderNotices;
$('#search').oninput = renderNotices;
$('#close').onclick = () => $('#detail').close();
$('#theme').onclick = () => document.body.classList.toggle('dark');

$('#logout').onclick = () => {
  localStorage.removeItem('cwToken');
  location.reload();
};

// Auto-restore session or seamless auto-login on page load
(async () => {
  if (token) {
    try {
      const res = await api('/api/me');
      user = res.user;
      enter();
      return;
    } catch {
      localStorage.removeItem('cwToken');
      token = '';
      user = null;
    }
  }
  // Auto-login as student for immediate evaluation
  try {
    const res = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'student', password: 'student123' })
    });
    if (res && res.token) {
      token = res.token;
      user = res.user;
      enter();
    }
  } catch (e) {
    // Fallback to manual login view
  }
})();

// Global function exports for inline HTML onclick attributes
window.openItem = openItem;
window.toggle = toggle;
window.downloadFile = downloadFile;
window.loadAllDemos = loadAllDemos;
window.loadReceiptsAnalytics = loadReceiptsAnalytics;
window.openConnectModal = openConnectModal;
window.submitDirectConnect = submitDirectConnect;
window.disconnectMail = disconnectMail;
window.connectGoogleOauth = connectGoogleOauth;
window.openOauthModal = openOauthModal;
window.submitOauthSettings = submitOauthSettings;
window.syncMail = syncMail;
window.loadSingleDemo = loadSingleDemo;
window.submitInlineMail = submitInlineMail;
window.selectLoginPortal = selectLoginPortal;
window.quickFillCurrentPortal = quickFillCurrentPortal;
window.openRoleAuthModal = openRoleAuthModal;
window.closeRoleAuthModal = closeRoleAuthModal;
window.selectAuthRole = selectAuthRole;
window.quickFillAuthPassword = quickFillAuthPassword;
window.submitRoleAuth = submitRoleAuth;