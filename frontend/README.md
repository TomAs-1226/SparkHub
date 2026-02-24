<div align="center">

<img src="https://img.shields.io/badge/SparkHub-Frontend-63C0B9?style=for-the-badge&logo=zap&logoColor=white" alt="SparkHub" />
<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind v4" />

# SparkHub — Frontend

**Next.js 15 App Router application powering the SparkHub LMS experience**

</div>

---

## Overview

This is the frontend for SparkHub — a full-featured learning management system built with the latest Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS v4. The UI is designed with a glass-morphism aesthetic, smooth Framer Motion animations, and a mobile-first responsive layout.

All API communication routes through a Next.js rewrite proxy at `/api/*` → `http://localhost:4000/*`, so no CORS configuration is needed in development.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- The SparkHub backend running on `http://localhost:4000`

### Install and run

```bash
# Install dependencies
npm install

# Development server (with Turbopack)
npm run dev

# Production build
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

### Environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | Backend API base URL |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login, Register, Verify
│   ├── dashboard/         # User dashboard
│   ├── courses/           # Course list, workspace, studio
│   ├── tutors/            # Tutor listing + dashboard
│   ├── events/            # Events calendar
│   ├── resources/         # Resource library
│   ├── jobs/              # Job board (opportunities)
│   ├── inbox/             # In-app inbox
│   ├── admin/             # Admin panel
│   ├── settings/          # Account settings + changelog
│   ├── privacy/           # Privacy policy
│   └── terms/             # Terms of service
├── components/            # Shared UI components
│   ├── site-nav.tsx       # Navigation bar with notification bell
│   ├── onboarding-modal.tsx  # 6-step OOBE welcome flow
│   ├── coverflow-row.tsx  # Interactive 3D coverflow cards
│   ├── explore-contents.tsx  # Landing page content rows
│   ├── slide-viewer.tsx   # PDF/PPTX/video viewer
│   ├── course-progress.tsx
│   ├── course-discussions.tsx
│   ├── course-announcements.tsx
│   ├── course-ratings.tsx
│   └── floating-toolbox.tsx
├── hooks/                 # Custom React hooks
│   ├── use-current-user.ts
│   └── use-dark-mode.ts
└── lib/                   # Utilities
    ├── api.ts             # Auth-aware fetch wrapper
    ├── upload.ts          # Direct-to-backend file upload
    └── motion-presets.ts  # Framer Motion config
```

---

## Key Architecture Patterns

### API calls

All authenticated requests use the `api()` helper which automatically injects the JWT `Authorization` header:

```ts
import { api } from "@/lib/api";

// Authenticated call (auto-adds Bearer token)
const res = await api("/inbox/unread-count");

// Public call (no auth header needed)
const res = await fetch("/api/resources?limit=10");
```

### File uploads

Uploads bypass Next.js and go directly to the backend to avoid body size limits and Turbopack streaming issues:

```ts
import { uploadFile } from "@/lib/upload";

const result = await uploadFile(file, token);
// result.url = the uploaded file URL
```

### Auth flow

- JWT stored in `localStorage` as `"token"`
- `useCurrentUser()` hook decodes the JWT and fetches the user profile
- Registration uses browser-token verification (no email required):
  1. POST `/auth/register` → returns `{ verifyToken }`
  2. POST `/auth/verify-browser` with token → returns full JWT
  3. Frontend redirects to `/dashboard?welcome=1`

### OOBE Onboarding

Shown once on first visit (or on `?welcome=1` URL param):

```tsx
// dashboard/page.tsx
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
    const hasOnboarded = localStorage.getItem("sparkhub:onboarded");
    if (!hasOnboarded || searchParams?.get("welcome") === "1") {
        setShowOnboarding(true);
    }
}, []);
```

The 6-step modal collects:
- Subject interests (multi-select)
- Learning goal
- Notification preferences

All saved to `localStorage` under `sparkhub:*` keys.

---

## Pages

| Route | Description | Auth Required |
|---|---|---|
| `/` | Landing page with coverflow tiles | Public |
| `/login` | Sign in | Public |
| `/register` | Create account | Public |
| `/dashboard` | User dashboard + OOBE trigger | Yes |
| `/courses` | Course catalog | Public |
| `/courses/[id]` | Course workspace with LMS features | Yes |
| `/courses/studio` | Creator studio (tab-based) | CREATOR/ADMIN |
| `/tutors` | Tutor directory | Public |
| `/tutors/dashboard` | Tutor profile management | TUTOR |
| `/events` | Events calendar | Public |
| `/resources` | Resource library | Public |
| `/resources/[id]` | Resource viewer (PDF/PPTX/video) | Yes |
| `/jobs` | Opportunity board | Public |
| `/inbox` | In-app inbox with All/Unread/Digests tabs | Yes |
| `/admin` | Admin panel | ADMIN |
| `/settings` | Account settings + changelog | Yes |
| `/privacy` | Privacy policy | Public |
| `/terms` | Terms of service | Public |

---

## Components

### CoverflowRow

Interactive coverflow/book-shelf UI for browsing content cards. Features:
- 3D "open book" expand animation on click
- Keyboard navigation (arrow keys, Enter, Escape)
- Touch/drag with momentum
- Edge hover auto-pan
- Responsive sizing

```tsx
<CoverflowRow
  title="Courses"
  slug="courses"
  items={courseItems}
/>
```

### NotificationBell (inline in SiteNav)

Polls `/inbox/unread-count` every 60 seconds. Shows animated red badge when `count > 0`. Navigates to `/inbox` on click.

### OnboardingModal

6-step OOBE flow:
1. Welcome (personalized with user name + role badge)
2. Features overview (3-column icon grid)
3. Subject interests (multi-select chips)
4. Goal + preferences (learning goal + notification toggles)
5. Quick start (role-specific action cards)
6. All set (personalized summary + celebration)

---

## Design System

**Color palette:**
- Primary teal: `#63C0B9` / `#2D8F80`
- Background: `#F4F7FB` (light) / `slate-900` (dark)
- Cards: `bg-white/95` with `backdrop-blur`
- Border radius: `rounded-[32px]` for cards, `rounded-2xl` for items

**Typography:**
- Headings: `font-extrabold`, `tracking-tight`
- Body: `text-slate-500`, `leading-relaxed`
- Labels: `text-[12px] font-semibold uppercase tracking-wider text-slate-400`

**Glass morphism:**
```css
bg-white/95 backdrop-blur-sm border border-white/60 shadow-2xl rounded-[32px]
```

---

## Build Notes

- `typescript.ignoreBuildErrors: true` is set in `next.config.ts` — this is intentional due to a pre-existing named export pattern from `courses/page.tsx`
- The `/api/*` → `http://localhost:4000/*` proxy rewrite is configured in `next.config.ts`
- Tailwind v4 uses `@import "tailwindcss"` instead of the v3 `@tailwind` directives

---

*Part of the SparkHub monorepo. See the root [README.md](../README.md) for full project documentation.*
