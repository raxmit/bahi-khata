# Bahi Khata: Incremental Implementation Plan

This is the active execution backlog for turning the current prototype into a dependable personal finance app. Tasks are intentionally small and independently reviewable. Status begins as **Todo**; update it only after the acceptance checks pass. Keep product decisions visible instead of resolving them silently in implementation.

## Planning rules

- Work in dependency order. Each task should produce one reviewable behavior, safeguard, or documentation result.
- Every behavior change includes focused automated coverage. Prefer pure service tests first, then API integration tests, then UI tests for the user journey.
- Backend remains the authority for validation and access control.
- Use synthetic test data only. Database work must target a disposable local/test database.
- The coordinator owns integration and final review. Frontend and backend agents may work in parallel only after a shared API contract is agreed. `quality_reviewer` reviews the integrated diff read-only.
- Human input is reserved for the decision gates below, destructive data operations, and production actions.
- Never ask for approval to perform an action the coordinator recommends against or that has unresolved safety prerequisites. Continue safe readiness work autonomously. Separate approval of a product decision from approval to execute a production action; request release approval only when the candidate and evidence are ready. At each checkpoint, the coordinator presents the concrete proposal, scope, validation evidence and exact validation steps, user-run validation instructions when applicable (concrete commands/screens, where to run them, plus expected results), material risks, and rollback/recovery plan, then asks for explicit approval. If prerequisites or targets are unknown, mark the action blocked and continue safe preparation; never ask the user to approve proceeding in spite of a blocker. Never execute a destructive or production/external action before approval.
- Do not enable production deployment from CI. Release remains a deliberate human checkpoint.

## Current product decision gates

These questions materially affect architecture. The coordinator should prepare a concise recommendation with impact and defer only dependent work. Before requesting a decision, include current evidence, proposal, affected scope, validation steps with expected results, user-run validation instructions when applicable, material risks, and rollback/recovery implications. Safe independent work can continue while a decision is pending.

| Decision | Options to evaluate | Needed before |
|---|---|---|
| **D-01 Persistence model** | **Adopted:** MySQL is the sole source of truth; browser storage is not authoritative | Data model, backup/recovery, deployment |
| **D-02 Account and access model** | **Adopted:** single owner; API remains local-only until authentication and owner authorization are implemented and verified | Any network exposure |
| **D-03 Currency and amount precision** | **Adopted:** INR, two fractional digits; MySQL `DECIMAL(15,2)`/Prisma `Decimal`; decimal strings in JSON | Schema, validation, arithmetic, summaries |
| **D-04 Initial deployment scope** | **Adopted:** local-only implementation; defer Lightsail until end-to-end, security, migration, CI, staging, backup, and rollback gates pass | Infrastructure and production release plan |

**Safety boundary:** The API and database are local-only. Do not expose them to a network until authentication and owner authorization are implemented and verified. Use synthetic data in development and tests.

## Milestone map

| Milestone | Goal | Depends on | Exit condition |
|---|---|---|---|
| M0. Baseline and decisions | Resolve product contradictions and capture reproducible baseline | None | D-01 through D-04 recorded; tests/build baseline known |
| M1. Fresh local startup | A new checkout starts with a schema, seed data, and working browser-to-API requests | M0 where persistence affects setup | Clean local setup instructions work from scratch |
| M2. Financial and API correctness | Validation, amounts, dates, categories, filters, and summaries have stable semantics | M0, M1 | Focused backend and API contract tests pass |
| M3. Complete core journeys | User can create, edit, delete, filter, categorize, and inspect transactions end to end | M1, M2 | Each journey verified from Angular through API to database |
| M4. Privacy and security | Data is protected according to chosen account/deployment scope | D-02, D-04; M2 | Threat model findings addressed; access boundaries tested |
| M5. Reliability and accessibility | Loading/error/recovery behavior and accessibility are consistent | M3 | UI states and target viewports/keyboard paths checked |
| M6. Release readiness | Repeatable CI, operational documentation, backup and recovery plan | M1-M5 | CI green; human release checklist approved before deployment |

## M0 — Baseline and product decisions

### M0.1 Record existing baseline

- **Task:** Capture current test, lint, build, Docker, and migration status without modifying feature code.
- **Owner:** Coordinator; agents can inspect frontend/backend independently.
- **Acceptance:** `docs/PROJECT_STATE.md` records commands run, exit codes, known failures, and environment prerequisites. Do not mark source-inspection as a passing runtime check.
- **Depends on:** None.

### M0.2 Record persistence source of truth (D-01) — Decision adopted

- **Task:** Record MySQL as the source of truth and document backup/recovery expectations, offline behavior, and migration implications.
- **Owner:** Coordinator prepares recommendation; user decides if choices remain material.
- **Acceptance:** One architecture decision record states the chosen model and explicitly updates the conflicting requirements/design references.
- **Depends on:** None.

### M0.3 Record user/account boundary (D-02) — Decision adopted

- **Task:** Define whether this app is local single-user, private single-owner, or multi-user. Define what unauthenticated requests may read or write.
- **Acceptance:** Single-owner scope and local-only-until-authenticated constraint are written down, including server-side owner authorization before network exposure.
- **Depends on:** None.

### M0.4 Record currency semantics (D-03) — Decision adopted

- **Task:** Define currency code/locale, allowed precision, rounding, and whether cross-currency records are supported.
- **Acceptance:** INR, two fractional digits, exact Prisma/MySQL decimal representation, decimal-string API, and amount range are documented.
- **Depends on:** None.

### M0.5 Record deployment scope (D-04) — Decision adopted

- **Task:** Define local-only/private/public deployment target, expected operators, and whether deployment is in scope for the MVP.
- **Acceptance:** Local-only development is the current scope; Lightsail is deferred behind the named readiness gates.
- **Depends on:** None.

## M1 — Fresh local startup and integration

### M1.1 Replace the root starter documentation — Done

- **Task:** Add a root README with purpose, architecture, prerequisites, startup, test commands, configuration, links to state/plan, and local-data warning.
- **Acceptance:** A new contributor can identify the frontend/backend/DB and follow setup without relying on package starter READMEs.
- **Depends on:** None. (This plan and state report provide the initial content.)

### M1.2 Fix local frontend-to-API routing

- **Task:** Select one local API routing strategy: Angular dev proxy or explicit API base URL. Configure it consistently for dev and production hosting.
- **Acceptance:** From the browser, transaction/category/summary requests reach Nest and return expected status codes; no CORS or `/api` 404 workaround is needed.
- **Depends on:** M0.2, M1.1.

### M1.3 Define the API response contract

- **Task:** Document list/filter/create/update/delete/category/summary request and response schemas, errors, and status codes. Decide whether filtered results always return `FilterResult` or always return arrays plus metadata.
- **Acceptance:** A single contract is reflected in backend return types, Angular API service types, and contract tests.
- **Depends on:** M1.2.

### M1.4 Add and review the initial Prisma migration — Done

- **Task:** Generate a checked-in migration for the chosen schema using a disposable database and review SQL before committing it.
- **Acceptance:** `prisma migrate deploy` creates expected tables from an empty database; migration does not contain destructive/reset operations.
- **Depends on:** M0.2, M0.4.
- **Evidence:** Applied `20261021000000_init` to a fresh disposable MySQL 8 container with no persistent volume. `prisma migrate status` reported the schema up to date; MySQL confirmed `transactions`, `categories`, `_prisma_migrations`, and `transactions.amount DECIMAL(15,2)`. The container was stopped and removed. Existing-data conversion and restore behavior remain out of scope for this task.

### M1.5 Make local startup initialize schema and seed defaults

**Status: Done (2026-10-21).** Backend startup runs `prisma migrate deploy` followed by `prisma db seed`; Compose runs this before Nest. Category seeding uses unique-key upserts. Focused tests pass for fresh and repeated seeding. On a fresh tmpfs-only MySQL database, the first startup applied `20261021000000_init` and seeded ten defaults; the second found no pending migration and left ten defaults. The disposable service was removed after validation.

- **Task:** Add an explicit local initialization command or startup dependency to apply migrations and seed idempotent default categories.
- **Acceptance:** Repeated local startup on an empty or already-initialized database succeeds and produces exactly the intended defaults without duplicate categories.
- **Depends on:** M1.4.

### M1.6 Make Compose configuration safe and reproducible

**Status: Done (2026-10-21).** Both development images use Node 24 to match CI. Compose requires explicit values from the ignored root `.env`, with a development-only `.env.example`; backend/frontend build contexts exclude env files. Main and test Compose configurations parse successfully and all published ports are loopback-only. Backend lint, tests, and build pass.

- **Task:** Align Node container versions with the supported project runtime, make environment configuration explicit, and document local-only credentials/ports.
- **Acceptance:** Compose uses an example env file or documented defaults, production credentials are not baked into images, and startup health dependencies are clear.
- **Depends on:** M1.5.

### M1.7 Add service readiness and useful startup errors

**Status: Done (2026-10-21).** `GET /health/ready` runs `SELECT 1`, returns only `{"status":"ready"}` (200) or `{"status":"not_ready"}` (503), and never serializes database errors. Initial Prisma connection failure logs a generic actionable warning and does not prevent Nest from serving readiness. Compose health-checks the endpoint and gates frontend start on backend health. Disposable full-stack validation confirmed healthy startup, not-ready/unhealthy during MySQL outage, and recovery after MySQL restart. Backend tests/lint/build pass.

- **Task:** Add a health/readiness endpoint and ensure a missing database/configuration reports a clear service-level failure.
- **Acceptance:** Health indicates whether the API can reach the database; orchestration can wait for the API before the frontend is considered ready.
- **Depends on:** M1.5.

### M1.8 Align the frontend smoke test with the actual shell — Done

- **Task:** Replace the scaffold title assertion with a stable app-shell/router assertion and mock API initialization as needed.
- **Acceptance:** The frontend test reflects intended behavior and passes headlessly; no brittle starter text assertion remains.
- **Depends on:** M1.2.
- **Evidence:** Replaced the scaffold-title assertion with app-shell/router checks and provided router plus mocked startup state in the frontend test setup. The frontend suite passed 8 tests across 3 files, including app-shell and API route coverage; the production build passed.

### M1.9 Exercise clean local startup

- **Task:** Follow README setup from a clean checkout/database using only synthetic records; capture the exact commands and results.
- **Acceptance:** Dashboard opens, seeded categories load, one synthetic transaction can be created, summary updates, and browser network calls reach API.
- **Depends on:** M1.1-M1.8.

## M2 — Financial and API correctness

### M2.1 Specify transaction date semantics

- **Task:** Define date-only storage, accepted API format, timezone used for “today,” and period boundary rules.
- **Acceptance:** Requirements state whether a date is interpreted in user timezone or a fixed app timezone, with examples for week/month/year edges.
- **Depends on:** M0.2, M0.5.

### M2.2 Validate transaction DTO and business rules

- **Task:** Validate finite positive amounts, enum type, nonblank category, strict date-only input, nonfuture date under chosen timezone, and note length consistently.
- **Acceptance:** Each invalid field maps to an actionable 400 response; tests cover boundary and malformed input cases.
- **Depends on:** M2.1, M0.4.

### M2.3 Correct partial transaction updates

- **Task:** Validate only provided PATCH fields, while validating merged state where cross-field rules require it. Define whether empty PATCH is rejected.
- **Acceptance:** Valid one-field updates succeed; invalid supplied fields and invalid resulting records fail; omitted fields remain unchanged.
- **Depends on:** M2.2, M1.3.

### M2.4 Enforce category integrity for transactions

- **Task:** Decide and implement category identity rules (stable category ID/foreign key recommended) and verify category type matches transaction type.
- **Acceptance:** A transaction cannot reference a missing category or a category of the wrong type; category rename/delete behavior is deterministic.
- **Depends on:** M0.2, M0.3, M1.4.

### M2.5 Choose exact amount storage

- **Task:** Based on D-03, choose decimal/minor-unit representation; define migration and conversion for existing records (if any).
- **Acceptance:** Storage, DTOs, calculations, and formatting preserve supported currency precision; migration is reviewed against a backup and tested with synthetic values.
- **Depends on:** M0.4, M1.4.

### M2.6 Stabilize filter API and validation

- **Task:** Normalize empty/query-array handling, category selection, date validation, response shape, and inclusive endpoints.
- **Acceptance:** API tests prove AND across criteria, OR within categories, inclusive dates, invalid reversed ranges, and consistent no-result behavior.
- **Depends on:** M1.3, M2.1.

### M2.7 Verify period summaries and monthly week buckets

- **Task:** Test empty periods, prior/future periods, leap years, month edges, week/year crossover, ordering, and exact totals under chosen timezone/currency rules.
- **Acceptance:** Service tests cover boundaries and API tests match the documented contract.
- **Depends on:** M2.1, M2.5.

### M2.8 Map persistence failures safely

- **Task:** Normalize database-not-found/conflict/timeout/unavailable errors and ensure unknown errors do not leak SQL, credentials, or user data.
- **Acceptance:** Error contract documents status/message; tests assert safe client response and useful server-side diagnostics without financial payload logging.
- **Depends on:** M1.3, M1.7.

## M3 — Complete core user journeys

### M3.1 Complete transaction creation feedback

- **Task:** Connect form success/failure/loading state to API; preserve entered values on failure and refresh the list only after success.
- **Acceptance:** Valid create appears once; rejected/unavailable requests preserve the form and show an actionable error.
- **Depends on:** M1.3, M2.2, M2.8.

### M3.2 Add transaction editing

- **Task:** Add an edit action and prefilled form; support cancel, save, field errors, and update-in-progress state.
- **Acceptance:** User can change amount/type/category/date/note; API and list reflect saved changes; cancellation leaves data unchanged.
- **Depends on:** M2.3, M2.4, M3.1.

### M3.3 Make transaction deletion resilient

- **Task:** Handle delete confirmation, pending state, API failure, and stale/missing records consistently.
- **Acceptance:** Failed delete keeps item visible and offers useful feedback; successful delete removes it from all visible summaries/lists.
- **Depends on:** M2.8, M3.1.

### M3.4 Add category filtering to the UI

- **Task:** Add category multi-select and connect the filter panel to the agreed server/client contract.
- **Acceptance:** Multiple selected categories match any selected category while other active filters combine with AND; clear restores all records.
- **Depends on:** M2.6.

### M3.5 Synchronize filtered and unfiltered transaction state

- **Task:** Choose one owner for transaction filtering and ensure refresh/create/update/delete do not silently clear active filters or show stale rows.
- **Acceptance:** Active filters remain coherent across mutations and no-results state includes a clear path back to all records.
- **Depends on:** M2.6, M3.2-M3.4.

### M3.6 Complete category deletion behavior

- **Task:** Implement the behavior selected by M2.4: safe reassignment or explicit retention/archive semantics, with impact shown before confirmation.
- **Acceptance:** User sees affected transaction count and consequence; deleting defaults is blocked in UI and API; database integrity remains valid.
- **Depends on:** M2.4, M3.1.

### M3.7 Complete dashboard empty/loading/error states

- **Task:** Distinguish loading, zero transactions, API failure, and populated summary/recent list.
- **Acceptance:** No blank or misleading totals; dashboard failures are actionable and recent items remain independent of insight period selection.
- **Depends on:** M2.7, M2.8.

### M3.8 Complete insights navigation and breakdown states

- **Task:** Add previous/next period bounds, category breakdown, monthly week-by-week view, and loading/empty/error feedback.
- **Acceptance:** Each period navigation request uses the selected reference date; week breakdown is shown only for monthly view and aligns with documented date rules.
- **Depends on:** M2.7, M2.8.

## M4 — Privacy and security

### M4.1 Write a threat model for the chosen deployment

- **Task:** Identify data, trust boundaries, actors, entry points, abuse cases, and mitigations for the selected account/deployment model.
- **Acceptance:** Threat model covers browser, API, database, logs/telemetry, backups, and admin access; high risks have linked backlog tasks.
- **Depends on:** D-02, D-04.

### M4.2 Implement authentication and data isolation if required

- **Task:** Add authentication, request identity, authorization checks, and ownership-aware data access according to D-02.
- **Acceptance:** Integration tests prove unauthenticated access is denied where required and one account cannot read or mutate another account's records.
- **Depends on:** M4.1, M2.4.

### M4.3 Harden CORS, transport, and secrets

- **Task:** Separate dev/prod config; remove placeholder instrumentation secrets; define HTTPS, allowed origins, secure cookie/token handling, and secret rotation approach.
- **Acceptance:** Production startup fails closed on missing required secrets/origins; no secret is embedded in client bundle or logs.
- **Depends on:** D-04, M4.1.

### M4.4 Review input, error, and telemetry data exposure

- **Task:** Audit DTO validation, exception paths, console logs, telemetry instrumentation, and response payloads for sensitive information.
- **Acceptance:** No transaction values/notes/credentials are logged by default; errors are useful but sanitized; findings are fixed or documented.
- **Depends on:** M2.8, M4.1.

### M4.5 Add safe dependency and static security checks

- **Task:** Keep CI dependency audit; review severe findings and decide lockfile update policy; add additional scanner only if justified and maintainable.
- **Acceptance:** CI fails on configured high/critical dependency advisories; remediation process is documented; no scanner suppressions without rationale and expiry.
- **Depends on:** CI workflow.

## M5 — Reliability, accessibility, and recovery

### M5.1 Standardize API error presentation

- **Task:** Define error-to-message mapping; remove raw error logging from app state; ensure field-specific errors appear beside fields and generic failures in toast/alert.
- **Acceptance:** API outage, validation, conflict, forbidden, not-found, and unknown server failures have distinct safe UI behavior.
- **Depends on:** M2.8, M3.1.

### M5.2 Add loading and empty states to every page

- **Task:** Show explicit loading/error/empty/populated states for transactions, categories, dashboard, and insights.
- **Acceptance:** Slow or failed API requests never look like successful empty data; retry is available where useful.
- **Depends on:** M3.7, M3.8.

### M5.3 Verify responsive layout

- **Task:** Check widths 320, 375, 768, 1024, 1440, and 2560 px; fix overflow and touch-target issues.
- **Acceptance:** No horizontal page overflow; content and navigation remain usable at all target widths.
- **Depends on:** M3 journeys.

### M5.4 Verify keyboard and screen-reader behavior

- **Task:** Check semantic headings, labels, focus order, visible focus, modal/confirmation focus, status announcements, contrast, and navigation state.
- **Acceptance:** Core create/edit/delete/filter/insights journeys can be completed by keyboard; automated accessibility scan has no serious/critical findings.
- **Depends on:** M3 journeys.

### M5.5 Define reset, backup, and restore behavior

- **Task:** Specify reset confirmation, scope, export/backup, restore validation, and disaster recovery based on D-01/D-02.
- **Acceptance:** A documented recovery procedure is tested on disposable data; reset cannot accidentally target production data.
- **Depends on:** D-01, M4.1.

## M6 — Release readiness

### M6.1 Make CI a reliable merge gate

- **Task:** Run the workflow on GitHub, fix baseline failures, and configure repository branch protection for required backend/frontend checks when the remote repository is available.
- **Acceptance:** Pull requests cannot merge with failing checks; CI permissions are read-only unless a job requires more.
- **Depends on:** M1.8, M2-M5 relevant tests.

### M6.2 Document production operations

- **Task:** Document deployment topology, environment variables, migration order, backups, monitoring, rollback, incident response, and data deletion.
- **Acceptance:** An operator can deploy and restore in a staging environment from the documented procedure without relying on local developer assumptions.
- **Depends on:** D-04, M4, M5.5.

### M6.3 Stage release and request final human approval

- **Task:** Deploy to the selected staging environment, run smoke checks with synthetic data, review privacy/security status, and present exact production change/rollback plan.
- **Acceptance:** Staging checks pass and the human explicitly approves production release after the coordinator presents release scope, deployment validation steps and expected results, user-run smoke-test steps with expected results, current CI/staging evidence, material risks, and rollback plan. If readiness criteria are not met, block release and continue readiness work; do not ask for approval to bypass a known blocker. Once ready, the approval packet must identify the exact commit and targets and give concrete user-run smoke-test steps with commands/URLs and expected results. No agent treats CI green as release authorization.
- **Depends on:** M6.1, M6.2.

## Definition of done for each task

- Acceptance criteria are met and supported by test or inspection evidence.
- Relevant automated checks pass; any skipped check is named with a reason.
- API/schema/docs are updated if their contract changed.
- Final diff is reviewed by the coordinator and independent reviewer for correctness, security, privacy, financial accuracy, and unrelated changes.
- Task status, decision links, and remaining limitations are recorded here or in a linked decision record.

## Task status

All implementation tasks above are **Todo** pending baseline verification and decision gates, except M1.1, which is **Done**: the root README now documents the project layout, commands, current setup gaps, and links to this plan and the state report. The repository also has project-level agent instructions and a CI workflow; the state report describes verified code presence and known integration gaps.




