# Bahi Khata: Project State

**Reviewed:** 2026-10-21  
**Review type:** Static repository inspection plus recorded local frontend checks and backend decimal checks.  
**Status vocabulary:** *Present* means code exists; it does not mean the flow is verified end to end.

## Executive summary

Bahi Khata is a two-part personal-finance application: an Angular SPA in `frontend/` and a NestJS REST API in `backend/`, with Prisma targeting MySQL. The repository contains UI pages and server-side building blocks for transactions, categories, filters, and summaries.

The adopted product baseline is MySQL as source of truth, single-owner, local-only API until authentication and owner authorization are implemented and verified, and INR amounts with exact two-decimal precision. These choices are recorded in [DECISION_BRIEF.md](DECISION_BRIEF.md), and the original requirements/design have been updated accordingly. The backend uses Prisma `Decimal(15,2)` and decimal-string API values; the frontend also uses decimal strings and exact formatting without JavaScript `number` conversion.

The frontend test setup and stale assertion are repaired, and `/api` routing is configured for Angular development, Compose, and the example Nginx host. Local-only host binding and loopback Compose port publication are configured and Compose configuration parses successfully. The local dev proxy was exercised against a synthetic mock. A generated initial migration now creates the two tables with `DECIMAL(15,2)`, but it has not been applied to a disposable MySQL instance. Docker cannot access its Desktop engine in this environment. No real financial data was used.

## Architecture as found

```text
Angular 21 SPA (frontend/)
  ├── Dashboard, Transactions, Insights, Categories
  ├── BehaviorSubject app state and HttpClient services
  └── requests to /api/transactions, /api/categories, /api/summary
                         │ HTTP/JSON (same-origin /api via dev proxy)
NestJS 12 API (backend/)
  ├── transaction/category/summary controllers
  ├── validator, filter engine, summarizer services
  └── repositories → Prisma Client → MySQL
```

The root `docker-compose.yml` defines MySQL, Nest, and Angular containers. `docker-compose.test.yml` defines a temporary MySQL service. The repository has a Codex `AGENTS.md`, three custom agent definitions, and a GitHub Actions CI workflow. There is no production deployment workflow in the checked-in files.

## Feature status

| Area | Present in code | Main gap before it is dependable |
|---|---|---|
| App shell and navigation | Lazy routes for four pages; responsive side/bottom navigation; toast component; `/api` dev proxy | Proxy runtime verified with mock; routing through the real API/database remains unverified |
| Transaction create/list/delete | API endpoints, repository, validator, create form, list, delete confirmation | No edit UI; no focused feature tests; backend PATCH validation currently treats partial input as missing required fields |
| Categories | API create/list/delete; default categories protected; seed script; sorted lists | Category-to-transaction relationship is a free-text label; no reassignment flow; seed does not run in Compose |
| Filters | Backend supports type, category array, and inclusive date bounds | UI only filters local state by type/date; no category filter; API response changes shape to `{matches, hasResults}` when filters are passed |
| Insights | Weekly/monthly/yearly summary and monthly week breakdown on API and UI | No focused tests; date and timezone boundary behavior needs a defined policy and verification |
| Persistence | MySQL + Prisma; initial generated migration; amounts use Decimal(15,2) and exact decimal-string API values | Migration not verified on disposable MySQL; fresh startup does not apply migrations/seed; no authentication/owner authorization |
| Validation and errors | DTO validation, domain validator, exception filter, frontend interceptor/toasts | Error paths are inconsistently surfaced; app state logs raw request errors; note truncation notification is absent |
| Reset/recovery | No reset UI/endpoint found | Requirement remains unimplemented; safe reset semantics must be defined before implementation |
| Accessibility/responsive behavior | Responsive layout rules and some ARIA labels | No demonstrated viewport, keyboard, or screen-reader verification |
| CI / engineering checks | Workflow checks backend lint/test/build and frontend test/build plus npm audit | Local frontend/backend suites pass after recent changes; no remote run exists because there is no release commit; no branch protection is evidenced |

## Findings that should shape the first tasks

### P0: startup and integration blockers

1. `backend/prisma/migrations/` contains an initial SQL migration generated from the current schema. It has not been tested against MySQL. Compose starts MySQL and the API but has no migration/seed command. A clean database will not initialize itself yet.
2. The API has no authentication or owner authorization. Host processes default to loopback and Compose ports are published on host loopback, but Compose/runtime exposure is not yet verified in an available Docker engine. Do not expose the API or database to a network.
3. `docker info` cannot access the Docker Desktop pipe. This blocks disposable-MySQL migration validation; `prisma migrate diff` did successfully generate the schema-only SQL preview.

### P1: correctness and product safety

4. `TransactionsController.update()` passes only present fields into `validateTransaction()`, which checks all required fields. A partial PATCH such as `{ "note": "..." }` is therefore rejected for missing amount/type/category/date. Define partial-update semantics and validate provided fields accordingly.
5. The backend filter endpoint returns a bare `Transaction[]` without criteria, but returns `FilterResult` when criteria exist. This is an unstable response contract for API clients.
6. Transaction category is stored as a string; deleting a category keeps old transaction labels. This supports “retain” behavior, but not reassignment or referential integrity.
7. Amounts now use Prisma `Decimal(15,2)` and canonical decimal strings at the API boundary. The initial migration needs a reviewed compatibility plan for any existing Float data; do not convert persistent data without inventory, backup, and recovery review.
8. Single-owner scope is adopted, but authentication and owner authorization are not implemented. Local-only exposure is a temporary safety boundary, not production security.
9. `backend/src/app.module.ts` has placeholder observation credentials (`YOUR_APP_KEY`, `YOUR_APP_SECRET`). Confirm whether the instrumentation is configured, disabled safely, or must use environment secrets.

## Tests found

- Backend unit: 14 tests across 3 files after amount validation and exact summary regression tests were added.
- Backend e2e: one root-route test that imports the full application module.
- Frontend unit: 8 tests across 3 files, including exact INR validation and formatting; app shell and API route coverage.
- No focused validator, repository, filter, summarizer, component, or API contract tests were found.
- No property-based tests were found despite `fast-check` being a dependency and tests being described in the design/task spec.

## Operational facts

- Root README, adopted product decision brief, and release readiness report are present.
- Root `.env.docker.example` contains development connection details. Compose host ports bind to loopback; keep credentials local-only. Production credentials must come from a secret store/environment if deployment is reconsidered later.
- Dockerfiles use Node 20 Alpine while CI is configured for Node 24. Angular 21's declared supported range includes Node 24; align container and CI runtime versions as part of setup hardening.
- `.git` was initialized locally and `origin` was attached. The branch rename to `main` did not complete because this environment blocked writes under `.git`; current `HEAD` still pointed at `master` at the time of review. This is workspace setup, not application code.

## Verification boundary

This report combines source/configuration inspection with local check results recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md). Backend lint/tests/build and frontend tests/build pass locally. Compose config and schema-only migration SQL generation pass, but migration application, API-to-database startup, Docker runtime exposure, remote CI, staging, backup restoration, and rollback remain unverified. A configured CI workflow is not evidence that it has passed.

