/**
 * Socio Potents — site + assessment backend
 * --------------------------------------------------------
 * Serves the existing static website AND provides a small API so the
 * Personality & Career Assessment (career-assessment.html) can:
 *   1. Save each student's login details + answers + report to disk
 *      (data/submissions.json)
 *   2. Let an admin view all submissions on admin.html, protected by
 *      a single admin password (data/config.json).
 *
 * Run with:
 *   npm install
 *   npm start
 * Then open http://localhost:3000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// ---------------------------------------------------------
// Bootstrap data files
// ---------------------------------------------------------
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SUBMISSIONS_FILE)) fs.writeFileSync(SUBMISSIONS_FILE, '[]', 'utf8');
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify({ adminPassword: 'ChangeMe123!' }, null, 2),
    'utf8'
  );
  console.log('Created data/config.json with a default admin password: ChangeMe123!');
  console.log('Please open data/config.json and change it before sharing this with anyone.');
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const cfg = readJSON(CONFIG_FILE, {});
  return cfg.adminPassword || 'ChangeMe123!';
}

app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------
// Protect internal files from being downloaded directly
// ---------------------------------------------------------
app.use('/data', (req, res) => res.status(403).send('Forbidden'));
app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json'];
  if (blocked.includes(req.path)) return res.status(403).send('Forbidden');
  next();
});

// ---------------------------------------------------------
// Public API — student submits their completed assessment
// ---------------------------------------------------------
app.post('/api/submit', (req, res) => {
  const { student, answers, profile } = req.body || {};
  if (!student || !student.name || !answers || !profile) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }
  const submissions = readJSON(SUBMISSIONS_FILE, []);
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    submittedAt: new Date().toISOString(),
    student: student,
    answers: answers,
    profile: profile
  };
  submissions.unshift(record);
  writeJSON(SUBMISSIONS_FILE, submissions);
  res.json({ ok: true, id: record.id });
});

// ---------------------------------------------------------
// Admin API — protected by a single shared password
// ---------------------------------------------------------
function checkAdminAuth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== getAdminPassword()) {
    return res.status(401).json({ ok: false, error: 'Invalid admin password.' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === getAdminPassword()) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Incorrect password.' });
});

app.get('/api/admin/submissions', checkAdminAuth, (req, res) => {
  const submissions = readJSON(SUBMISSIONS_FILE, []);
  res.json({ ok: true, submissions: submissions });
});

app.delete('/api/admin/submissions/:id', checkAdminAuth, (req, res) => {
  let submissions = readJSON(SUBMISSIONS_FILE, []);
  const before = submissions.length;
  submissions = submissions.filter(function (s) { return s.id !== req.params.id; });
  writeJSON(SUBMISSIONS_FILE, submissions);
  res.json({ ok: true, removed: before - submissions.length });
});

// ---------------------------------------------------------
// Static site (the existing HTML/CSS/JS/images)
// ---------------------------------------------------------
app.use(express.static(ROOT, { extensions: ['html'] }));

app.listen(PORT, function () {
  console.log('Socio Potents server running at http://localhost:' + PORT);
  console.log('Assessment: http://localhost:' + PORT + '/career-assessment.html');
  console.log('Admin dashboard: http://localhost:' + PORT + '/admin.html');
});
