# crm-web

The Next.js frontend of the CRM platform. Pairs with a separate .NET API backend (separate repo, TBD).

## What's in here

A working Next.js 14 starter with:

- **App Router** (`src/app`) with route groups for auth and the dashboard shell
- **shadcn/ui** components (Button, Card, Badge, Input, Table, Avatar) + Tailwind 3
- **Clerk** for multi-tenant auth (Organizations, roles, invites)
- **Drizzle ORM** for MySQL (`omnc` shared with NetX) — schema sketch only, see `src/lib/db/schema.ts`
- **TanStack Query, Zod, date-fns, lucide-react** preinstalled
- **Customer Hub** vertical slice — list view with filters, status chips, mock data; profile detail page
- **Dashboard** with KPI cards and recent campaigns table
- Placeholder pages for every other Phase 1 section
- **Docker + GitLab CI** deployment files configured for the self-hosted Ubuntu + GitLab setup

## Stack decisions (locked)

| Concern | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Package manager | pnpm |
| Styling | Tailwind 3 + shadcn/ui |
| Auth | Clerk |
| ORM | Drizzle (MySQL) |
| Data fetching | TanStack Query |
| Validation | Zod |
| Icons | lucide-react |
| Date utils | date-fns |
| Hosting | Docker on Ubuntu, behind nginx |
| CI/CD | GitLab self-hosted + GitLab Runner |
| Backend API | Separate .NET 8 service (different repo) |

## Local setup

Prerequisites: Node 20+, pnpm 9+, access to the MySQL `omnc` database (or skip DB for now — the Customer Hub uses mock data).

```bash
# 1. Install deps
pnpm install

# 2. Set up env
cp .env.example .env.local
# Edit .env.local with real Clerk keys and DB connection
#   - Get Clerk keys at https://dashboard.clerk.com (create app, copy Publishable Key + Secret Key)
#   - DATABASE_URL only needed once Drizzle queries replace mock data

# 3. Run dev server
pnpm dev
# Open http://localhost:3000 — redirects to /dashboard
```

Without Clerk keys the auth guard will redirect everything to `/sign-in` and the Clerk widget will show a config error. To bypass during early UI work: temporarily disable the middleware by renaming `middleware.ts` to `middleware.ts.disabled`.

## Project layout

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, ClerkProvider
│   ├── page.tsx                      # Root → redirects to /dashboard
│   ├── globals.css                   # Tailwind + design tokens
│   ├── sign-in/[[...sign-in]]/       # Clerk-rendered sign-in
│   ├── sign-up/[[...sign-up]]/       # Clerk-rendered sign-up
│   └── (dashboard)/                  # Route group with sidebar + topbar layout
│       ├── layout.tsx                # AppShell wrapping every page
│       ├── dashboard/page.tsx        # KPIs + recent campaigns
│       ├── customers/
│       │   ├── page.tsx              # ← VERTICAL SLICE: list with filters
│       │   └── [id]/page.tsx         # Profile detail (mock)
│       ├── lists/page.tsx            # Placeholder
│       ├── segments/page.tsx         # Placeholder
│       ├── campaigns/page.tsx        # Placeholder
│       ├── automations/page.tsx      # Placeholder
│       ├── forms/page.tsx            # Placeholder
│       ├── analytics/page.tsx        # Placeholder
│       └── settings/integrations/    # Placeholder
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx               # Persistent left nav
│   │   └── topbar.tsx                # Search + Clerk UserButton + notifications
│   ├── customers/
│   │   ├── customer-filters.tsx      # Search + chip filters
│   │   └── customer-table.tsx        # The table component
│   ├── ui/                           # shadcn primitives
│   └── empty-state.tsx
├── lib/
│   ├── utils.ts                      # cn() helper, currency/date formatters
│   ├── db/
│   │   ├── index.ts                  # Drizzle client
│   │   └── schema.ts                 # Schema sketch (orgs, users, customers, lists, segments)
│   └── mock/
│       └── customers.ts              # Mock data backing the vertical slice
└── types/
    └── customer.ts
```

## What's wired vs what's not

**Wired and working:**
- Sidebar + topbar layout
- Clerk auth (when keys are configured)
- Customer Hub list with search and chip-filter logic (over mock data)
- Customer profile page reading the mock customer by id
- Dashboard with realistic-looking KPI cards
- Drizzle MySQL connection (waits for `DATABASE_URL`)

**Not yet wired:**
- Replacing mock customers with real Drizzle queries (next vertical slice step)
- API routes for any mutations (edit tags, VIP toggle, merge)
- Segment Builder (full UX TBD)
- Campaign Composer (multi-step wizard)
- Automation Editor (flow canvas)
- Email Builder (will embed Unlayer)
- Forms editor
- Settings screens
- The `/api/internal/agent/draft` and `/api/internal/agent/skills` routes that proxy to the NetX .NET service

## Next vertical slice

Replace the Customer Hub mock with real data:

1. Add the `customers`, `organizations`, `organization_members` tables to a Drizzle migration: `pnpm db:generate` → review the SQL → `pnpm db:migrate`.
2. Seed a few customer rows manually or import from `netx_orders` aggregation.
3. Create `src/app/(dashboard)/customers/page.tsx` server component that calls `db.select().from(customers)` and passes results into `<CustomerTable>`.
4. Move filters and search to URL search params so they're shareable.
5. Wire up tag and VIP edits via Server Actions.

After that: segment list + builder is the natural follow-up.

## Deployment to the Ubuntu app server

Three files included for the production deployment:

- **`Dockerfile`** — multi-stage build, produces a small standalone Node image
- **`docker-compose.yml`** — runs the container on the app server, listens on `127.0.0.1:3000`
- **`.gitlab-ci.yml`** — build, typecheck, push image to GitLab registry, SSH-deploy on main branch
- **`nginx.conf.example`** — reverse proxy with TLS termination
- **`crm-web.service.example`** — systemd alternative if not using Docker

To configure the pipeline, set these GitLab CI/CD variables in the project settings:

| Variable | Purpose |
|---|---|
| `DEPLOY_SSH_KEY` | Private SSH key for the deploy user on the app server |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan` for the app server |
| `DEPLOY_HOST` | The app server hostname or IP |
| `DEPLOY_USER` | The deploy user (e.g. `crm-deploy`) |
| All `.env.example` keys | All runtime secrets (Clerk, DB URL, NetX API token, etc.) |

GitLab Runner needs the Docker executor with privileged mode for the build-image job.

## Initialize Git + push to your GitLab

```bash
# In the unzipped crm-web/ directory:
git init -b main
git add .
git commit -m "Initial commit: Next.js 14 + shadcn/ui starter with Customer Hub slice"

# Replace with your GitLab namespace
git remote add origin git@your-gitlab.example.com:your-group/crm-web.git
git push -u origin main
```

If `pnpm install` produces a `pnpm-lock.yaml`, commit it. The Docker build expects a lockfile but works without it (just slower).

## Open decisions

These remain pending and affect specific features. None block initial UI work:

- **ESP** (SendGrid vs Resend vs SES) — affects the Send pipeline in the .NET API, not this repo directly
- **Email builder vendor** (Unlayer vs Stripo vs build) — affects Campaign Composer Step 3
- **Segment Builder library** (react-querybuilder vs custom) — affects the Segment Builder screen
- **Automation editor library** (react-flow vs custom) — affects the Automation Editor

## Related repos / docs

See the handoff package (`CRM_Handoff_Package.zip`) for the scoping doc, role split deck, screen inventory, and interactive wireframes that informed this starter.

The `.NET API` backend repo (TBD) hosts the REST endpoints this app calls.
