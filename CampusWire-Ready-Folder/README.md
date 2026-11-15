# CampusWire Complete v3

A full CNT course project with a responsive frontend, HTTP backend, dual Gmail OAuth, explainable notice classification, role access, institute file publishing and a multithreaded TCP/FTP-style client-server.

## Start

```bash
npm start
```

Open `http://localhost:3000`.

Accounts:
- `student / student123`
- `faculty / faculty123`
- `admin / admin123`

Use **Load demo** in Mail Connections to test without Google credentials.

## Real Gmail

Run `npm run setup`, enter the Google OAuth Client ID, Client Secret and optional college domain, then restart. Google redirect URI: `http://localhost:3000/oauth/callback`. Users may independently connect college mail, personal mail, or both. The app never collects email passwords and requests read-only access.

## Features

- Exams, Events, Holidays, Academic, Fees, Placements and General categories
- Confidence and matched-keyword explanation
- Urgent detection, search and source/category filters
- Read, favorite, archive and category correction
- College, personal and institute-source labels
- JSON export and dark mode
- Faculty/admin file publishing with audience controls
- Student file download
- AES-256-GCM encrypted OAuth tokens and duplicate prevention
- TCP server on port 2121 with one worker thread per client
- TCP commands: LOGIN, LIST, GET, PUT, QUIT

## TCP demonstration

```bash
npm run client
login faculty faculty123
list
put ./notice.pdf "Exam timetable" students
get NOTICE_ID
quit
```

## Test

```bash
npm test
```

Production deployment should add HTTPS/TLS, PostgreSQL, institutional SSO, rate limiting, malware scanning and administrator-approved OAuth.
