# SparkHub

SparkHub is a full-stack platform for secondary students to discover STEM courses, join offline events, book tutoring sessions, explore opportunities, and access curated learning resources — all in one place.  

This documentation describes the `codex/add-new-features-and-ensure-functionality` branch.

---

## Features

### Learning & Courses
- **Courses & lessons** – Create and manage courses with ordered lessons (`Course`, `Lesson`).  
- **Enrollments** – Students can enroll into courses, tracked via `Enrollment`.  
- **Course chat / messages** – Lightweight course messaging via `CourseMessage`. [oai_citation:0‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

### Events & Community
- **Offline events** – Admins can publish in-person events with title, location, time range, capacity, description, and optional cover image/attachments (`Event`).  
- **Event sign-ups** – Users can reserve a spot and leave notes; each user can only sign up once per event (`EventSignup`). [oai_citation:1‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

### Tutoring & Sessions
- **Tutor profiles** – Users can expose a tutoring profile with bio and subjects (`TutorProfile`).  
- **1-on-1 sessions** – Bookable tutoring sessions between tutor and student, including status, notes, time window, and optional meeting link (`Session`).  
- **Tutor availability** – Store when tutors are available via `TutorAvailability`. [oai_citation:2‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

### Opportunities & Jobs
- **Job postings** – Recruiters can publish opportunities with skills, dates, benefits, images, and attachments (`JobPosting`).  
- **Applications** – Students apply to posted jobs via `JobApplication`, one application per user per job. [oai_citation:3‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

### Assessments & Certificates
- **Quizzes** – Course-linked quizzes with multiple-choice questions and pass score (`Quiz`, `QuizQuestion`).  
- **Attempts & scoring** – Store selected answers and whether the attempt passed (`QuizAttempt`).  
- **Certificates** – Issue unique certificate codes tying a user to a course (`Certificate`). [oai_citation:4‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

### Resources, Feedback & Admin
- **Resource library** – Curated links, files, and summaries stored as `Resource`.  
- **User feedback** – Topic-tagged feedback items with an open/closed status (`Feedback`).  
- **Audit logging** – Basic audit trail for user actions (`AuditLog`).  
- **Password reset** – Token-based password reset via `PasswordResetToken`. [oai_citation:5‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/prisma/schema.prisma)  

---

## Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router) [oai_citation:6‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/frontend/package.json)  
- **UI**: React 19, Tailwind CSS 4, Framer Motion, Lucide icons [oai_citation:7‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/frontend/package.json)  
- **Dev tooling**: TypeScript, ESLint, Next lint config [oai_citation:8‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/frontend/package.json)  

### Backend

- **Runtime**: Node.js (>= 18.18) [oai_citation:9‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/package.json)  
- **Framework**: Express 5  
- **ORM**: Prisma 5 with SQLite datasource (`DATABASE_URL = "file:./dev.db"`). [oai_citation:10‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/package.json)  
- **Security**: Helmet, CORS, HPP, compression, express-rate-limit. [oai_citation:11‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/package.json)  
- **Auth**: JWT + bcrypt for password hashing; password reset tokens. [oai_citation:12‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/package.json)  
- **Validation**: Zod for request payload validation. [oai_citation:13‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/package.json)  

The Express server wires up the API surface from separate route modules:  

- `/auth`, `/courses`, `/events`, `/tutors`, `/jobs`, `/quizzes`, `/availability`, `/feedback`, `/resources`, `/admin`, `/upload`, `/testing`. [oai_citation:14‡GitHub](https://github.com/TomAs-1226/SparkHub/raw/codex/add-new-features-and-ensure-functionality/backend/src/server.js)  

---

## Project Structure

```text
SparkHub/
  backend/        # Express + Prisma API
    prisma/       # Prisma schema & migrations
    src/          # Routes, security middleware, utilities
  frontend/       # Next.js 15 app
  .gitignore
  package-lock.json
