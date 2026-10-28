/**
 * Starts the whole site as ONE process tree, for hosts that run a single web service (Render):
 *   - Path AI (path-ai/, Next.js) on an internal port, not exposed
 *   - the Socio Potents server (server.js) on $PORT, which forwards /path-ai to it
 * If Path AI stops, this process exits too, so the host restarts everything cleanly.
 *
 * Run with: node start.js   (after building path-ai — see DEPLOY.md)
 */

const { spawn } = require('child_process');
const path = require('path');

const PATH_AI_PORT = process.env.PATH_AI_PORT || '4000';
process.env.PATH_AI_URL = process.env.PATH_AI_URL || 'http://127.0.0.1:' + PATH_AI_PORT;

const nextBin = path.join(__dirname, 'path-ai', 'node_modules', 'next', 'dist', 'bin', 'next');
const pathAi = spawn(process.execPath, [nextBin, 'start', '-p', PATH_AI_PORT, '-H', '127.0.0.1'], {
  cwd: path.join(__dirname, 'path-ai'),
  stdio: 'inherit',
  env: process.env,
});

pathAi.on('exit', function (code, signal) {
  console.error('Path AI exited (' + (signal || code) + '); stopping so the host can restart.');
  process.exit(code || 1);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, function () {
    pathAi.kill(sig);
    process.exit(0);
  });
}

require('./server.js');
