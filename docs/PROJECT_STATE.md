# Bahi Khata: Project State

**Reviewed:** 2026-10-22
**Review type:** Static repository inspection, frontend/backend checks, prior disposable MySQL/M1.9 validation, and M2.4 static migration review. M2.4 migration was not applied.
**Status vocabulary:** *Present* means code exists; it does not mean the flow is verified end to end.

## Executive summary

Bahi Khata is a two-part personal-finance application: an Angular SPA in `frontend/` and a NestJS REST API in `backend/`, with Prisma targeting MySQL. The repository contains UI pages and server-side building blocks for transactions, categories, filters, and summaries.

The adopted product baseline is MySQL as source of truth, single-owner, local-only API until authentication and owner authorization are implemented and verified, and INR amounts with exact two-decimal precision. These choices are recorded in [DECISION_BRIEF.md](DECISION_BRIEF.md), and the original requirements/design have been updated accordingly. The backend uses Prisma `Decimal(15,2)` and decimal-string API values; the frontend also uses decimal strings and exact formatting without JavaScript `number` conversion. M2.1 date semantics are adopted and implemented: strict civil dates, `Asia/Kolkata` today/future validation, ISO Monday–Sunday weeks, inclusive bounds, and overflow-safe navigation; see [M2.1](M2.1_DATE_DECISION_BRIEF.md).

The frontend test setup and stale assertion are repaired, and `/api` routing is configured for Angular development, Compose, and the example Nginx host. Local-only host binding and loopback Compose port publication are configured and Compose configuration parses successfully. Compose runs Prisma migrations and idempotent default-category seeding before Nest starts, then gates frontend startup on API readiness. M1.9 was exercised from the clean checkout at `d362c5f` against a new disposable Compose project and MySQL volume: headless Edge loaded the dashboard, showed all ten defaults, submitted one synthetic transaction through `/api`, and displayed it in the list and monthly summary. The browser recorded HTTP 201 for create and HTTP 200 for category, transaction, and summary requests; Prisma confirmed the row and seeded categories in MySQL. Earlier readiness checks verified healthy startup, not-ready response during a database outage, and recovery after MySQL restarted. No real financial data was used. Exact commands, results, transient harness failures, and cleanup are recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md#m1-9-end-to-end-local-verification).

M2.4 is implemented locally with required category IDs, a restrictive relation, type validation, custom-category rename, and reference-safe deletion. Prisma migration SQL is prepared and reviewed statically but remains unapplied; historical-label preflight and database-backed validation are pending. The user approved M2.4 behavior and code scope, but has not approved operations against the running Compose database.

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
| App shell and navigation | Lazy routes for four pages; responsive side/bottom navigation; toast component; `/api` dev proxy | M1.9 verified dashboard and same-origin browser requests through Compose to the real API/database; accessibility and viewport checks remain open |
| Transaction create/list/delete | API endpoints, repository, validator, create form, list, delete confirmation | M1.9 verified one synthetic create and list refresh through the UI/API/MySQL; M2.3 validates sparse PATCH requests; M2.4 code requires category IDs and type matches; migration and database behavior are not yet verified; no edit UI |
| Categories | API create/list/rename/delete; default categories protected; idempotent seed runs at local startup; sorted lists | M2.4 preserves category identity across rename and blocks deletion while referenced; migration is unapplied and user-facing transaction reassignment UI is not available |
| Filters | Backend supports type, category ID array, and inclusive date bounds | UI only filters local state by type/date; no category filter; API response changes shape to `{matches, hasResults}` when filters are passed |
| Insights | Weekly/monthly/yearly summary and monthly week breakdown on API and UI | M2.1 boundaries have focused tests in UTC and non-UTC host settings; broader UI/API journey coverage remains |
| Persistence | MySQL + Prisma; initial migration verified on disposable MySQL; amounts use Decimal(15,2) and exact decimal-string API values; Compose applies migration and seeds defaults; M1.9 verified one browser-created row in disposable MySQL | No authentication/owner authorization; broader journeys and existing-data migration/recovery remain unverified |
| API readiness | `GET /health/ready` performs `SELECT 1`; Compose health-checks API and starts frontend only after readiness | Endpoint reports database reachability, not full application or frontend readiness |
| Validation and errors | DTO validation, domain validator, exception filter, frontend interceptor/toasts | M2.2 transaction field rules and M2.3 merged PATCH validation have focused 400-path tests; some other error paths remain inconsistently surfaced and app state logs raw request errors |
| Reset/recovery | No reset UI/endpoint found | Requirement remains unimplemented; safe reset semantics must be defined before implementation |
| Accessibility/responsive behavior | Responsive layout rules and some ARIA labels | No demonstrated viewport, keyboard, or screen-reader verification |
| CI / engineering checks | Workflow checks backend lint/test/build and frontend test/build plus npm audit | Local frontend/backend suites pass after recent changes; no successful remote run for the current commit has been verified; no branch protection is evidenced |

## Findings that should shape the first tasks

### P0: startup and integration blockers

1. The initial migration creates the expected schema on a fresh disposable MySQL 8 database. Compose migrations/seeding and database-aware API readiness have been verified on a disposable stack. M1.9 verified the create/list/dashboard journey through the browser, real API, and disposable MySQL; other transaction journeys remain unverified.
2. The API has no authentication or owner authorization. Host processes default to loopback and Compose ports are configured to publish on host loopback. Do not expose the API or database to a network.

### P1: correctness and product safety

4. M2.3 now validates merged PATCH state. M2.4 changes category request identity from free-text names to stable IDs; its migration has not been run and existing-data mapping remains unverified.
5. The backend filter endpoint returns a bare `Transaction[]` without criteria, but returns `FilterResult` when criteria exist. This is an unstable response contract for API clients.
6. M2.4 introduces a required category ID foreign key and keeps the label snapshot for rollback compatibility. The migration only backfills exact name/type matches and must be preflighted; no unresolved records have been inventoried.
7. Amounts now use Prisma `Decimal(15,2)` and canonical decimal strings at the API boundary. The initial migration needs a reviewed compatibility plan for any existing Float data; do not convert persistent data without inventory, backup, and recovery review.
8. Single-owner scope is adopted, but authentication and owner authorization are not implemented. Local-only exposure is a temporary safety boundary, not production security.
9. `backend/src/app.module.ts` has placeholder observation credentials (`YOUR_APP_KEY`, `YOUR_APP_SECRET`). Confirm whether the instrumentation is configured, disabled safely, or must use environment secrets.

## Tests found

- Backend unit: 95 tests across 16 files, including exact amount/date regressions, DTO and controller validation, category ID integrity, repository mapping, filters/summaries, fresh/repeated seeding, readiness, and safe startup failure behavior.
- Backend e2e: one root-route test that imports the full application module.
- Frontend unit: 14 tests across 4 files, including civil-date boundary behavior, exact INR validation/formatting, app shell, and API route coverage.
- Focused backend validator, DTO, controller, repository, filter, and summarizer tests now exist; component-level and broader HTTP contract coverage remains limited.
- No property-based tests were found despite `fast-check` being a dependency and tests being described in the design/task spec.

## Operational facts

- Root README, adopted product decision brief, and release readiness report are present.
- Development Dockerfiles use Node 24 Alpine, matching CI's Node 24 runtime. Backend image installs OpenSSL for Prisma; Compose reads synthetic settings from the ignored root `.env`, and backend/frontend build contexts exclude environment files. Published ports bind to loopback; production credentials must come from a secret store if deployment is reconsidered later.
- Before the M1.9 documentation update, `git status -sb` reported a clean `main` at `d362c5f`, matching `origin/main`. M1.9 changed project documentation only; no application code, dependencies, push, or deployment were involved.

## Verification boundary

This report combines source/configuration inspection with local check results recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md). Backend lint/tests/build and frontend tests/build pass locally. Compose config, disposable migrations/seeding, API readiness startup/outage/recovery, and the single M1.9 browser create/list/dashboard journey through the real API/database pass. Remote CI, staging, backup restoration, rollback, and broader user journeys remain unverified. A configured CI workflow is not evidence that it has passed.

## M2.1 date policy implementation

Backend and frontend use strict Gregorian `YYYY-MM-DD` civil-date validation and calendar arithmetic. `Asia/Kolkata` determines today and future-date validation. Weekly summaries use inclusive Monday–Sunday bounds; month/year and filters include both calendar endpoints; monthly ISO week buckets are clipped to their month. Insights navigation uses canonical period starts, so month/year changes cannot overflow from day 29–31. Prisma continues to map the field to MySQL `DATE`; no migration was created. Exact test, lint, and build evidence is in [RELEASE_READINESS.md](RELEASE_READINESS.md#m21-date-policy).

