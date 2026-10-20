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

Use synthetic financial records in development and tests. Do not expose the API or database to a network or enter real records until authentication and owner authorization are implemented and verified. Lightsail deployment is deferred until all release-readiness gates are complete and separately approved.

## Prerequisites

- Node.js 24.x (align Dockerfiles with this runtime as tracked in the plan).
- npm 11 compatible with the checked-in lockfiles.
- Docker Desktop / Docker Engine and Docker Compose for the full local stack.

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

The intended full stack is:

```powershell
docker compose up --build
```

The backend startup sequence runs `npm run db:init` before launching NestJS. To initialize a database manually from `backend/`, run `npm run db:init`; it executes `prisma migrate deploy` followed by `prisma db seed`. Both operations are repeatable: migrations apply only pending migrations, and category seeding uses the unique `(name, type)` key with `upsert`.

To exercise clean and repeated initialization using only a disposable database, start the temporary MySQL service from the repository root, then run the initialization command twice from `backend/`:

```powershell
docker compose -f docker-compose.test.yml up -d --wait
cd backend
$env:DATABASE_URL = 'mysql://pfuser:pfpass@127.0.0.1:3307/pftracker_test'
npm run db:init
npm run db:init
```

Expected result: the first run applies the initial migration and creates ten default categories; the second reports no pending migrations and leaves exactly ten defaults. Stop and remove this disposable service afterward with `docker compose -f docker-compose.test.yml down` from the repository root. The test service binds to host loopback and uses a temporary filesystem with no persistent volume. Do not point these commands at any database containing user data.

The normal local stack starts with `docker compose up --build`. Compose waits for MySQL health before the backend runs migrations and seeds; API/database published ports remain bound to host loopback. Complete M1.6–M1.9 before treating this as fully end-to-end verified.

For configuration, see `.env.docker.example` and `backend/.env.example`. These contain development-only values. Never reuse them as production credentials.

## AI-assisted development

Use Codex from the repository root. The root `AGENTS.md` defines the coordinator's workflow and human checkpoints. Codex can delegate independent frontend/backend tasks and ask a separate read-only quality reviewer to inspect the integrated changes. Routine code, tests, local builds, and review should proceed autonomously; product decisions, destructive data changes, and production actions remain human checkpoints. Before asking for approval at a checkpoint, the coordinator must show the proposed action, validation evidence and exact steps, concrete user-run validation instructions when applicable, risks, and rollback/recovery plan. If an action is blocked or the coordinator recommends against it, the coordinator must state the blocker and continue safe preparation instead of asking you to approve bypassing it.




