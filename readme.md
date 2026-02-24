<div align="center">

<img src="https://img.shields.io/badge/SparkHub-v2.2.0-63C0B9?style=for-the-badge&logo=zap&logoColor=white" alt="Version" />
<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/Express.js-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />

<br />

<img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
<img src="https://img.shields.io/badge/Framer_Motion-animations-FF0080?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
<img src="https://img.shields.io/badge/SQLite-WAL_mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
<img src="https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
<img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />

<br /><br />

<img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
<img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?style=flat-square" alt="Platform" />
<img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
<img src="https://img.shields.io/badge/status-production%20ready-63C0B9?style=flat-square" alt="Status" />

<br /><br />

# ⚡ SparkHub

### *The all-in-one learning community platform*

**SparkHub** brings together students, tutors, creators, and educators in a beautifully designed, feature-rich learning environment. From AI-generated weekly digests to tutor matching, course creation to live video sessions — everything your learning community needs in one place.

[**Get Started →**](#-quick-start) · [**Features**](#-features) · [**Deploy**](#-one-command-deployment) · [**API Docs**](#-api-reference)

</div>

---

## 🌟 What is SparkHub?

SparkHub started as a simple course platform and grew into something much more ambitious — a **full learning community OS**. The idea was straightforward: learning doesn't happen in isolation. You need courses, yes, but also the ability to find a tutor on a Tuesday evening, join a live workshop, discover opportunities, ask questions in discussions, and get a friendly nudge every week about what's happening in your community.

That's exactly what SparkHub does. It's opinionated in its design (glass-morphism UI, teal-and-white colour palette, smooth Framer Motion animations throughout), but completely open and self-hostable.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📚 Learning Management
- **Course creation studio** with tab-based UI (Overview · Courses · Workspace · Settings)
- **Lesson decks** with PDF/PPTX slide viewer and video support
- **Course materials** with visibility controls (Public / Enrolled / Staff)
- **Progress tracking** — per-lesson completion checklist
- **Assignments** with deadline and description
- **Enrollment management** with approve/reject queue
- **Join codes** for direct course access
- **Course ratings & reviews** (1–5 stars)
- **Threaded discussions** per course

</td>
<td width="50%">

### 🎓 Tutoring & Matching
- **Tutor profiles** with bio, subjects, rate info
- **One-click publish/unpublish** — appear in the public listing
- **Smart matching engine** — word-level subject tokenisation (Java ≠ JavaScript)
- **Availability calendar** — mark available dates as TUTOR or STUDENT
- **Match score** with `matchPercent` field and bio keyword boost
- **Session booking** with Jitsi meeting URL auto-generation
- **Request / Accept / Decline / Reschedule** workflow

</td>
</tr>
<tr>
<td width="50%">

### 📬 Inbox & Messaging
- **In-app inbox** replaces email — no spam folder
- **Unread badge** in the navbar, polling every 60 seconds
- **Three tabs** — All · Unread · Digests
- **AI-generated weekly digest** via OpenAI `gpt-4o-mini` (with template fallback)
- **Scheduled delivery** every Monday at 09:00 via `node-cron`
- **Admin broadcast** — send to one user or the entire platform
- **Mark all read**, per-message delete

</td>
<td width="50%">

### 🛡️ Auth & Security
- **Instant registration** — no email verification step
- **Browser-token verification** — same-session proof, 5-minute TTL
- **JWT sessions** with device tracking via `UserSession` table
- **Two-tier AI content moderation** — keyword filter + optional Claude AI
- **Helmet, CORS, HPP, rate limiting** (3000 req/IP/15min global)
- **Request timeout middleware** (30s default)
- **Graceful shutdown** with SIGTERM/SIGINT handling
- **Optional cluster mode** for multi-core scale-out

</td>
</tr>
<tr>
<td width="50%">

### 🎉 Community Features
- **Events** — with cover images, attachments, location, RSVP capacity
- **Job & opportunity board** — with skills tags, photos, contact info
- **Learning resources** — links, docs, PDFs with Google Docs viewer
- **Announcements** — instructor-to-student broadcasts per course
- **Bookmarks** — save courses for later
- **Student notes** — per-lesson server-side notes
- **Course discussions** — threaded Q&A with replies

</td>
<td width="50%">

### 🎨 Design & UX
- **Glass-morphism UI** — `bg-white/95`, `backdrop-blur`, `rounded-[32px]`
- **Teal accent system** (`#63C0B9` / `#2D8F80`) with user-selectable themes
- **Full dark mode** — persistent via `localStorage`
- **4-step OOBE onboarding modal** — role-aware, spring animations
- **Framer Motion** throughout — `AnimatePresence`, spring physics
- **Notification bell** with animated badge
- **Dashboard inbox preview** + stats bubbles

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Option 1 — One-Command Deploy (Recommended)

The fastest way to get SparkHub running:

```bash
# Clone the repo
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub

# macOS / Linux
bash deploy.sh --dev

# Windows (PowerShell)
.\deploy.ps1 -Dev
```

That's it. The script will:
1. Check Node.js ≥ 18
2. Copy `.env.example` files if `.env` doesn't exist
3. Install all dependencies in parallel
4. Run `prisma db push` to set up the database
5. Install PM2 globally if missing
6. Start both servers under PM2

**Frontend:** http://localhost:3000 · **Backend API:** http://localhost:4000

---

### Option 2 — Manual Setup

If you prefer to set things up yourself:

#### 1. Clone & install

```bash
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub

# Install dependencies (parallel)
npm install --prefix backend &
npm install --prefix frontend &
wait
```

#### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum set JWT_SECRET

# Frontend (optional, defaults work out of the box)
cp frontend/.env.local.example frontend/.env.local
```

#### 3. Set up the database

```bash
cd backend
npx prisma db push
```

#### 4. Start development servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `file:./prisma/dev.db` | SQLite database path |
| `JWT_SECRET` | ✅ | — | **Change this in production.** Used to sign auth tokens |
| `ADMIN_SECRET` | ✅ | `sparkhub-admin-2026` | Secret key for registering admin accounts |
| `PORT` | ❌ | `4000` | Backend server port |
| `FRONTEND_URL` | ❌ | `http://localhost:3000` | Used for CORS |
| `FRONTEND_ORIGINS` | ❌ | — | Comma-separated list for multi-origin CORS |
| `OPENAI_API_KEY` | ❌ | — | Enables AI-generated weekly digest |
| `ANTHROPIC_API_KEY` | ❌ | — | Enables Claude AI content moderation (Tier 2) |
| `UPLOAD_DIR` | ❌ | `./uploads` | Where uploaded files are stored |
| `ENABLE_LOAD_SHED` | ❌ | `false` | Enable toobusy-js load shedding |
| `MEET_BASE` | ❌ | `https://meet.jit.si` | Video meeting base URL |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | ❌ | `http://localhost:4000` | Direct backend URL for file uploads |

---

## 📁 Project Structure

```
SparkHub/
├── 📂 backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 30+ models — User, Course, Lesson, InboxMessage...
│   │   └── dev.db                 # SQLite database (auto-created)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js            # Register, login, verify-browser, me
│   │   │   ├── courses.js         # Courses, lessons, materials, sessions
│   │   │   ├── tutors.js          # Profiles, publish, booking, sessions
│   │   │   ├── matching.js        # Availability + smart match engine
│   │   │   ├── inbox.js           # In-app messaging + digest trigger
│   │   │   ├── events.js          # Events CRUD
│   │   │   ├── jobs.js            # Job/opportunity board
│   │   │   ├── resources.js       # Learning resources
│   │   │   ├── ai.js              # AI chat assistant
│   │   │   ├── admin.js           # Admin controls
│   │   │   ├── discussions.js     # Threaded course discussions
│   │   │   ├── ratings.js         # Course ratings & reviews
│   │   │   ├── progress.js        # Lesson completion tracking
│   │   │   ├── announcements.js   # Course announcements
│   │   │   ├── notes.js           # Student notes
│   │   │   └── bookmarks.js       # Course bookmarks
│   │   ├── middleware/
│   │   │   └── auth.js            # requireAuth, requireRole, maybeAuth
│   │   ├── scheduler/
│   │   │   └── weekly-digest.js   # AI digest generator + inbox delivery
│   │   ├── utils/
│   │   │   ├── moderation.js      # Two-tier content moderation
│   │   │   └── prisma-sync.js     # Schema sync utility
│   │   ├── security.js            # Helmet, CORS, rate limits, HPP
│   │   ├── prisma.js              # Prisma client singleton + health check
│   │   └── server.js              # Express app, cluster, cron, routes
│   ├── .env.example
│   └── package.json
│
├── 📂 frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── dashboard/         # Main dashboard with inbox preview
│   │   │   ├── courses/           # Course catalog + studio + viewer
│   │   │   ├── tutors/            # Tutor listing + dashboard + booking
│   │   │   ├── inbox/             # In-app inbox (All/Unread/Digests)
│   │   │   ├── events/            # Events listing
│   │   │   ├── resources/         # Resources with viewer
│   │   │   ├── opportunities/     # Job board
│   │   │   ├── register/          # Browser-verified registration
│   │   │   ├── login/             # Login page
│   │   │   ├── settings/          # Account settings + changelog
│   │   │   ├── privacy/           # Privacy policy
│   │   │   └── terms/             # Terms of service
│   │   ├── components/
│   │   │   ├── site-nav.tsx       # Navbar with notification bell
│   │   │   ├── onboarding-modal.tsx # 4-step OOBE flow
│   │   │   ├── slide-viewer.tsx   # PDF/PPTX/video viewer
│   │   │   ├── course-*.tsx       # Course sub-components
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── api.ts             # Authenticated fetch wrapper
│   │   │   ├── auth.ts            # Token storage helpers
│   │   │   └── upload.ts          # Direct-to-backend file upload
│   │   └── hooks/
│   │       └── use-current-user.ts
│   ├── .env.local.example
│   └── next.config.ts
│
├── deploy.sh                      # macOS/Linux one-command deploy
├── deploy.ps1                     # Windows PowerShell deploy
└── README.md
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Next.js 15)              │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Pages    │  │Components│  │  lib/api.ts         │ │
│  │ (App     │  │ (React)  │  │  Bearer token       │ │
│  │  Router) │  │          │  │  auto-injected      │ │
│  └────┬─────┘  └────┬─────┘  └──────────┬─────────┘ │
└───────┼─────────────┼───────────────────┼────────────┘
        │             │     REST API       │
        └─────────────┴───────────────────┘
                             │
             ┌───────────────▼────────────────┐
             │       Express.js (port 4000)    │
             │  Helmet · CORS · Rate Limit     │
             │  HPP · Compression · Timeout    │
             │                                 │
             │  ┌──────────┐  ┌────────────┐  │
             │  │ Routes   │  │ Middleware │  │
             │  │ 20+ APIs │  │ requireAuth│  │
             │  └────┬─────┘  └────────────┘  │
             │       │                         │
             │  ┌────▼──────────────────────┐  │
             │  │  Prisma ORM               │  │
             │  │  SQLite (WAL mode)        │  │
             │  │  30+ models               │  │
             │  └───────────────────────────┘  │
             │                                 │
             │  ┌──────────┐  ┌────────────┐  │
             │  │ node-cron│  │  OpenAI    │  │
             │  │ Mon 9am  │  │ gpt-4o-mini│  │
             │  │ digest   │  │  digest    │  │
             │  └──────────┘  └────────────┘  │
             └────────────────────────────────┘
```

**Key design decisions:**
- File uploads go **directly to the backend** — bypasses Next.js entirely to avoid Turbopack streaming issues and body size limits (50 MB cap)
- Auth tokens live in `localStorage` (simple, no cookie complexity for this use case)
- SQLite in WAL mode handles ~1,000 concurrent users without issue — upgrade to PostgreSQL for more
- Weekly digest runs server-side via cron; OpenAI generates the content, template is always the fallback
- All routes are CommonJS (`require/module.exports`) to match the existing Express.js pattern

---

## 🔌 API Reference

All API routes are prefixed with `/api/` when called from the frontend (proxied via `next.config.ts`), or at `http://localhost:4000/` directly.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Create account, returns `verifyToken` |
| `POST` | `/auth/verify-browser` | — | Complete browser verification, returns JWT |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `GET` | `/auth/me` | ✅ | Get current user |
| `PATCH` | `/auth/me` | ✅ | Update name / avatar |

### Courses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses` | — | List published courses |
| `POST` | `/courses` | ✅ CREATOR+ | Create course |
| `GET` | `/courses/:id` | — | Course detail |
| `POST` | `/courses/:id/lessons` | ✅ | Add lesson |
| `POST` | `/courses/:id/materials` | ✅ | Add material |
| `POST` | `/courses/:id/enroll` | ✅ | Enroll in course |
| `GET` | `/courses/enrollments/mine` | ✅ | My enrollments |

### Inbox

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/inbox` | ✅ | Paginated messages (`?kind=DIGEST&unread=true`) |
| `GET` | `/inbox/unread-count` | ✅ | `{ count }` for navbar badge |
| `PATCH` | `/inbox/:id/read` | ✅ | Mark message read |
| `PATCH` | `/inbox/read-all` | ✅ | Mark all read |
| `DELETE` | `/inbox/:id` | ✅ | Delete message |
| `POST` | `/inbox/send` | ✅ ADMIN | Send to user or broadcast |
| `POST` | `/inbox/digest` | ✅ ADMIN | Trigger AI digest now |

### Tutors & Matching

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/tutors` | — | Published tutor profiles |
| `GET` | `/tutors/profile` | ✅ TUTOR | Own profile |
| `POST` | `/tutors/profile` | ✅ TUTOR | Create/update profile |
| `POST` | `/tutors/publish` | ✅ TUTOR | Toggle `isPublished` |
| `POST` | `/tutors/sessions` | ✅ | Book a session |
| `GET` | `/matching/find-matches` | ✅ | Find matches (returns `matchPercent`) |
| `POST` | `/matching/availability` | ✅ | Set availability dates |

---

## 🚢 One-Command Deployment

### macOS / Linux

```bash
# Production
bash deploy.sh

# Development (hot reload)
bash deploy.sh --dev
```

### Windows

```powershell
# Production
.\deploy.ps1

# Development
.\deploy.ps1 -Dev
```

Both scripts handle everything automatically:

```
✓ Node.js v22.x detected
Installing dependencies…
✓ Dependencies installed
Syncing database…
✓ Database ready
Starting servers with PM2…
✓ SparkHub running in dev mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Backend:  http://localhost:4000
  Frontend: http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Production with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 55M;
    }

    # Uploaded files
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }
}
```

---

## 🤖 AI Features

SparkHub has two AI integrations, both optional and gracefully degraded when API keys are absent.

### Weekly Digest (OpenAI)

Set `OPENAI_API_KEY` in `backend/.env` to enable AI-generated digests. Every Monday at 09:00, the system:

1. Collects the week's stats — new courses, upcoming events, new jobs, new resources, total users
2. Sends a prompt to `gpt-4o-mini` asking for a warm, 350-word Markdown newsletter
3. Delivers the result to every opted-in user's in-app inbox
4. Logs the digest to the `WeeklyUpdate` table for admin records

Without an API key, a handcrafted template digest is used instead — still looks great.

You can trigger a digest immediately from the admin panel: `POST /inbox/digest`.

### Content Moderation (Anthropic Claude)

Set `ANTHROPIC_API_KEY` to enable Tier 2 AI moderation on user-generated content (course discussions, reviews, chat). Works alongside the always-on Tier 1 keyword filter:

- **Tier 1** — instant, blocks hate speech / doxxing / spam, auto-cleans mild profanity
- **Tier 2** — Claude AI context analysis with a 5-second timeout and automatic fallback

Educational debate, mild frustration, and constructive criticism always pass through.

---

## 🔐 Creating Your First Admin Account

1. Set `ADMIN_SECRET` in `backend/.env` (default: `sparkhub-admin-2026`)
2. Register at http://localhost:3000/register
3. Select **Admin** as your account type
4. Enter the admin secret in the field that appears

The admin panel is at `/admin` and gives you access to user management, content oversight, the inbox broadcast tool, and the digest trigger.

---

## 🗄️ Database

SparkHub uses **SQLite** in WAL mode out of the box — zero configuration, works instantly, handles ~1,000 concurrent users comfortably. The database file lives at `backend/prisma/dev.db`.

```bash
# View and edit data visually
cd backend && npx prisma studio
# Open http://localhost:5555

# Reset everything (⚠️ deletes all data)
npx prisma db push --force-reset

# Backup
cp backend/prisma/dev.db backend/prisma/dev.db.bak
```

### Upgrading to PostgreSQL

When you're ready to scale, swap out the SQLite datasource:

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/sparkhub"

# Re-push schema
npx prisma db push
```

---

## 🐛 Troubleshooting

<details>
<summary><strong>Port 4000 is already in use</strong></summary>

```bash
lsof -i :4000 | grep LISTEN
kill -9 <PID>
# or just change the port
PORT=4001 npm run dev
```
</details>

<details>
<summary><strong>Frontend can't reach the backend</strong></summary>

1. Make sure the backend is running on port 4000
2. Check `backend/.env` has `FRONTEND_URL=http://localhost:3000`
3. Open browser DevTools → Network tab to see the actual error
4. Try the health check: `curl http://localhost:4000/healthz`
</details>

<details>
<summary><strong>File upload failing</strong></summary>

Uploads go directly to the backend (not through Next.js). Make sure:
- `backend/uploads/` directory exists: `mkdir -p backend/uploads`
- The backend is running and reachable at `NEXT_PUBLIC_API_BASE_URL`
- File is under 50 MB
</details>

<details>
<summary><strong>Database errors after pulling new code</strong></summary>

```bash
cd backend
npx prisma db push
```

This syncs the schema without losing data. Safe to run anytime.
</details>

<details>
<summary><strong>PM2 processes not starting</strong></summary>

```bash
pm2 list              # see all processes
pm2 logs sparkhub-backend  # view backend logs
pm2 restart all       # restart everything
pm2 delete all        # nuclear option — start fresh
```
</details>

---

## 📋 Changelog

### v2.2.0 — Production Release *(February 23, 2026)*

> The biggest update yet. This release makes SparkHub genuinely production-ready with a full messaging system, seamless onboarding, and one-command deployment.

- **In-app inbox** — AI-written weekly digests, admin broadcasts, unread badge in nav
- **OOBE onboarding** — 4-step modal with role-aware quick start
- **Instant registration** — browser-token verification, no email required
- **50 MB uploads** — direct-to-backend, bypasses Next.js entirely
- **Tutor publishing** — bio, subjects, rate info, one-click publish/unpublish
- **Smart matching** — word-level tokenisation, `matchPercent` score
- **Creator studio tabs** — Overview · Courses · Workspace · Settings
- **Deployment scripts** — `deploy.sh` + `deploy.ps1`
- **Privacy & Terms pages**

### v2.1.0 — Platform Hardening *(February 22, 2026)*
- Two-tier AI content moderation
- Upload streaming fix
- Enrollment approval UI
- Slide viewer improvements
- Opportunity posting fix

### v2.0.0 — LMS Edition *(February 22, 2026)*
- Full LMS: lessons, materials, progress tracking, ratings, discussions, announcements
- Slide/PDF/PPTX viewer
- Course bookmarks and student notes
- WAL mode SQLite, rate limiting, Helmet security

---

## 🤝 Contributing

SparkHub is open source and contributions are genuinely welcome. Whether it's a bug fix, a new feature, or just improving the docs — all of it helps.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make your changes
4. Push and open a pull request

Please keep PRs focused — one feature or fix per PR makes review much easier.

---

## 📄 License

MIT — do whatever you want with it, just don't blame us if something breaks in production.

---

<div align="center">

Built with ☕ and way too many late nights.

<img src="https://img.shields.io/badge/Made%20with-Next.js%2015-black?style=flat-square&logo=next.js" />
<img src="https://img.shields.io/badge/Powered%20by-Express.js-000000?style=flat-square&logo=express" />
<img src="https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Animated%20with-Framer%20Motion-FF0080?style=flat-square&logo=framer&logoColor=white" />

**[⬆ Back to top](#-sparkhub)**

</div>
