# HotFix — IT Helpdesk & Ticketing System

A full-stack IT helpdesk application built to demonstrate enterprise-grade engineering practices: role-based access control, immutable audit logging, and a complete ticket lifecycle — all deployed on Vercel.

**Live demo:** https://hotfix-eta.vercel.app

---

## Features

- **Ticket lifecycle management** — create, assign, update status (open → in progress → resolved/closed), set priority and category
- **Role-based access control (RBAC)**

  | Role | Create Tickets | View All Tickets | Update Any Ticket | Assign Technician | Admin Panel |
  |------|:-:|:-:|:-:|:-:|:-:|
  | `end_user` | ✓ | own only | own only | — | — |
  | `technician` | ✓ | ✓ | ✓ | — | — |
  | `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |

- **Immutable audit trail** — every field change (status, priority, assignee) recorded with before/after values, timestamp, and actor
- **Internal comments** — threaded comments per ticket with author attribution
- **Admin panel** — promote/demote user roles, view all registered users
- **Dashboard** — live stats (open, in progress, resolved, critical) and recent ticket feed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Auth | Clerk (hosted sign-in/sign-up, session management) |
| Database | Neon (serverless PostgreSQL) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS v4 |
| E2E Tests | Playwright |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/HotFix.git
cd HotFix
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Playwright (for E2E tests only)
TEST_USER_EMAIL=your@email.com
```

### 3. Apply the database schema

Copy the contents of `neon/schema.sql` and run it in the Neon SQL editor (or any Postgres client connected to your database).

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to Clerk sign-in on first visit.

### 5. Promote yourself to admin

After signing in for the first time, run this in the Neon SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Architecture

### Database schema

```
profiles          — Clerk user ID (TEXT PK), email, full_name, role, department
tickets           — id (UUID), title, description, status, priority, category,
                    created_by → profiles, assigned_to → profiles, timestamps
ticket_comments   — id, ticket_id → tickets, author_id → profiles, body, created_at
ticket_audit      — id, ticket_id → tickets, changed_by → profiles,
                    changes (JSONB), created_at
```

### RBAC enforcement

All access control is enforced server-side in API route handlers (`src/app/api/`). The client never receives privileged data it shouldn't see — roles are checked on every request using the authenticated Clerk session.

### Audit logging

Every `PATCH /api/tickets/[id]` call computes a diff of changed fields and inserts a row into `ticket_audit` with `changes: { field: { from, to } }`. The audit table is append-only — no updates or deletes are issued against it.

### Server vs. Client Components

| Component type | Used for |
|----------------|---------|
| Server Components | Data fetching, page layouts, initial render |
| Client Components | Interactive UI (dropdowns, comment form, role selector) |
| Route Handlers | REST API consumed by client components |

---

## Running Tests

### Prerequisites

Add to `.env.local`:

```env
TEST_USER_EMAIL=your@email.com
```

The test suite authenticates via Clerk sign-in tokens (no password needed — the Clerk backend SDK issues a one-time token directly).

Install Playwright browsers (first time only):

```bash
npx playwright install chromium
```

### Commands

```bash
npm test              # run all E2E tests headlessly
npm run test:ui       # open Playwright UI mode
npm run test:report   # view last HTML report
```

Screenshots are saved to `e2e/screenshots/` on every test run.

### Test coverage

| Suite | Tests |
|-------|-------|
| Dashboard | Stat cards, recent tickets list, New Ticket button, View All link |
| Tickets list | Table render, status filter, priority filter, click-through to detail |
| New Ticket | Form fill → submit → redirect to detail page |
| Ticket detail | Comments tab, audit trail tab, post comment, sidebar metadata |
| Admin panel | User table, role permissions card, navbar links |
| Navigation | Navbar on all pages, unauthenticated redirect to sign-in |

---

## Deployment

The app is deployed to Vercel with environment variables set via the Vercel dashboard.

```bash
vercel --prod   # deploy to production
```

Required env vars on Vercel: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Drizzle schema changes to Neon |
| `npm test` | Run Playwright E2E tests |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:report` | Open last HTML test report |
