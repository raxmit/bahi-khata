# Bahi Khata: Project State

**Reviewed:** 2026-10-21  
**Review type:** Static repository inspection plus recorded frontend/backend checks and disposable MySQL migration validation.
**Status vocabulary:** *Present* means code exists; it does not mean the flow is verified end to end.

## Executive summary

Bahi Khata is a two-part personal-finance application: an Angular SPA in `frontend/` and a NestJS REST API in `backend/`, with Prisma targeting MySQL. The repository contains UI pages and server-side building blocks for transactions, categories, filters, and summaries.

The adopted product baseline is MySQL as source of truth, single-owner, local-only API until authentication and owner authorization are implemented and verified, and INR amounts with exact two-decimal precision. These choices are recorded in [DECISION_BRIEF.md](DECISION_BRIEF.md), and the original requirements/design have been updated accordingly. The backend uses Prisma `Decimal(15,2)` and decimal-string API values; the frontend also uses decimal strings and exact formatting without JavaScript `number` conversion.

The frontend test setup and stale assertion are repaired, and `/api` routing is configured for Angular development, Compose, and the example Nginx host. Local-only host binding and loopback Compose port publication are configured and Compose configuration parses successfully. The local dev proxy was exercised against a synthetic mock. Compose now runs Prisma migrations and idempotent default-category seeding before Nest starts. On a fresh tmpfs-only MySQL test database, initialization applied the migration and created ten defaults; a repeat completed with no pending migrations and left ten defaults. The disposable container was removed. No real financial data was used.

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
| Categories | API create/list/delete; default categories protected; idempotent seed runs at local startup; sorted lists | Category-to-transaction relationship is a free-text label; no reassignment flow |
| Filters | Backend supports type, category array, and inclusive date bounds | UI only filters local state by type/date; no category filter; API response changes shape to `{matches, hasResults}` when filters are passed |
| Insights | Weekly/monthly/yearly summary and monthly week breakdown on API and UI | No focused tests; date and timezone boundary behavior needs a defined policy and verification |
| Persistence | MySQL + Prisma; initial migration verified on disposable MySQL; amounts use Decimal(15,2) and exact decimal-string API values; Compose applies migration and seeds defaults | No authentication/owner authorization; full browser-to-real-API/DB journey remains unverified |
| Validation and errors | DTO validation, domain validator, exception filter, frontend interceptor/toasts | Error paths are inconsistently surfaced; app state logs raw request errors; note truncation notification is absent |
| Reset/recovery | No reset UI/endpoint found | Requirement remains unimplemented; safe reset semantics must be defined before implementation |
| Accessibility/responsive behavior | Responsive layout rules and some ARIA labels | No demonstrated viewport, keyboard, or screen-reader verification |
| CI / engineering checks | Workflow checks backend lint/test/build and frontend test/build plus npm audit | Local frontend/backend suites pass after recent changes; no successful remote run for the current commit has been verified; no branch protection is evidenced |

## Findings that should shape the first tasks

### P0: startup and integration blockers

1. The initial migration creates the expected schema on a fresh disposable MySQL 8 database. Compose runs migrations and seeds categories before starting Nest. Full app startup and browser-to-database flows remain to be verified.
2. The API has no authentication or owner authorization. Host processes default to loopback and Compose ports are configured to publish on host loopback. Do not expose the API or database to a network.

### P1: correctness and product safety

4. `TransactionsController.update()` passes only present fields into `validateTransaction()`, which checks all required fields. A partial PATCH such as `{ "note": "..." }` is therefore rejected for missing amount/type/category/date. Define partial-update semantics and validate provided fields accordingly.
5. The backend filter endpoint returns a bare `Transaction[]` without criteria, but returns `FilterResult` when criteria exist. This is an unstable response contract for API clients.
6. Transaction category is stored as a string; deleting a category keeps old transaction labels. This supports “retain” behavior, but not reassignment or referential integrity.
7. Amounts now use Prisma `Decimal(15,2)` and canonical decimal strings at the API boundary. The initial migration needs a reviewed compatibility plan for any existing Float data; do not convert persistent data without inventory, backup, and recovery review.
8. Single-owner scope is adopted, but authentication and owner authorization are not implemented. Local-only exposure is a temporary safety boundary, not production security.
9. `backend/src/app.module.ts` has placeholder observation credentials (`YOUR_APP_KEY`, `YOUR_APP_SECRET`). Confirm whether the instrumentation is configured, disabled safely, or must use environment secrets.

## Tests found

- Backend unit: 16 tests across 4 files, including exact amount regressions and fresh/repeated default-category seeding.
- Backend e2e: one root-route test that imports the full application module.
- Frontend unit: 8 tests across 3 files, including exact INR validation and formatting; app shell and API route coverage.
- No focused validator, repository, filter, summarizer, component, or API contract tests were found.
- No property-based tests were found despite `fast-check` being a dependency and tests being described in the design/task spec.

## Operational facts

- Root README, adopted product decision brief, and release readiness report are present.
- Root `.env.example` contains synthetic development connection details. Compose host ports bind to loopback; keep credentials local-only. Backend/frontend Docker build contexts exclude environment files. Production credentials must come from a secret store/environment if deployment is reconsidered later.
- Development Dockerfiles use Node 24 Alpine, matching CI's Node 24 runtime. Root `.env.example` contains synthetic local-only settings; Compose requires the copied ignored `.env`, and Docker build contexts exclude env files. The disposable test Compose file uses separate synthetic test credentials and tmpfs.
- The repository is on `main` at `5bb21f9` (`Initialize local database and seed defaults`), one commit ahead of `origin/main`, with local M1.6 changes pending. No push was performed.

## Verification boundary

This report combines source/configuration inspection with local check results recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md). Backend lint/tests/build and frontend tests/build pass locally. Compose config and disposable MySQL migration application pass. Full Compose app startup, frontend-to-real-API/database flow, remote CI, staging, backup restoration, and rollback remain unverified. A configured CI workflow is not evidence that it has passed.

