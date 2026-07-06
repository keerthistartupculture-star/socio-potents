# Personality & Career Assessment — Setup Guide

This site now includes a small backend so student submissions from
`career-assessment.html` are saved and can be reviewed on `admin.html`.

## 1. Install Node.js (one-time)

If you don't already have it, download and install Node.js (LTS version)
from https://nodejs.org.

## 2. Install dependencies

Open a terminal in this folder (the one containing `server.js`) and run:

```
npm install
```

This downloads the one dependency the server needs (Express).

## 3. Start the server

```
npm start
```

You should see:

```
Socio Potents server running at http://localhost:3000
Assessment: http://localhost:3000/career-assessment.html
Admin dashboard: http://localhost:3000/admin.html
```

Leave this terminal window open — the site only works while the server is
running. Open the printed links in your browser.

## 4. Set your admin password

The first time the server runs, it creates `data/config.json` with a
default password:

```json
{ "adminPassword": "ChangeMe123!" }
```

Open that file in a text editor and change `"ChangeMe123!"` to your own
password, then restart the server (Ctrl+C, then `npm start` again).

Go to `http://localhost:3000/admin.html` and log in with that password to
see every student's details, personality type and career matches. Click
any row for the full detail, or delete a submission if needed.

## 5. Where the data lives

All submissions are stored in `data/submissions.json` on this computer —
plain JSON, one entry per student. Back this file up periodically if the
data matters to you (e.g. copy it somewhere safe from time to time).

Both `data/config.json` and `data/submissions.json` are blocked from being
downloaded directly through the website, so visitors can't view them.

## 6. Putting this online (optional)

Right now this only runs on your own computer, reachable only from this
machine (`localhost`). To let students access it from anywhere, you'd need
to deploy `server.js` to a Node.js-capable host (e.g. Render, Railway, or
a VPS) and point your domain at it. Let me know if you'd like help with
that step when you're ready — the hosting provider will determine the
exact deployment steps.

**Security note:** the admin login is a single shared password with no
extra hardening — adequate for small-scale internal use, but if you plan
to expose this publicly, consider adding HTTPS (most hosts provide this
automatically) and treat the admin password like any other sensitive
credential.
