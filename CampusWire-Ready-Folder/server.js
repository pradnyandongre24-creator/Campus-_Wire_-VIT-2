const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const createTcp = require('./tcp-server');

const HTTPS = 'https://';
const TOKEN_URL = HTTPS + 'oauth2.googleapis.com/token';
const GMAIL_BASE = HTTPS + 'gmail.googleapis.com/gmail/v1/users/me';
const PROFILE_URL = HTTPS + 'www.googleapis.com/oauth2/v2/userinfo';

const ROOT_DIR = __dirname;

// Self-load .env for maximum compatibility with all Node.js versions
try {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

const PORT = Number(process.env.PORT || 3000);
const TCP_PORT = Number(process.env.TCP_PORT || 2121);
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const PREVIEW_DASHBOARD_PATH = 'C:/Users/PRADNYAN/.gemini/antigravity/brain/862d99e0-58e3-42bf-8292-a08ab58687fd/campuswire_preview.html';
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
try {
  if (fs.existsSync(PREVIEW_DASHBOARD_PATH)) {
    fs.copyFileSync(PREVIEW_DASHBOARD_PATH, path.join(PUBLIC_DIR, 'index.html'));
    fs.copyFileSync(PREVIEW_DASHBOARD_PATH, path.join(PUBLIC_DIR, 'campuswire_preview.html'));
    console.log('[DASHBOARD] Synchronized CampusWire v3 Unified Dashboard to public/index.html');
  }
} catch (err) {
  console.error('[DASHBOARD-SYNC]', err.message);
}

const FILES = {
  connections: path.join(ROOT_DIR, 'connections.json'),
  emails: path.join(ROOT_DIR, 'email-notices.json'),
  manual: path.join(ROOT_DIR, 'manual-notices.json'),
  sessions: path.join(ROOT_DIR, 'sessions.json'),
  emergency: path.join(ROOT_DIR, 'emergency.json'),
  receipts: path.join(ROOT_DIR, 'receipts.json')
};

const USERS = {
  student: { password: 'student123', role: 'student', audience: 'students', displayName: 'Alex Student', department: 'Computer Science & Engineering' },
  faculty: { password: 'faculty123', role: 'faculty', audience: 'faculty', displayName: 'Prof. Sharma', department: 'Academic Affairs' },
  admin: { password: 'admin123', role: 'admin', audience: 'all', displayName: 'Director Administration', department: 'Central Campus Operations' }
};

const read = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const write = (file, value) => {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
  } catch (err) {
    console.error('File write error:', err.message);
  }
};

// Persistent session management
function loadSessions() {
  try {
    const data = read(FILES.sessions, {});
    const map = new Map();
    for (const [k, v] of Object.entries(data)) {
      if (v && v.expires > Date.now()) {
        map.set(k, v);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveSessions() {
  try {
    const obj = {};
    for (const [k, v] of sessions.entries()) {
      if (v && v.expires > Date.now()) {
        obj[k] = v;
      }
    }
    write(FILES.sessions, obj);
  } catch (err) {
    console.error('Session save error:', err.message);
  }
}

const sessions = loadSessions();
const states = new Map();

const rules = {
  exams: ['exam', 'timetable', 'hall ticket', 'result', 'viva', 'practical'],
  events: ['event', 'workshop', 'seminar', 'hackathon', 'fest', 'cultural'],
  holidays: ['holiday', 'vacation', 'closed', 'closure'],
  academic: ['assignment', 'lecture', 'class', 'syllabus', 'attendance', 'lab'],
  fees: ['fee', 'payment', 'dues', 'scholarship', 'receipt', 'accounts'],
  placements: ['placement', 'internship', 'recruitment', 'interview', 'resume', 'offer', 'drive'],
  general: ['notice', 'circular', 'announcement', 'institute', 'security']
};

function classify(message) {
  const text = (message.subject + ' ' + message.snippet + ' ' + message.body).toLowerCase();
  let best = ['general', 0, []];
  for (const [key, words] of Object.entries(rules)) {
    const hits = words.filter(word => text.includes(word));
    const score = hits.length + (hits.some(word => message.subject.toLowerCase().includes(word)) ? 2 : 0);
    if (score > best[1]) best = [key, score, hits];
  }
  const urgency = ['urgent', 'deadline', 'last date', 'mandatory', 'tomorrow', 'immediate'].filter(word => text.includes(word));
  return {
    category: best[0],
    confidence: Math.min(98, 55 + best[1] * 11),
    reason: best[2].length ? 'Matched keywords: ' + best[2].join(', ') : 'General notice',
    priority: urgency.length ? 'urgent' : best[1] > 2 ? 'high' : 'normal'
  };
}

function key() {
  return crypto.createHash('sha256').update(process.env.APP_SECRET || 'campuswire-default-secret-2026').digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') };
}

function decrypt(value) {
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'hex'));
  cipher.setAuthTag(Buffer.from(value.tag, 'hex'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.data, 'hex')), cipher.final()]).toString());
}

const redirectUri = () => process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth/callback`;

function send(res, status, value, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff' });
  res.end(type === 'application/json' ? JSON.stringify(value) : value);
}

async function body(req) {
  let chunks = [], size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 15e6) throw Error('Request too large');
    chunks.push(chunk);
  }
  const str = Buffer.concat(chunks).toString() || '{}';
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function currentUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const session = sessions.get(token);
  if (session && session.expires > Date.now()) return session.user;
  return null;
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) send(res, 401, { error: 'Sign in required' });
  return user;
}

function header(payload, name) {
  return (payload.headers || []).find(item => item.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function decode(value = '') {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function messageBody(part) {
  if (part?.mimeType === 'text/plain' && part.body?.data) return decode(part.body.data);
  for (const child of part?.parts || []) {
    const value = messageBody(child);
    if (value) return value;
  }
  return '';
}

async function google(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json();
  if (!response.ok) throw Error(json.error?.message || json.error_description || 'Google request failed');
  return json;
}

async function accessToken(username, type) {
  const all = read(FILES.connections, {});
  const stored = all[username]?.[type];
  if (!stored) throw Error(`Connect ${type} mail first`);
  if (stored.demo || !stored.tokens) return 'demo-token';
  let token = decrypt(stored.tokens);
  if (Date.now() < token.createdAt + (token.expires_in || 3600) * 1000 - 60000) return token.access_token;
  if (!token.refresh_token) throw Error(`Reconnect ${type} mail`);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  });
  const fresh = await google(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params
  });
  token = { ...token, ...fresh, createdAt: Date.now() };
  all[username][type].tokens = encrypt(token);
  write(FILES.connections, all);
  return token.access_token;
}

async function sync(username, type) {
  const all = read(FILES.connections, {});
  const conn = all[username]?.[type];
  if (!conn) throw Error(`Connect ${type} mail first`);

  // Direct / Simulated email sync
  if (conn.demo || !process.env.GOOGLE_CLIENT_ID || !conn.tokens) {
    populateDemoNotices(username, type, conn.email);
    const total = read(FILES.emails, []).filter(row => row.owner === username && row.mailbox === type).length;
    return { added: 2, total, message: `Synced messages for ${conn.email}` };
  }

  // Real Google OAuth sync
  const token = await accessToken(username, type);
  const headers = { authorization: 'Bearer ' + token };
  const query = type === 'college'
    ? (process.env.COLLEGE_EMAIL_QUERY || 'newer_than:365d')
    : (process.env.PERSONAL_EMAIL_QUERY || 'newer_than:90d');
  const listing = await google(`${GMAIL_BASE}/messages?maxResults=50&q=${encodeURIComponent(query)}`, { headers });
  const rows = read(FILES.emails, []);
  let added = 0;

  for (const item of listing.messages || []) {
    const id = `${username}:${type}:${item.id}`;
    if (rows.some(row => row.id === id)) continue;
    const source = await google(`${GMAIL_BASE}/messages/${item.id}?format=full`, { headers });
    const message = {
      id,
      owner: username,
      source: 'email',
      mailbox: type,
      subject: header(source.payload, 'Subject') || '(No subject)',
      from: header(source.payload, 'From'),
      date: header(source.payload, 'Date'),
      snippet: source.snippet || '',
      body: messageBody(source.payload),
      read: false,
      favorite: false,
      archived: false
    };
    rows.push({ ...message, ...classify(message) });
    added++;
  }
  write(FILES.emails, rows);
  return { added, total: rows.filter(row => row.owner === username && row.mailbox === type).length, message: `Synced ${added} real Gmail messages` };
}

function visibleManual(user) {
  return read(FILES.manual, []).filter(row => row.audience === 'all' || user.audience === 'all' || row.audience === user.audience);
}

function populateDemoNotices(username, type, customEmail) {
  const now = Date.now();
  const emailAddr = customEmail || (type === 'college' ? `${username}@campus.edu` : `${username}@gmail.com`);

  const collegeSamples = [
    {
      subject: `Semester End Examination Timetable & Hall Ticket Released (${emailAddr})`,
      from: 'examcell@college.edu',
      body: `Dear Student (${emailAddr}),\n\nMandatory final examinations timetable has been officially finalized for your batch. Download your hall tickets before the exam session commences.\n\nInstructions:\n1. Bring physical printed hall ticket and student ID card.\n2. Seating arrangement will be posted 30 minutes prior to paper start.\n3. Electronic devices strictly prohibited in the exam hall.`,
      deadline: new Date(now + 2 * 86400000 + 5 * 3600000).toISOString(),
      deadlineLabel: 'Exams Commence In'
    },
    {
      subject: `Campus Placement Drive: Google & Microsoft Internship Hiring`,
      from: 'placement@college.edu',
      body: `Notice sent to ${emailAddr}:\n\nShortlisted candidates for Google SWE and Microsoft Technical Internship interview rounds must submit updated resumes and GitHub portfolio links before tonight.\n\nInterviews begin tomorrow morning at 09:00 AM via Microsoft Teams.`,
      deadline: new Date(now + 16 * 3600000).toISOString(),
      deadlineLabel: 'Resume Submission Closes'
    },
    {
      subject: 'Annual Technical Hackathon & AI Project Exhibition 2026',
      from: 'events@college.edu',
      body: 'Registration is live for HackSphere 2026! 36-hour offline hackathon with tracks in AI/ML, Decentralized Web, Cloud Networks, and IoT. Cash prize pool of INR 1,50,000.\n\nTeam size: 2-4 members. Industry mentors on-site.',
      deadline: new Date(now + 4 * 86400000 + 8 * 3600000).toISOString(),
      deadlineLabel: 'Hackathon Registration Closes'
    },
    {
      subject: `Outstanding Tuition Fee Notice for ${emailAddr}`,
      from: 'accounts@college.edu',
      body: `Dear Student (${emailAddr}),\n\nThis is a reminder to clear remaining semester tuition and laboratory fee dues. Failure to clear balances will temporarily place exam hall tickets on hold.`,
      deadline: new Date(now + 1 * 86400000 + 10 * 3600000).toISOString(),
      deadlineLabel: 'Fee Payment Deadline'
    },
    {
      subject: 'Machine Learning Lab Practical Assignment 3 Submission',
      from: 'faculty@college.edu',
      body: 'Computer Vision & Deep Learning Assignment 3 (Convolutional Neural Networks with PyTorch) is due. Upload Jupyter Notebooks with loss curves to the student LMS before the deadline.',
      deadline: new Date(now + 3 * 86400000 + 14 * 3600000).toISOString(),
      deadlineLabel: 'Assignment Due In'
    },
    {
      subject: 'National Holiday Notice: Campus Closed Announcement',
      from: 'registrar@college.edu',
      body: 'The college premises, classrooms, administration block, and sports complex will remain closed on the upcoming official holiday. Regular instructional days will resume as per timetable.',
      deadline: null
    }
  ];

  const personalSamples = [
    {
      subject: `Tuition Fee Payment Confirmation & e-Receipt #TXN-9842 (${emailAddr})`,
      from: 'payments@securebank.com',
      body: `Dear Customer (${emailAddr}),\n\nYour online tuition fee payment of INR 48,500 to CampusWire Institute Accounts has been credited successfully. Reference: #HDFC98428812. Please retain this transaction receipt.`,
      deadline: null
    },
    {
      subject: `Summer Internship Interview Schedule confirmed for ${emailAddr}`,
      from: 'talent@innovatetech.io',
      body: `Hello (${emailAddr}),\n\nWe are pleased to inform you that you have cleared the online coding round! Your System Design & Coding interview is scheduled for tomorrow at 2:00 PM IST via Google Meet.`,
      deadline: new Date(now + 19 * 3600000).toISOString(),
      deadlineLabel: 'Technical Interview In'
    },
    {
      subject: `Security Alert: New Sign-in to ${emailAddr}`,
      from: 'no-reply@accounts.google.com',
      body: `Your Google Account (${emailAddr}) was accessed from CampusWire Institute Hub on Windows. If this was you, no action is needed.`,
      deadline: null
    },
    {
      subject: 'GitHub Student Developer Pack & Azure Cloud Credits Approved',
      from: 'education@github.com',
      body: `Congratulations! Your academic student verification has been renewed for ${emailAddr}. You now have access to free GitHub Copilot, DigitalOcean credits, and domain benefits.`,
      deadline: null
    }
  ];

  const samples = type === 'college' ? collegeSamples : personalSamples;
  let rows = read(FILES.emails, []);
  let added = 0;

  samples.forEach((item, index) => {
    const id = `${username}:${type}:${index}`;
    const existingIndex = rows.findIndex(row => row.id === id);
    const message = {
      id,
      owner: username,
      source: 'email',
      mailbox: type,
      subject: item.subject,
      from: item.from,
      date: new Date(now - index * 43200000).toISOString(),
      snippet: item.body.slice(0, 140) + '...',
      body: item.body,
      deadline: item.deadline || null,
      deadlineLabel: item.deadlineLabel || null,
      read: false,
      favorite: index === 0 || index === 1,
      archived: false
    };
    const classified = { ...message, ...classify(message) };
    if (existingIndex >= 0) {
      rows[existingIndex] = { ...rows[existingIndex], ...classified };
    } else {
      rows.push(classified);
      added++;
    }
  });

  write(FILES.emails, rows);

  // Update connection status
  const allConn = read(FILES.connections, {});
  allConn[username] ??= {};
  allConn[username][type] = {
    email: emailAddr,
    demo: true,
    connectedAt: Date.now()
  };
  write(FILES.connections, allConn);

  return added || samples.length;
}

async function api(req, res, url) {
  // Login
  if (req.method === 'POST' && url.pathname === '/api/login') {
    const input = await body(req);
    const record = USERS[input.username];
    if (!record || record.password !== input.password) {
      return send(res, 401, { error: 'Invalid username or password' });
    }
    const user = {
      username: input.username,
      role: record.role,
      audience: record.audience,
      displayName: record.displayName,
      department: record.department
    };
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { user, expires: Date.now() + 86400000 }); // 24h
    saveSessions();

    const currentEmails = read(FILES.emails, []).filter(r => r.owner === user.username);
    if (currentEmails.length === 0) {
      populateDemoNotices(user.username, 'college');
      populateDemoNotices(user.username, 'personal');
    }

    return send(res, 200, { token, user });
  }

  // Credential-Gated Persona Switcher
  if (req.method === 'POST' && url.pathname === '/api/switch-role') {
    const input = await body(req);
    const targetRole = input.role;
    const targetUserKey = Object.keys(USERS).find(k => USERS[k].role === targetRole) || targetRole;
    const record = USERS[targetUserKey];
    if (!record) return send(res, 400, { error: 'Unknown role or portal' });

    if (!input.password) {
      return send(res, 400, { error: `Password is required to authenticate as ${record.displayName} (${record.role})` });
    }
    if (input.password !== record.password) {
      return send(res, 401, { error: `Invalid password credentials for ${record.displayName}. Access denied.` });
    }

    const user = {
      username: targetUserKey,
      role: record.role,
      audience: record.audience,
      displayName: record.displayName,
      department: record.department
    };
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { user, expires: Date.now() + 86400000 });
    saveSessions();

    const currentEmails = read(FILES.emails, []).filter(r => r.owner === user.username);
    if (currentEmails.length === 0) {
      populateDemoNotices(user.username, 'college');
      populateDemoNotices(user.username, 'personal');
    }

    return send(res, 200, { token, user });
  }

  // Health
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, httpPort: PORT, tcpPort: TCP_PORT, uptime: Math.floor(process.uptime()) });
  }

  // Emergency Banner
  if (url.pathname === '/api/emergency') {
    if (req.method === 'GET') {
      const banner = read(FILES.emergency, {
        active: true,
        title: 'Severe Weather Warning: Campus Open with Hybrid Attendance',
        message: 'Weather warning issued by authorities. All morning laboratory sessions will be conducted in hybrid mode. Transport buses operating on schedule.',
        severity: 'urgent',
        postedBy: 'admin',
        postedAt: new Date(Date.now() - 3600000).toISOString()
      });
      return send(res, 200, banner);
    }
    if (req.method === 'POST') {
      const user = requireUser(req, res);
      if (!user || user.role !== 'admin') return send(res, 403, { error: 'Administrator permission required' });
      const input = await body(req);
      const banner = {
        active: Boolean(input.active),
        title: input.title || 'Institute Advisory Announcement',
        message: input.message || '',
        severity: input.severity || 'urgent',
        postedBy: user.username,
        postedAt: new Date().toISOString()
      };
      write(FILES.emergency, banner);
      return send(res, 200, { ok: true, banner });
    }
  }

  // Network & TCP Monitor Stats
  if (req.method === 'GET' && url.pathname === '/api/network-stats') {
    const emailCount = read(FILES.emails, []).length;
    const manualCount = read(FILES.manual, []).length;
    return send(res, 200, {
      tcpPort: TCP_PORT,
      httpPort: PORT,
      protocol: 'TCP / Multithreaded Socket with Worker Threads',
      supportedCommands: ['LOGIN', 'LIST', 'GET', 'PUT', 'QUIT'],
      status: 'Active & Listening',
      totalNotices: emailCount + manualCount,
      totalUploads: manualCount,
      workerPool: 'Dynamic (1 thread per client)',
      uptimeSeconds: Math.floor(process.uptime())
    });
  }

  // User Authenticated Routes
  const user = requireUser(req, res);
  if (!user) return;

  if (url.pathname === '/api/me') {
    return send(res, 200, { user });
  }

  // Save Google OAuth Config
  if (url.pathname === '/api/oauth-config' && req.method === 'POST') {
    const input = await body(req);
    const clientId = (input.clientId || '').trim();
    const clientSecret = (input.clientSecret || '').trim();
    if (!clientId || !clientSecret) return send(res, 400, { error: 'Both Client ID and Client Secret are required' });

    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;

    try {
      const envPath = path.join(ROOT_DIR, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      envContent = envContent.replace(/^GOOGLE_CLIENT_ID=.*$/m, `GOOGLE_CLIENT_ID=${clientId}`);
      envContent = envContent.replace(/^GOOGLE_CLIENT_SECRET=.*$/m, `GOOGLE_CLIENT_SECRET=${clientSecret}`);
      if (!envContent.includes('GOOGLE_CLIENT_ID=')) envContent += `\nGOOGLE_CLIENT_ID=${clientId}`;
      if (!envContent.includes('GOOGLE_CLIENT_SECRET=')) envContent += `\nGOOGLE_CLIENT_SECRET=${clientSecret}`;
      fs.writeFileSync(envPath, envContent);
    } catch {}

    return send(res, 200, { ok: true, message: 'Google OAuth credentials saved successfully.' });
  }

  // Mail Connection Status
  if (url.pathname === '/api/status') {
    const c = read(FILES.connections, {})[user.username] || {};
    return send(res, 200, {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      googleClientId: process.env.GOOGLE_CLIENT_ID ? (process.env.GOOGLE_CLIENT_ID.slice(0, 10) + '...') : '',
      college: c.college ? { connected: true, email: c.college.email, connectedAt: c.college.connectedAt } : { connected: false },
      personal: c.personal ? { connected: true, email: c.personal.email, connectedAt: c.personal.connectedAt } : { connected: false }
    });
  }

  // Connect Mail (Direct email or OAuth)
  if (url.pathname === '/api/connect') {
    let input = {};
    if (req.method === 'POST') {
      input = await body(req);
    }
    const type = input.type || url.searchParams.get('type');
    const mode = input.mode || url.searchParams.get('mode') || (process.env.GOOGLE_CLIENT_ID ? 'oauth' : 'direct');
    let email = input.email || url.searchParams.get('email');

    if (!['college', 'personal'].includes(type)) {
      return send(res, 400, { error: 'Choose college or personal mail' });
    }

    // Direct / In-page email connect
    if (mode === 'direct' || !process.env.GOOGLE_CLIENT_ID) {
      if (!email || !email.includes('@')) {
        email = type === 'college' ? `${user.username}@campus.edu` : `${user.username}@gmail.com`;
      }
      email = email.trim();

      const all = read(FILES.connections, {});
      all[user.username] ??= {};
      all[user.username][type] = {
        email,
        demo: true,
        connectedAt: Date.now()
      };
      write(FILES.connections, all);

      // Populate notices addressed to this email
      populateDemoNotices(user.username, type, email);

      return send(res, 200, {
        ok: true,
        direct: true,
        email,
        message: `Successfully connected ${type} mail account (${email})`
      });
    }

    // Real Google OAuth redirect
    const state = crypto.randomBytes(18).toString('hex');
    states.set(state, { username: user.username, type, expires: Date.now() + 600000 });
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent select_account',
      state
    });
    return send(res, 200, { ok: true, url: HTTPS + 'accounts.google.com/o/oauth2/v2/auth?' + params });
  }

  // Disconnect Mail
  if (url.pathname === '/api/disconnect' && (req.method === 'POST' || req.method === 'DELETE')) {
    let input = {};
    if (req.method === 'POST') input = await body(req);
    const type = input.type || url.searchParams.get('type');

    if (!['college', 'personal'].includes(type)) {
      return send(res, 400, { error: 'Invalid mail type' });
    }

    const all = read(FILES.connections, {});
    if (all[user.username]) {
      delete all[user.username][type];
      write(FILES.connections, all);
    }
    return send(res, 200, { ok: true, message: `Disconnected ${type} mail account.` });
  }

  // Sync Mail
  if (url.pathname === '/api/sync' && req.method === 'POST') {
    const input = await body(req);
    const type = input.type || url.searchParams.get('type') || 'college';
    return send(res, 200, await sync(user.username, type));
  }

  // Notice Read Receipt / View Tracker
  const viewMatch = url.pathname.match(/^\/api\/notices\/(.+)\/view$/);
  if (viewMatch && req.method === 'POST') {
    const noticeId = decodeURIComponent(viewMatch[1]);
    const receipts = read(FILES.receipts, {});
    receipts[noticeId] ??= [];
    if (!receipts[noticeId].includes(user.username)) {
      receipts[noticeId].push(user.username);
      write(FILES.receipts, receipts);
    }
    return send(res, 200, { ok: true, views: receipts[noticeId].length });
  }

  // Faculty Read-Receipt Analytics
  if (url.pathname === '/api/receipts' && req.method === 'GET') {
    const receipts = read(FILES.receipts, {});
    const manuals = read(FILES.manual, []);
    const analytics = manuals.map(m => {
      const viewsList = receipts[m.id] || [];
      const targetSize = m.audience === 'faculty' ? 45 : m.audience === 'students' ? 180 : 225;
      return {
        id: m.id,
        title: m.title,
        audience: m.audience,
        createdAt: m.createdAt,
        viewsCount: viewsList.length,
        targetSize,
        percentage: Math.min(100, Math.round((viewsList.length / targetSize) * 100)),
        viewers: viewsList
      };
    });
    return send(res, 200, analytics);
  }

  // Notices Listing
  if (url.pathname === '/api/notices' && req.method === 'GET') {
    const receipts = read(FILES.receipts, {});
    const email = read(FILES.emails, []).filter(row => row.owner === user.username).map(r => ({
      ...r,
      viewsCount: (receipts[r.id] || []).length
    }));
    const manual = visibleManual(user).map(row => ({
      ...row,
      source: 'file',
      mailbox: 'institute',
      subject: row.title,
      from: 'Institute Portal (' + (row.createdBy || 'Dean') + ')',
      body: row.description || '',
      snippet: row.description || '',
      read: false,
      favorite: false,
      archived: false,
      confidence: 100,
      reason: 'Official circular published by institute administration',
      viewsCount: (receipts[row.id] || []).length
    }));
    return send(res, 200, [...email, ...manual].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)));
  }

  if (url.pathname === '/api/demo' && req.method === 'POST') {
    const type = url.searchParams.get('type') === 'personal' ? 'personal' : 'college';
    const added = populateDemoNotices(user.username, type);
    return send(res, 200, { added, message: `Loaded ${type} demo notices successfully` });
  }

  const noticeMatch = url.pathname.match(/^\/api\/notices\/(.+)$/);
  if (noticeMatch && req.method === 'PATCH') {
    const id = decodeURIComponent(noticeMatch[1]);
    const input = await body(req);
    const rows = read(FILES.emails, []);
    const row = rows.find(item => item.id === id && item.owner === user.username);
    if (!row) return send(res, 404, { error: 'Email notice not found' });
    if (typeof input.read === 'boolean') row.read = input.read;
    if (typeof input.favorite === 'boolean') row.favorite = input.favorite;
    if (typeof input.archived === 'boolean') row.archived = input.archived;
    if (input.category && rules[input.category]) {
      row.category = input.category;
      row.confidence = 100;
      row.reason = 'Corrected by user';
    }
    write(FILES.emails, rows);
    return send(res, 200, { ok: true, notice: row });
  }

  if (url.pathname === '/api/manual' && req.method === 'POST') {
    if (!['faculty', 'admin'].includes(user.role)) return send(res, 403, { error: 'Faculty or admin only' });
    const input = await body(req);
    const data = Buffer.from(input.data || '', 'base64');
    if (!data.length || data.length > 10 * 1024 * 1024) throw Error('Choose a file up to 10 MB');
    const id = crypto.randomUUID();
    const safe = (input.fileName || 'notice.bin').replace(/[^a-z0-9._-]/gi, '_');
    const stored = id + '-' + safe;
    fs.writeFileSync(path.join(UPLOADS_DIR, stored), data);
    const message = { subject: input.title || safe, snippet: input.description || '', body: input.description || '' };
    const classification = classify(message);
    const rows = read(FILES.manual, []);
    const notice = {
      id,
      source: 'file',
      title: message.subject,
      description: input.description || '',
      audience: ['all', 'students', 'faculty'].includes(input.audience) ? input.audience : 'all',
      fileName: safe,
      stored,
      mimeType: input.mimeType || 'application/octet-stream',
      size: data.length,
      createdBy: user.displayName || user.username,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString(),
      priority: input.urgent ? 'urgent' : classification.priority,
      ...classification
    };
    rows.push(notice);
    write(FILES.manual, rows);
    return send(res, 201, { notice });
  }

  const download = url.pathname.match(/^\/api\/manual\/([^/]+)\/download$/);
  if (download && req.method === 'GET') {
    const notice = visibleManual(user).find(row => row.id === download[1]);
    if (!notice) return send(res, 404, { error: 'File not found' });
    res.writeHead(200, { 'content-type': notice.mimeType, 'content-disposition': `attachment; filename="${notice.fileName}"` });
    return fs.createReadStream(path.join(UPLOADS_DIR, notice.stored)).pipe(res);
  }

  if (url.pathname === '/api/export') {
    return send(res, 200, {
      exportedAt: new Date().toISOString(),
      user: user.username,
      notices: read(FILES.emails, []).filter(row => row.owner === user.username),
      instituteFiles: visibleManual(user)
    });
  }

  return send(res, 404, { error: 'Route not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/oauth/callback') {
      const state = states.get(url.searchParams.get('state'));
      states.delete(url.searchParams.get('state'));
      if (!state || state.expires < Date.now()) throw Error('Expired connection');
      const params = new URLSearchParams({
        code: url.searchParams.get('code'),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code'
      });
      const tokens = await google(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params
      });
      const profile = await google(PROFILE_URL, {
        headers: { authorization: 'Bearer ' + tokens.access_token }
      });
      const all = read(FILES.connections, {});
      all[state.username] ??= {};
      all[state.username][state.type] = {
        email: profile.email,
        tokens: encrypt({ ...tokens, createdAt: Date.now() })
      };
      write(FILES.connections, all);
      res.writeHead(302, { location: '/?connected=' + state.type });
      return res.end();
    }

    if (url.pathname.startsWith('/api/')) return api(req, res, url);

    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/campuswire_preview.html') {
      if (fs.existsSync(PREVIEW_DASHBOARD_PATH)) {
        return send(res, 200, fs.readFileSync(PREVIEW_DASHBOARD_PATH), 'text/html');
      }
    }

    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const target = path.normalize(path.join(ROOT_DIR, 'public', file));
    if (!path.resolve(target).startsWith(path.resolve(ROOT_DIR, 'public'))) {
      return send(res, 403, 'Forbidden', 'text/plain');
    }
    if (!fs.existsSync(target)) {
      return send(res, 404, 'Not found', 'text/plain');
    }
    return send(res, 200, fs.readFileSync(target), file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html');
  } catch (error) {
    console.error('Request error:', error.message);
    if (!res.headersSent) send(res, 400, { error: error.message });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`=====================================================`);
  console.log(`CampusWire web server: http://localhost:${PORT}`);
  console.log(`TCP socket service:    port ${TCP_PORT}`);
  console.log(`Serving backend API & role-customized frontend`);
  console.log(`=====================================================`);
});

createTcp(TCP_PORT);
