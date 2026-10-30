/**
 * Socio Potents — site server
 * --------------------------------------------------------
 * Serves the static website (HTML/CSS/JS/images) and forwards
 * /path-ai/* to the Path AI app (path-ai/, a separate Next.js server).
 *
 * Run with:
 *   npm install
 *   npm start
 * Then open http://localhost:3000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// Where the Path AI Next.js server listens. It is built with basePath /path-ai,
// so requests are forwarded with the /path-ai prefix intact.
const PATH_AI_URL = process.env.PATH_AI_URL || 'http://127.0.0.1:4000';

// ---------------------------------------------------------
// The old Career Assessment page was replaced by Path AI; send old links and bookmarks there.
// ---------------------------------------------------------
app.get(['/career-assessment', '/career-assessment.html'], function (req, res) {
  res.redirect(301, '/path-ai/assessment/start');
});

// ---------------------------------------------------------
// Path AI — must come before the static handler so the
// path-ai/ source folder is never served as files.
// ---------------------------------------------------------
app.use(
  createProxyMiddleware({
    target: PATH_AI_URL,
    pathFilter: '/path-ai',
    xfwd: true,
    on: {
      error: function (err, req, res) {
        if (res.headersSent) return;
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end('<p>Path AI is starting up or unavailable. Please try again in a minute.</p>');
      }
    }
  })
);

// ---------------------------------------------------------
// Protect internal files from being downloaded directly
// ---------------------------------------------------------
app.use('/data', (req, res) => res.status(403).send('Forbidden'));
app.use((req, res, next) => {
  const blocked = [
    '/server.js', '/start.js', '/package.json', '/package-lock.json', '/Dockerfile',
    '/docker-compose.yml', '/render.yaml', '/DEPLOY.md', '/README.md'
  ];
  if (blocked.includes(req.path)) return res.status(403).send('Forbidden');
  next();
});

// ---------------------------------------------------------
// Static site (the existing HTML/CSS/JS/images)
// ---------------------------------------------------------
app.use(express.static(ROOT, { extensions: ['html'] }));

// Fallback: serve index.html for root
app.get('/', function (req, res) {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, '0.0.0.0', function () {
  console.log('Socio Potents server running at http://0.0.0.0:' + PORT);
  console.log('__dirname: ' + ROOT);
  console.log('index.html exists: ' + fs.existsSync(path.join(ROOT, 'index.html')));
  console.log('Path AI: /path-ai -> ' + PATH_AI_URL);
});
