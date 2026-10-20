# Bahi Khata

Bahi Khata is a personal finance tracker for recording income and expenses, organizing entries by category, and viewing filtered lists and period summaries.

## Repository layout

- `frontend/` — Angular 21 single-page application.
- `backend/` — NestJS REST API, Prisma schema/seed, and MySQL persistence.
- `docker-compose.yml` — local frontend, backend, and MySQL services.
- `docker-compose.test.yml` — temporary MySQL service for integration testing.
- `.kiro/specs/personal-finance-tracker/` — original product requirements, design, and initial task checklist.
- `docs/PROJECT_STATE.md` — current implementation and integration audit.
- `docs/RELEASE_READINESS.md` — production deployment blockers and recorded local check results.
- `docs/IMPLEMENTATION_PLAN.md` — prioritized, incremental backlog and product decision gates.
- `AGENTS.md` and `.codex/` — coordinator/subagent workflow and quality/security rules.

## Current project status

The feature pages and main API modules exist. Compose startup applies checked-in Prisma migrations and idempotently seeds default categories before starting the API. Local MySQL is the source of truth; the initial product is single-owner, INR-only, and uses exact two-decimal amounts. The API must remain local-only until authentication and owner authorization are implemented and verified. See [adopted product decisions](docs/DECISION_BRIEF.md), the [project state report](docs/PROJECT_STATE.md), and the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

Transaction dates are strict `YYYY-MM-DD` civil dates stored as MySQL `DATE`. The app uses `Asia/Kolkata` for today/future validation, ISO Monday–Sunday weeks, inclusive calendar/filter bounds, and overflow-safe Insights period navigation. No date schema migration is needed; boundary tests and exact commands are recorded in [M2.1 date policy](docs/RELEASE_READINESS.md#m21-date-policy).

Use synthetic financial records in development and tests. Do not expose the API or database to a network or enter real records until authentication and owner authorization are implemented and verified. Lightsail deployment is deferred until all release-readiness gates are complete and separately approved.

## Prerequisites

- Node.js 24.x, matching CI and the development Docker images.
- npm 11 compatible with the checked-in lockfiles.
- Docker Desktop / Docker Engine and Docker Compose for the full local stack.

## Configure local Compose values

From the repository root, create the ignored local Compose environment file:

```powershell
Copy-Item .env.example .env
```

`.env.example` contains synthetic development-only MySQL credentials and connection settings. `.env` is ignored by Git, and backend/frontend Docker build contexts exclude environment files. Keep these values local, change the sample values for your machine if needed, and keep `COMPOSE_DATABASE_URL` in sync with the MySQL database/user/password. Do not put production credentials or real financial data in these files. The Compose stack binds all published service ports to `127.0.0.1`.

## Install dependencies

```powershell
cd backend
npm ci
cd ..\frontend
npm ci
```

## Run checks

```powershell
cd backend
npm test
npm run lint
npm run build
```

```powershell
cd frontend
npm test -- --watch=false
npm run build
```

The frontend suite now includes app-shell, `/api` routing, and exact INR behavior tests. See [release readiness](docs/RELEASE_READINESS.md) for the exact local check results and remaining integration blockers.

## Run locally

After creating `.env`, validate and start the local stack from the repository root:

```powershell
docker compose config
docker compose up --build --renew-anon-volumes
```

The backend startup sequence runs `npm run db:init` before launching NestJS. To initialize a database manually from `backend/`, run `npm run db:init`; it executes `prisma migrate deploy` followed by `prisma db seed`. Both operations are repeatable: migrations apply only pending migrations, and category seeding uses the unique `(name, type)` key with `upsert`.

To exercise clean and repeated initialization using only a disposable database, start the temporary MySQL service from the repository root, then run the initialization command twice from `backend/`:

```powershell
docker compose -f docker-compose.test.yml up -d --wait
cd backend
$env:DATABASE_URL = 'mysql://pfuser:test_only_pf_password@127.0.0.1:3307/pftracker_test'
npm run db:init
npm run db:init
```

Expected result: the first run applies the initial migration and creates ten default categories; the second reports no pending migrations and leaves exactly ten defaults. Stop and remove this disposable service afterward with `docker compose -f docker-compose.test.yml down` from the repository root. The test service binds to host loopback and uses a temporary filesystem with no persistent volume. Do not point these commands at any database containing user data.

Compose waits for MySQL health before the backend runs migrations and seeds, then waits for API readiness before starting the frontend. Backend readiness checks MySQL with a lightweight `SELECT 1` query. `GET http://127.0.0.1:3000/health/ready` returns HTTP 200 with `{"status":"ready"}` when MySQL is reachable, or HTTP 503 with `{"status":"not_ready"}` when it is unavailable. The response does not include connection details. The backend logs a generic startup warning if the initial database connection fails and stays available for readiness probes. All published ports remain bound to host loopback. The M1.9 dashboard/category/create/list/summary journey was verified against a disposable MySQL database; see [recorded commands and results](docs/RELEASE_READINESS.md#m1-9-end-to-end-local-verification). Broader journeys and production-readiness checks are still outstanding.

The disposable test database uses separate synthetic credentials in `docker-compose.test.yml`, stores MySQL data in tmpfs, and binds only to `127.0.0.1:3307`.

## AI-assisted development

Use Codex from the repository root. The root `AGENTS.md` defines the coordinator's workflow and human checkpoints. Codex can delegate independent frontend/backend tasks and ask a separate read-only quality reviewer to inspect the integrated changes. Routine code, tests, local builds, and review should proceed autonomously; product decisions, destructive data changes, and production actions remain human checkpoints. Before asking for approval at a checkpoint, the coordinator must show the proposed action, validation evidence and exact steps, concrete user-run validation instructions when applicable, risks, and rollback/recovery plan. If an action is blocked or the coordinator recommends against it, the coordinator must state the blocker and continue safe preparation instead of asking you to approve bypassing it.




