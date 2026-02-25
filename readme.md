<div align="center">

<img src="https://img.shields.io/badge/SparkHub-v0.2.5-63C0B9?style=for-the-badge&logo=zap&logoColor=white" alt="Version" />
<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/Express.js-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />

<br />

<img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
<img src="https://img.shields.io/badge/Framer_Motion-animations-FF0080?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
<img src="https://img.shields.io/badge/SQLite-WAL_mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
<img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />

<br /><br />

<img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
<img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?style=flat-square" alt="Platform" />
<img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
<img src="https://img.shields.io/badge/status-production%20ready-63C0B9?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/build-20260224.B-2B2E83?style=flat-square" alt="Build" />

<br /><br />

# ⚡ SparkHub

### *The all-in-one learning community platform*

**v0.2.5 (build 20260224.B)** — Open-source LMS built for students, creators, tutors, and educators.
Self-hostable in under 2 minutes. No vendor lock-in. No subscriptions.

</div>

---

## 🚀 Features

| Category | Feature |
|---|---|
| **Learning** | Courses with lessons, slide viewer (PDF/PPTX/video/audio), progress tracking, bookmarks |
| **Community** | Events, tutoring marketplace, job opportunities, discussions, ratings |
| **Communication** | In-app inbox, weekly digest emails, contact forms |
| **Student Tools** | Pomodoro timer (runs in background), flashcards (cloud-synced), quick notes |
| **AI Assistant** | Built-in rule-based chat assistant, persistent conversation history |
| **Admin** | Full admin panel with PIN auth, user management, site announcements, media library |
| **Notifications** | Global toast notification system (success/error/info, auto-dismiss, animated) |
| **Security** | JWT auth, rate limiting, CORS, Helmet, production mode disables test routes |
| **Deployment** | One-command deploy with PM2 (macOS/Linux + Windows PowerShell), DB ships empty |

---

## 📦 Quick Start

### Prerequisites
- Node.js ≥ 18
- npm

### One-command deploy

**macOS / Linux:**
```bash
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub
bash deploy.sh
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub
.\deploy.ps1
```

The script will:
1. Copy `.env.example` → `.env` (edit it with your values)
2. Set `NODE_ENV=production` automatically
3. Auto-generate a random 6-digit **ADMIN PIN** and print it clearly
4. Install all dependencies
5. Run `prisma db push` to sync the database
6. Start both servers with PM2 (persistent across reboots)

> **Dev mode:** `bash deploy.sh --dev` starts Next.js in watch mode for development.

---

## ⚙️ Configuration

Edit `backend/.env` after running the deploy script:

```env
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your-long-random-secret-here
ADMIN_SECRET=your-admin-secret            # used as fallback if ADMIN_PIN not set
ADMIN_PIN=123456                          # secondary PIN shown at /admin login screen
NODE_ENV=production                       # disables /testing routes in production
PORT=4000
FRONTEND_URL=http://your-domain.com
FRONTEND_ORIGINS=http://your-domain.com
UPLOAD_DIR=./uploads
BACKEND_URL=http://your-domain.com:4000
```

---

## 🔐 Security

### Admin PIN
The admin panel at `/admin` has **two layers** of authentication:
1. You must be logged in with `role: ADMIN`
2. You must enter the secondary **Admin PIN** on the PIN screen

The PIN is stored in `ADMIN_PIN` env var (falls back to `ADMIN_SECRET`). The deploy script auto-generates it if not set.

### Production Test Routes
In `NODE_ENV=production`, the `/testing` routes are completely disabled (no-op, 404). The `POST /testing/make-admin` endpoint (which allowed any user to self-promote) has been **permanently removed**.

### Rate Limiting
- Global: 3,000 req / IP / 15 min
- Auth: 30 req / IP / 10 min
- Upload: 30 req / IP / min

---

## 📁 Project Structure

```
SparkHub/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (SQLite — dev.db excluded from git)
│   ├── src/
│   │   ├── server.js              # Express app + route registration
│   │   ├── prisma.js              # Prisma singleton
│   │   ├── security.js            # Helmet, CORS, rate limiting
│   │   ├── middleware/
│   │   │   └── auth.js            # requireAuth, requireRole, maybeAuth
│   │   ├── routes/
│   │   │   ├── admin.js           # Admin panel routes (PIN verify, users, announcements, assets, stats)
│   │   │   ├── ai.js              # AI assistant + persistent history
│   │   │   ├── announcements.js   # Course announcements
│   │   │   ├── auth.js            # Register, login, verify-browser
│   │   │   ├── bookmarks.js       # Course bookmarks
│   │   │   ├── discussions.js     # Threaded course discussions
│   │   │   ├── emails.js          # Weekly digest + subscribe
│   │   │   ├── events.js          # Events CRUD
│   │   │   ├── feedback.js        # Contact form inbox
│   │   │   ├── flashcards.js      # Cloud flashcards
│   │   │   ├── inbox.js           # In-app messaging
│   │   │   ├── jobs.js            # Opportunities
│   │   │   ├── matching.js        # Tutor matching
│   │   │   ├── notes.js           # Per-lesson student notes
│   │   │   ├── progress.js        # Lesson completion tracking
│   │   │   ├── quizzes.js         # Course quizzes
│   │   │   ├── ratings.js         # Course ratings
│   │   │   ├── resources.js       # Resources CRUD
│   │   │   ├── testing.js         # Dev-only: seed/clear data (disabled in production)
│   │   │   ├── tutors.js          # Tutor profiles + publish
│   │   │   ├── upload.js          # File upload (multer)
│   │   │   └── user-notes.js      # Cloud quick notes
│   │   ├── scheduler/
│   │   │   └── weekly-digest.js   # Monday morning AI digest
│   │   └── utils/
│   │       └── prisma-sync.js     # WAL mode + schema sync check
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/page.tsx     # Admin panel (PIN auth, announcements, media, stats, users)
│   │   │   ├── courses/           # Course browse + studio + workspace
│   │   │   ├── dashboard/         # Student dashboard
│   │   │   ├── events/            # Events listing + detail
│   │   │   ├── not-found.tsx      # Custom 404 page
│   │   │   ├── opportunities/     # Job listings
│   │   │   ├── privacy/page.tsx   # Privacy policy
│   │   │   ├── resources/         # Resource library
│   │   │   ├── settings/page.tsx  # User settings + changelog
│   │   │   ├── terms/page.tsx     # Terms of service
│   │   │   ├── tutors/            # Tutor directory + dashboard
│   │   │   └── page.tsx           # Landing page
│   │   ├── components/
│   │   │   ├── ai-assistant.tsx         # Floating AI chat (persistent history)
│   │   │   ├── floating-toolbox.tsx     # Timer + flashcards + notes toolbox
│   │   │   ├── quick-notes.tsx          # Floating notes panel (cloud-synced)
│   │   │   ├── site-announcement-banner.tsx  # Site-wide banner (visible to all)
│   │   │   ├── site-footer.tsx          # Rich global footer
│   │   │   ├── site-nav.tsx             # Navigation bar
│   │   │   ├── toast-container.tsx      # Animated toast notifications
│   │   │   └── providers.tsx            # Global providers + layout
│   │   ├── contexts/
│   │   │   ├── theme-context.tsx        # Dark/light/system theme
│   │   │   ├── timer-context.tsx        # Global background timer
│   │   │   └── toast-context.tsx        # Global toast notifications
│   │   ├── hooks/
│   │   │   └── use-current-user.ts      # Auth state hook
│   │   └── lib/
│   │       ├── api.ts                   # Authenticated fetch wrapper
│   │       └── upload.ts                # File upload helper
│   └── next.config.ts                   # Rewrites /api/* → backend
│
├── deploy.sh                            # One-command deploy (macOS/Linux)
└── deploy.ps1                           # One-command deploy (Windows)
```

---

## 🌐 API Reference

All API calls go through the Next.js proxy at `/api/*` → backend. For direct backend access: `http://localhost:4000`.

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, returns JWT |
| POST | `/auth/verify-browser` | — | Browser token verification |
| GET | `/auth/me` | Bearer | Current user info |

### Courses & LMS
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/courses` | — | List published courses |
| POST | `/courses` | CREATOR/ADMIN | Create course |
| GET | `/courses/:id` | — | Course detail |
| GET | `/progress/:courseId` | Bearer | Lesson progress |
| POST | `/progress/:courseId/:lessonId` | Bearer | Mark lesson complete |
| GET | `/discussions/:courseId` | — | Course discussions |
| POST | `/discussions/:courseId` | Bearer | Post question |
| GET | `/ratings/:courseId` | — | Course ratings |
| POST | `/ratings/:courseId` | Bearer | Submit rating |

### Events, Resources, Jobs
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events` | — | List events |
| POST | `/events` | ADMIN | Create event |
| GET | `/resources` | — | List resources |
| POST | `/resources` | ADMIN | Publish resource |
| GET | `/jobs` | — | List opportunities |
| POST | `/jobs` | RECRUITER/ADMIN | Post opportunity |

### Student Tools
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/flashcards` | Bearer | List flashcards |
| POST | `/flashcards` | Bearer | Create flashcard |
| PATCH | `/flashcards/:id` | Bearer | Update flashcard |
| DELETE | `/flashcards/:id` | Bearer | Delete flashcard |
| GET | `/user-notes` | Bearer | List quick notes |
| POST | `/user-notes` | Bearer | Create note |
| PATCH | `/user-notes/:id` | Bearer | Update note |
| DELETE | `/user-notes/:id` | Bearer | Delete note |
| GET | `/ai/history` | Bearer | Chat history |
| POST | `/ai/chat` | Bearer | Send AI message |
| DELETE | `/ai/history` | Bearer | Clear chat history |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/announcement` | **PUBLIC** | Get active site announcement |
| POST | `/admin/announcement` | ADMIN | Publish site banner |
| DELETE | `/admin/announcement` | ADMIN | Clear site banner |
| POST | `/admin/verify-pin` | ADMIN | Verify secondary PIN |
| GET | `/admin/system-stats` | ADMIN | Live server/DB stats |
| GET | `/admin/assets` | ADMIN | List uploaded files |
| DELETE | `/admin/assets/:name` | ADMIN | Delete uploaded file |
| GET | `/admin/users` | ADMIN | List users |
| PATCH | `/admin/users/:id` | ADMIN | Change user role |
| DELETE | `/admin/users/:id` | ADMIN | Remove user |

### Inbox & Communication
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inbox` | Bearer | List messages |
| GET | `/inbox/unread-count` | Bearer | Unread count |
| PATCH | `/inbox/:id/read` | Bearer | Mark read |
| PATCH | `/inbox/read-all` | Bearer | Mark all read |
| DELETE | `/inbox/:id` | Bearer | Delete message |

---

## 🎛️ Admin Panel

Visit `/admin` after logging in as an ADMIN user.

**PIN Screen:** Enter the Admin PIN (printed during deploy or set in `.env` as `ADMIN_PIN`).

**Sections:**
- **Dashboard stats** — counts of events, resources, jobs, users
- **Create event** — title, location, dates, cover photo, file attachments
- **Publish resource** — title, kind, URL or file upload, image
- **Post opportunity** — job title, skills, contact, photos, files
- **Weekly email** — draft, schedule, and send newsletter to all subscribers
- **Site Announcement** — publish a full-width banner visible to ALL visitors (info / warning / alert / maintenance). Dismissable per session, color-coded by kind, optional expiry
- **System Stats** — live DB size, upload folder size, user/course counts, Node.js version, uptime
- **Media Library** — browse all uploaded assets, copy URLs, delete files
- **User Management** — search/filter by name or email, change roles, delete accounts

---

## 📢 Site Announcements

Site-wide banners appear above the nav bar for **all visitors**, including logged-out users.

- **Admin publishes:** Go to `/admin` → Site Announcement → enter message + kind → Publish
- **Visitor sees:** Full-width colored banner with dismiss (×) button
- **Auto-expire:** Optionally set an expiry date/time
- **Kinds:** `info` (teal), `warning` (amber), `error` (red), `maintenance` (purple)

---

## 🔧 Development

```bash
# Backend
cd backend
npm install
cp .env.example .env      # Edit with your values
npx prisma db push
node src/server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:4000`.

The Next.js config rewrites `/api/*` → `http://localhost:4000/*` automatically.

---

## 📋 Changelog

### v0.2.5 (build 20260224.B) — February 24, 2026
- **Global toast notifications** — animated success/error/info toasts (bottom-right, auto-dismiss 4s, max 5)
- **Custom 404 page** — branded not-found page with navigation links
- **DB excluded from git** — `dev.db` untracked; deploy script creates a fresh empty database on first run
- **Contact page cleanup** — replaced fake phone/address with GitHub + response time info; updated support email
- **Newsletter subscribe form removed** — form was decorative only (no email backend); replaced with GitHub link
- **Version numbers fixed** — all historical changelog entries corrected to `0.x.x` format
- **Admin panel** — replaced inline status messages with global toast notifications
- **Footer** — removed email subscribe form, added "Star on GitHub" link

### v0.2.4 (build 20260224.A) — February 24, 2026
- **Site-wide announcement banner** — admin-controlled, all visitors, color-coded, dismissable
- **Rich global footer** — 5-column footer on every page (Platform, For Creators, Support, About)
- **Admin PIN screen** — secondary PIN verification before accessing admin panel
- **Media library** — browse/copy/delete all uploaded assets from admin panel
- **System stats** — live DB size, upload size, user counts, server uptime in admin panel
- **User search** — filter users by name or email in admin panel
- **Security:** removed `POST /testing/make-admin` (critical privilege escalation hole)
- **Security:** `/testing` routes fully disabled in `NODE_ENV=production`
- **Deploy scripts** — auto-generate ADMIN_PIN, set NODE_ENV=production
- **Version format** changed to `0.x.x (build YYYYMMDD.X)` convention

### v0.2.3 — February 24, 2026
- Persistent flashcards and quick notes (cloud-synced)
- AI assistant with persistent conversation history
- Background Pomodoro timer (survives navigation)
- Floating toolbox with sync indicators

### v0.2.2 — February 23, 2026
- In-app inbox / messaging system
- Onboarding modal (OOBE)
- Tutor profile publishing
- Weekly AI digest
- Browser-token registration verification
- Privacy & Terms pages

---

## 📄 License

MIT — free to use, modify, and self-host.

---

<div align="center">
  <strong>Built for learners everywhere ⚡</strong><br />
  <a href="https://github.com/TomAs-1226/SparkHub">GitHub</a> ·
  <a href="https://github.com/TomAs-1226/SparkHub/issues">Report an Issue</a>
</div>
