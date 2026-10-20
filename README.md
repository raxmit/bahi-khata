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

The feature pages and main API modules exist, but fresh local setup is not yet complete: an initial Prisma migration is authored but has not been applied to a disposable MySQL instance, and startup does not yet apply migrations/seed categories. Local MySQL is the source of truth; the initial product is single-owner, INR-only, and uses exact two-decimal amounts. The API must remain local-only until authentication and owner authorization are implemented and verified. See [adopted product decisions](docs/DECISION_BRIEF.md), the [project state report](docs/PROJECT_STATE.md), and the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

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

The Compose file defines the services, but a fresh database currently has no applied Prisma migration. Complete M1.4–M1.9 in the implementation plan before treating this as a working end-to-end setup.

For configuration, see `.env.docker.example` and `backend/.env.example`. These contain development-only values. Never reuse them as production credentials.

## AI-assisted development

Use Codex from the repository root. The root `AGENTS.md` defines the coordinator's workflow and human checkpoints. Codex can delegate independent frontend/backend tasks and ask a separate read-only quality reviewer to inspect the integrated changes. Routine code, tests, local builds, and review should proceed autonomously; product decisions, destructive data changes, and production actions remain human checkpoints. Before asking for approval at a checkpoint, the coordinator must show the proposed action, validation evidence and exact steps, concrete user-run validation instructions when applicable, risks, and rollback/recovery plan. If an action is blocked or the coordinator recommends against it, the coordinator must state the blocker and continue safe preparation instead of asking you to approve bypassing it.




