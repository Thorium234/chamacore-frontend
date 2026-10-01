# ChamaCore Frontend

A **consumer UI** for the ChamaCore FastAPI backend (https://github.com/Thorium234/Chamacore).

Built with Next.js (App Router), React 19, TypeScript, Axios, and Tailwind CSS 4.

## Getting Started

### Prerequisites

- Node.js 20+
- A running ChamaCore backend (default `http://localhost:8000`)

### Environment

Create `.env.local` in the repo root:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The backend must allow this frontend origin via `CHAMACORE_CORS_ORIGINS`
(defaults already include `http://localhost:3000`).

``` Run
# 1. Install all project dependencies listed in package.json
# Run this first when setting up the project or after pulling new changes
npm install

# 2. Start the local development server with hot-reloading
# Run this while actively writing and testing code (not for production)
npm run dev

# 3. Create an optimized production build
# Run this once to compile your application and check for build errors before deploying
npm run build

# 4. Start the production server
# Run this on your server after building to serve the production application
npm run start

```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

| Command           | Purpose                        |
|-------------------|--------------------------------|
| `npm run dev`     | Start the dev server (Turbopack) |
| `npm run build`   | Production build                |
| `npm run lint`    | ESLint                          |
| `npx tsc --noEmit`| Type-check the codebase         |

## Project layout

- `app/(auth)/` — login, register
- `app/(app)/` — dashboard, members, contributions, shares, ledger, loans, payouts, payments, audit, profile
- `features/` — feature modules (forms, lists, context providers)
- `lib/api/` — one shared Axios client + per-domain API modules
- `types/api.ts` — API contract types
- `docs/` — AGENTS.md, FRONTEND_SPEC.md, API_MAP.md, PHASES.md

## Rules

See `docs/AGENTS.md`: the backend owns authz, money, and idempotency — the
frontend never invents endpoints, payloads, statuses, or balances.
