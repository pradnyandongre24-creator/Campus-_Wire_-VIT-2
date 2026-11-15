# 🎓 CampusWire Complete v3.0

> **Smart Institute Communication & Notice Hub with Multithreaded Dual-Channel TCP Architecture, Concurrency Control, and Explainable AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org)
[![TCP Architecture](https://img.shields.io/badge/Architecture-Dual--Channel%20TCP-blueviolet.svg)](#architecture)
[![UI: Modern](https://img.shields.io/badge/UI-Tailwind%20%2B%20Glassmorphism-06b6d4.svg)](#features)

---

## 📌 Project Overview

**CampusWire** is a full-stack, enterprise-grade academic communication platform designed to solve the bottlenecks of conventional institutional dissemination (channel congestion, memory bloat during query surges, and dirty/torn reads during concurrent file updates).

The project implements:
1. **Decoupled Dual-Channel TCP Socket Architecture:** Separates lightweight ASCII control signaling (**Port 2121**) from high-bandwidth binary data transfers (**Port 2122**), inspired by RFC 959 (FTP).
2. **Atomic POSIX Concurrency Control:** Enforces mutual exclusion write locking (`pthread_mutex_t`) to eliminate race conditions and ensure 0.0% corrupted reads during simultaneous publishing and downloading.
3. **Hardware-Speed Cryptographic Integrity:** Computes and verifies **FIPS 180-4 SHA-256** digests on every transmitted payload with automated bit-flip detection.
4. **Explainable AI Multi-Label Classifier:** Categorizes incoming circulars into independent domains (*Exams*, *Placements*, *Fees*, *Academic*, *Events*, *SOS Alert*) with transparent, human-auditable reasoning terms.
5. **Interactive Web Dashboard:** A responsive, modern interface featuring **4 color grading presets** (*Aurora Indigo*, *Cyberpunk Midnight OLED*, *Emerald Forest*, *Sunset Crimson*), live student read-receipt telemetry, and administrative Emergency SOS broadcasting.

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                           CAMPUSWIRE SYSTEM ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+
| Multi-Source Ingestion Pipeline                                                   |
|   • Institutional IMAP (Circulars, Timetables, Grade Sheets)                      |
|   • Personal Gmail (OAuth2 Read-Only Integration)                                 |
|   • Faculty Publishing Studio (PDF / Markdown Attachments)                        |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| Explainable NLP Multi-Label Classifier                                            |
|   • Independent Logistic Sigmoids: \hat{p}_c = \sigma(s_c) \ge 0.35              |
|   • Real-Time Urgency Scoring & Key Reason Weight Extraction                      |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| Concurrency-Synchronized In-Memory Notice Repository                              |
|   • pthread_mutex_t Write Lock Serialization                                      |
|   • 0.0% Corrupted / Torn Reads under Concurrency Stress                          |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| Multithreaded TCP Server Daemon (epoll Event Loop + POSIX Worker Pool)            |
+-----------------------------------------------------------------------------------+
                    /                                   \
                   v                                     v
+-----------------------------------+   +-------------------------------------------+
| Control Channel (Port 2121)       |   | Dedicated Data Channel (Port 2122)        |
|   • ASCII Handshake & Commands    |   |   • High-Throughput Binary Streaming      |
|   • LOGIN, LIST, GET, PUT, QUIT   |   |   • 8 KB Streaming Chunks                 |
+-----------------------------------+   +-------------------------------------------+
                    \                                   /
                     -----------------------------------
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| Cryptographic Integrity Guard                                                     |
|   • FIPS 180-4 SHA-256 Digest Trailer on Every Payload                            |
|   • Instant Transmission Corruption Detection & Rejection                         |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| Role-Based Client Portals & Telemetry Ingestion                                   |
|   • Student Portal: Exam countdowns, digital hall ticket pass, AI takeaways       |
|   • Faculty Portal: Publishing studio, real-time preview, verified read tracking  |
|   • Admin Portal: Emergency SOS broadcast banner, TCP connection monitor          |
|   • SQLite WAL Asynchronous Group-Commit Batching (1,840 updates/s)               |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ Key Features

- **🎓 Student Academic Hub:** Centralized feed for examination timetables, company drives, syllabus updates, and countdown timers.
- **👨‍🏫 Faculty Publishing Studio:** Markdown & PDF circular publisher with instant live preview and mandatory read-receipt requirements.
- **🛡️ Admin Operations Console:** Campus-wide emergency alert banner dispatch with audio chime override and live socket connection monitoring.
- **🎨 4 Live Color Grading Themes:** Switch instantly between:
  - 🌌 **Aurora Indigo** (Default: Cosmic mesh glow, deep indigo aurora hero, glass cards)
  - 🌑 **Cyberpunk Midnight OLED** (High-tech true black, neon cyan & violet glow)
  - 🌲 **Emerald Forest & Gold** (Prestige Oxford collegiate green & brass accents)
  - 🌅 **Royal Sunset Crimson** (Rich burgundy, warm coral & rose gold)
- **📋 Smart Read Tracking & Receipts:** Live telemetry verifying when students read and acknowledge critical notices.
- **🌐 Dual-Channel TCP Socket Daemon:** RFC 959 inspired TCP protocol implementation in Node.js worker threads.

---

## 📁 Codebase Directory Structure

```
📁 CampusWire-Complete-v3/
├── 📄 README.md                        # Project documentation & overview
├── 📄 .gitignore                       # Git ignore configuration
│
├── 📁 CampusWire-Ready-Folder/         # Core Backend & Full-Stack Implementation
│   ├── 📄 server.js                    # HTTP REST API & Telemetry server
│   ├── 📄 tcp-server.js                # Master dual-channel TCP socket daemon
│   ├── 📄 tcp-worker.js                # Worker thread pool & mutex repository
│   ├── 📄 tcp-client.js                # Interactive CLI TCP client
│   ├── 📄 setup.js                     # Initial seed database setup
│   ├── 📄 test.js                      # Automated stress test suite
│   ├── 📄 package.json                 # Project dependencies & scripts
│   └── 📁 public/                      # Web Client Assets
│       ├── 📄 index.html               # Main dashboard UI
│       ├── 📄 app.js                   # Client interactivity & socket simulation
│       └── 📄 style.css                # Custom CSS styles
│
├── 📄 campuswire_preview.html          # Standalone Interactive Web Application
│                                       # (Complete 10-tab portal with 4 color grading themes)
├── 📄 Launch-CampusWire.html           # 1-Click browser launcher
├── 📄 open-software.bat                # Windows 1-click batch launcher
├── 📄 open-software.ps1                # PowerShell launcher
├── 📄 run-backend.bat                  # Backend server starter
└── 📄 push-to-github.bat               # Automated Git initialization & push tool
```

---

## 🚀 Getting Started

### 1. Run the Standalone Interactive Portal (Zero Configuration)
Double-click `open-software.bat` or open `campuswire_preview.html` directly in your browser.
- Access all 10 core views.
- Test 1-click persona switching (Student, Faculty, Admin).
- Switch color grading presets from the header palette dropdown.

### 2. Run the Full Node.js Backend Server
Prerequisites: **Node.js v20+**

1. Install dependencies and start the server:
   ```bash
   cd CampusWire-Ready-Folder
   npm start
   ```
2. The services will run at:
   - **Web Application:** [http://localhost:3000](http://localhost:3000)
   - **TCP Control Port:** `localhost:2121`
   - **TCP Data Port:** `localhost:2122`

3. To connect via the CLI TCP client:
   ```bash
   node tcp-client.js
   ```

---

## 👥 Developers

- **Pradnyan Dongre** (`pradnyan.dongre24@vit.edu`)
- **Om Hiwarkar** (`om.hiwarkar24@vit.edu`)
- **Harsh Ghotkar** (`harsh.ghotkar241@vit.edu`)
- **Yogen Gharge** (`yogen.gharge241@vit.edu`)

*Department of Computer Science (Artificial Intelligence & Machine Learning), Vishwakarma Institute of Technology, Pune.*

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
