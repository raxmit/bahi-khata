# Production Release Readiness

**Assessment date:** 2026-10-21  
**Status:** **BLOCKED**  
**Deployment performed:** No

## Decision

Do not deploy and do not request deployment approval. The product decisions are adopted: MySQL source of truth, single owner, local-only API until authenticated, and INR with exact two-decimal storage/API. M1.9's single browser create/list/dashboard journey has now been verified through the local API and a disposable MySQL database. Authentication, remote CI evidence, staging validation, broader journey coverage, and a verified recovery plan are still missing. Lightsail is deferred until all release gates are complete.

## Blockers

1. **No production release candidate or targets approved:** M1.9 was run from clean checkout `d362c5f` on `main` (then matching `origin/main`); this local verification does not designate or approve a production release. Production target identities and authorization remain absent.
2. **Authentication is not implemented:** The API has no authentication or owner authorization. Host startup defaults to loopback; Compose host ports are configured to bind to loopback. `backend/src/app.module.ts` also still contains placeholder observation credentials (`YOUR_APP_KEY` and `YOUR_APP_SECRET`). Do not expose this API to a network.
3. **Migration validation is partial:** The initial migration and repeated default seeding have been verified on an empty disposable MySQL 8 database. They have not been validated against existing user data or a production-like migration/restore scenario. Any existing Float values need inventory, backup, and conversion review.
4. **Remote CI and release validation are missing:** A successful remote workflow run for a designated release candidate is not evidenced. Local checks do not satisfy the CI gate.
5. **No staging evidence:** No staging target, URLs, deployment record, or synthetic end-to-end validation results are available.
6. **No identified production targets:** The design mentions Lightsail instances and a managed MySQL database but gives no actual hostnames/IPs, account/region, database identity, DNS name, operator, or firewall/TLS evidence. Deployment is deferred by decision.
7. **No verified rollback/recovery:** No release rollback steps, database backup identity, restore test, or migration recovery procedure is documented or verified.

## M1.9 end-to-end local verification

The working tree was clean at `d362c5f` before this documentation update, and `.env` matched `.env.example` exactly. M1.9 changed project documentation only; no application code or dependencies changed. The only database used for this exercise was the fresh, project-scoped Compose volume `bahi-khata-m19_mysql_data`; all transaction data was synthetic.

From the repository root, the README setup values were already present and matched the example. Startup and service verification used:

```powershell
git status -sb
git log -1 --oneline --decorate
Compare-Object (Get-Content .env.example) (Get-Content .env)
docker compose -p bahi-khata-m19 up --build --renew-anon-volumes -d --wait
docker compose -p bahi-khata-m19 ps
```

Results: `git status -sb` printed `## main...origin/main`; the source commit was `d362c5f`. `Compare-Object` printed no differences. Compose exited 0, created its own project network and new `bahi-khata-m19_mysql_data` volume, and reported MySQL, backend, and frontend healthy. Published ports were `127.0.0.1:3306`, `127.0.0.1:3000`, and `127.0.0.1:4200`.

Microsoft Edge 155 was launched headlessly with a temporary profile and DevTools port 9223 using:

```powershell
$profilePath = Join-Path $env:TEMP 'bahi-khata-m19-edge-profile'
New-Item -ItemType Directory -Force -Path $profilePath | Out-Null
Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9223', "--user-data-dir=$profilePath", 'about:blank')
$path = Join-Path $env:TEMP 'bahi-khata-m19-final-browser.mjs'
node $path
$path = Join-Path $env:TEMP 'bahi-khata-m19-form-debug.mjs'
node $path
$path = Join-Path $env:TEMP 'bahi-khata-m19-summary-final.mjs'
node $path
```

The one-off Node 24 DevTools scripts were created under `%TEMP%`; no browser automation dependency or project file was added. At `http://127.0.0.1:4200`, the dashboard rendered. The categories page displayed ten seeded defaults: Salary, Freelance, Investment, Gift, Food, Rent, Transport, Healthcare, Entertainment, and Utilities. On the Transactions page, the form submitted one synthetic record: `amount=123.45`, `type=Expense`, `category=Food`, `date=2026-10-20`, `note=M1.9 synthetic smoke`. The browser captured `POST /api/transactions` with HTTP 201, then `GET /api/transactions` with HTTP 200; the list showed the record. Returning to the dashboard showed total expenses `₹123.45` and net balance `-₹123.45`. Browser requests for `/api/categories`, `/api/transactions`, and `/api/summary?period=monthly&date=2026-10-20` returned HTTP 200. This confirms the browser's same-origin `/api` requests traversed the Angular proxy to Nest.

The API and database checks were:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/summary?period=monthly&date=2026-10-21'
docker exec pftracker-backend node --input-type=module -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); const rows=await p.transaction.findMany({select:{amount:true,type:true,category:true,date:true,note:true}}); const categories=await p.category.count({where:{isDefault:true}}); console.log(JSON.stringify({defaultCategories:categories,transactionCount:rows.length,transactions:rows})); process.exit(0);"
```

The direct summary response reported `totalExpenses: "123.45"`, `netBalance: "-123.45"`, and `isEmpty: false`. Prisma reported `defaultCategories: 10`, `transactionCount: 1`, and one row with the submitted synthetic values; this verifies persistence in MySQL rather than a browser-only state update.

Validation attempts and resolution: the first browser harness timed out waiting for the created row, and Prisma showed zero transactions and ten categories. A later harness had an invalid wait expression that evaluated a Node-side event array in the browser page and raised `Uncaught`; Prisma again showed zero transactions. The corrected browser run waited for the network event in Node and captured the successful HTTP 201 create. During removal of the first trial row, `$response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/transactions/e91967c5-751f-45ad-9c22-7a839b1253b6' -Method Delete` emitted `Object reference not set to an instance of an object`; a Prisma count immediately afterward was zero, confirming that the row had been removed. The passing run then created exactly one row. These were harness and PowerShell errors; the final application checks passed.

The disposable stack was removed after verification:

```powershell
docker compose -p bahi-khata-m19 down -v
docker ps -a --filter "name=^/pftracker-mysql$" --filter "name=^/pftracker-backend$" --filter "name=^/pftracker-frontend$"
docker volume ls --filter "name=bahi-khata-m19_mysql_data"
```

Observed cleanup result: Compose reported all three project containers, `bahi-khata-m19_default`, and `bahi-khata-m19_mysql_data` removed. The subsequent container and volume listings were empty for those filters. The temporary Edge process was closed through DevTools; `node -e "fetch('http://127.0.0.1:9223/json/version').then(()=>{console.log('still running');process.exitCode=1}).catch(()=>console.log('closed'))"` printed `closed`. No push or deployment occurred.

## Local check evidence

## M2.1 date policy

The adopted contract is strict Gregorian `YYYY-MM-DD` civil dates, `Asia/Kolkata` for today/future checks, inclusive Monday–Sunday ISO week summaries, inclusive month/year and filter endpoints, and overflow-safe period navigation. Prisma still declares `Transaction.date DateTime @db.Date`; no schema or migration file changed.

Date boundary validation used the following commands from the named package directories. On Windows, `TZ` selects the host timezone used by Node; test-runner process creation required an outside-sandbox retry after `spawn EPERM`.

| Directory | Command | Result |
|---|---|---|
| `backend/` | `$env:TZ='UTC'; npm.cmd test` | Pass: 12 files, 45 tests |
| `backend/` | `$env:TZ='America/Los_Angeles'; npm.cmd test` | Pass: 12 files, 45 tests |
| `frontend/` | `$env:TZ='UTC'; npm.cmd test -- --watch=false` | Pass: 4 files, 13 tests |
| `frontend/` | `$env:TZ='America/Los_Angeles'; npm.cmd test -- --watch=false` | Pass: 4 files, 13 tests |
| `backend/` | `npm.cmd run lint` | Pass, exit 0, no warnings |
| `backend/` | `npm.cmd run build` | Pass, exit 0 |
| `frontend/` | `npm.cmd run build` | Pass, exit 0 |

The brief's cases are covered: Kolkata midnight crossover and future rejection; valid/invalid leap dates and timestamp rejection; March, leap-year, Monday-start and cross-year week bounds; inclusive filter endpoints and reversed range rejection; May 2026 clamped buckets with exact Decimal totals; Jan 31 and Feb 29 navigation; and exact MySQL DATE/API round-trip mapping. `frontend/package.json` has no lint script, so a frontend lint command is not available. The previous failed in-sandbox worker launches were environmental `spawn EPERM` errors; sequential outside-sandbox test runs passed. No disposable or persistent database was modified for these unit/build checks, and no push or deployment occurred.

Commands were run from the relevant package directories on the assessment date. Initial PowerShell invocations of `npm` were rejected by execution policy; retrying with `npm.cmd` produced these results. Test/build commands that failed with sandbox `spawn EPERM` were retried outside the sandbox.

| Check | Result | Evidence |
|---|---|---|
| Backend lint | Pass | `npm.cmd run lint`, exit 0 |
| Backend tests | Pass | `npm.cmd test`, exit 0; 95 tests passed in 16 files, including startup/readiness, M2.1 date rules, M2.2 validation, M2.3 PATCH semantics, and M2.4 category integrity |
| Backend build | Pass | `npm.cmd run build`, exit 0 |
| Backend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Rebuilt backend image audit | Pass | `docker run --rm --entrypoint npm bahi-khata-backend audit --audit-level=high`; exit 0, `found 0 vulnerabilities`; no-cache image build's `npm ci` also reported 0 |
| Frontend tests | Pass | `npm.cmd test -- --watch=false`; 4 files and 14 tests passed, including civil-date, exact INR input/formatting, and M2.4 category API routing cases |
| Frontend production build | Pass | `npm.cmd run build`, exit 0 |
| Angular serve proxy configuration | Pass | `npm.cmd exec ng -- config projects.frontend.architect.serve.options.proxyConfig` returned `proxy.conf.json` |
| Compose configuration | Pass | `docker compose config`, exit 0; confirmed frontend, API, and database published ports bind to `127.0.0.1`; no warning reported. |
| M1.6 Compose configuration | Pass | Copied `.env.example` to ignored `.env`; `docker compose config` and `docker compose -f docker-compose.test.yml config` both exited 0. Parsed both outputs: main published ports `3000`, `4200`, `3306`, and test port `3307` all bind to `127.0.0.1`. |
| Local credential/build-context review | Pass | `.env.example` contains only synthetic development values; `.env` is ignored by Git. Backend/frontend `.dockerignore` exclude `.env`, `.env.*`, and `*.env`. Test database credentials are explicitly synthetic. No production credentials are included in Compose or Docker build contexts. |
| Docker runtime versions | Pass | `backend/Dockerfile.dev` and `frontend/Dockerfile.dev` use `node:24-alpine`, matching `.github/workflows/ci.yml` Node 24. |
| M1.7 backend image dependency advisories | Resolved; detailed triage below | The Node 24 Alpine image's `npm ci` reported 5 package vulnerabilities, including 2 high-severity package records. They came from an unused development-only Mau CLI dependency and were removed; the no-cache rebuild now reports zero vulnerabilities. |
| M1.7 disposable Compose readiness | Pass | `docker compose -p bahi-khata-m17 up --build --renew-anon-volumes -d --wait` started MySQL, API, and frontend using a project-scoped disposable MySQL volume; MySQL and API reached healthy and frontend started. `GET http://127.0.0.1:3000/health/ready` returned HTTP 200 `{"status":"ready"}`. |
| M1.7 database outage and recovery | Pass | `docker compose -p bahi-khata-m17 stop mysql`; endpoint returned HTTP 503 `{"status":"not_ready"}` with no database details; `docker inspect --format "{{.State.Health.Status}} {{.State.Health.FailingStreak}}" pftracker-backend` reported `unhealthy 5`. After `docker compose -p bahi-khata-m17 start mysql`, endpoint returned HTTP 200 `{"status":"ready"}` and `docker compose -p bahi-khata-m17 up -d --wait` reported MySQL/API healthy and frontend started. `docker compose -p bahi-khata-m17 down -v` removed the isolated containers and database volume. |
| M1.9 clean local startup and browser journey | Pass, synthetic disposable data | Exact commands, browser/API/MySQL evidence, failures, and cleanup are recorded in [M1.9 end-to-end local verification](#m1-9-end-to-end-local-verification). |
| Prisma schema validation | Pass, no DB connection | `DATABASE_URL` set to a synthetic local URL; `npm.cmd exec prisma -- validate`, exit 0. |
| Initial schema SQL preview | Pass, followed by database verification | `npm.cmd exec prisma -- migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, exit 0; generated create-table/index SQL with `DECIMAL(15,2)`. Applied to a disposable database as recorded below. |
| Disposable MySQL migration | Pass | Started `mysql:8.0` as `bahi-khata-migration-check`, with no persistent volume, bound to `127.0.0.1:3307`; `npm.cmd exec prisma -- migrate deploy` applied `20261021000000_init`; `prisma migrate status` reported schema up to date; MySQL showed `_prisma_migrations`, `categories`, and `transactions`, with `transactions.amount` as `DECIMAL(15,2)`. Container was stopped and auto-removed after verification. No existing database container or data was used. |
| Fresh and repeated startup initialization | Pass | `docker compose -f docker-compose.test.yml up -d --wait mysql-test`; from `backend/`, `npm.cmd run db:init` twice with synthetic `DATABASE_URL=mysql://pfuser:pfpass@127.0.0.1:3307/pftracker_test`. First run applied `20261021000000_init` and seeded 10 categories; second reported no pending migrations and seeded again. Aggregate MySQL query returned `10` total / `10` defaults and `1` completed migration. Disposable service was removed with `docker compose -f docker-compose.test.yml down`. |
| Default-category seed tests | Pass | `npm.cmd test -- prisma/seed-default-categories.spec.ts`; 1 file and 2 tests passed for fresh and repeated seed behavior |
| Backend lint/tests/build after local setup changes | Pass | `npm.cmd run lint`, `npm.cmd test` (21 tests across 7 files), and `npm.cmd run build`, exit 0 |
| `/api` development proxy runtime | Pass | With a temporary local mock API, `GET http://127.0.0.1:4201/api/transactions` returned `{"path":"/transactions"}`; this confirms `/api` is stripped and forwarded to port 3000. Mock and dev servers were stopped afterward. |
| Direct host `start:prod` smoke without config | Blocked | An earlier `npm.cmd run start:prod` exited during Prisma initialization because this shell did not load `DATABASE_URL`. Compose startup/readiness is now verified separately against disposable MySQL. |
| Frontend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Remote CI | Not evidenced | No successful workflow run has been recorded for a designated release candidate |
| Staging deployment/validation | Not evidenced | No staging target or test record is available |
| Database migration | Pass on fresh disposable database | Initial migration applied and schema checked as described above. This does not validate existing data, production migration compatibility, or restore behavior. |
| Database backup/restore | Not run | No backup identity, restore rehearsal, or recovery evidence is available |

Passing local checks do not establish CI success or production readiness. The backend suite has limited coverage. M1.9 validates one synthetic create/list/dashboard path only. The production Nginx example was inspected but not executed because no Nginx staging host is available.

## M1.7 backend image advisory triage and M2.2 validation

**Scanner and scope.** `npm ci` in `backend/Dockerfile.dev` invokes npm's built-in registry audit. The image is the Node 24 Alpine backend development image (`bahi-khata-m17-backend:latest`); its npm version was 11.19.1. The five npm package-level findings were 2 low, 1 moderate, and 2 high. npm groups multiple individual advisories under one vulnerable package, so the two high package records corresponded to six high-severity GHSA advisories:

| Affected package/version | Advisory ID and issue | Advisory fixed version |
|---|---|---|
| `tmp@0.0.33` | [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65), path traversal | `tmp` 0.2.6 |
| `undici@6.20.1` | [GHSA-f269-vfmq-vjvj](https://github.com/advisories/GHSA-f269-vfmq-vjvj), WebSocket parser crash | `undici` 6.24.0 |
| `undici@6.20.1` | [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q), WebSocket decompression memory exhaustion | `undici` 6.24.0 |
| `undici@6.20.1` | [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8), invalid WebSocket compression parameter can crash process | `undici` 6.24.0 |
| `undici@6.20.1` | [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q), WebSocket fragment-count denial of service | `undici` 6.27.0 |
| `undici@6.20.1` | [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5), unrequested WebSocket subprotocol can crash process | `undici` 6.28.1 |

The paths were `@nestjs/mau@0.2.8` (direct development dependency) -> `inquirer@8.2.6` -> `external-editor@3.1.0` -> `tmp@0.0.33`, and `@nestjs/mau` -> `undici@6.20.1`. `@nestjs/mau` was not imported by app source or used by a project script. The `tmp` issue requires attacker-controlled path parameters to flow to its file/directory creation calls; app code does not use `tmp`. The Undici findings concern its WebSocket client; the app does not use Undici WebSockets. These dependencies were development-only, but they were present in the development image and CI install, so the npm audit gate correctly treated them as a release risk. The API remains local-only pending authentication.

**Fix applied.** From `backend/`, ran `npm.cmd uninstall @nestjs/mau --save-dev` (exit 0; removed 51 packages, audited 324, and reported 0 vulnerabilities). Removed the unused Mau development dependency rather than accepting npm's suggested `@nestjs/mau@0.0.6` major-version change or adding overrides for otherwise-unused transitive libraries. This drops the full `tmp`/`undici` chain without changing application runtime behavior. `backend/package.json` and its lockfile are updated; no new dependencies were added. That host command printed nonfatal peer/engine warnings under Node 24.12.0; the Docker image uses Node 24 and its clean `npm ci` completed successfully.

**Commands and results.** Before the change, `docker run --rm --entrypoint npm bahi-khata-m17-backend audit --json` returned exit 1 and reproduced the package findings above. After the change, from the repository root, `docker compose build --no-cache backend` completed successfully; its `npm ci` step reported `found 0 vulnerabilities` (326 packages installed), and Prisma Client generation succeeded. `docker run --rm --entrypoint npm bahi-khata-backend audit --audit-level=high` exited 0 and printed `found 0 vulnerabilities`. Host `npm.cmd audit --audit-level=high` also exits 0. The container scan is authoritative for image contents because it uses npm 11.19.1. The image build still prints a deprecated `tsconfck` notice and npm install-script notices for Prisma; these are not audit vulnerabilities and did not prevent Prisma generation.

M2.2 enforces positive bounded INR decimal strings, supported transaction types, nonblank text categories, strict valid/nonfuture civil dates, and optional text notes up to 250 characters consistently in DTO and business validation. Overlong notes are rejected rather than silently truncated. Focused tests from `backend/`: `npm.cmd test -- src/common/dto/transaction-validation.dto.spec.ts src/validator/validator.service.spec.ts src/transactions/transactions.controller.spec.ts` passed (3 files, 46 tests). One intermediate full-suite run failed because the new test expected a nested error body; after aligning the assertion with the controller's field-map response, the final full suite passed. The final full backend lint, tests, build, image build, and audit results are in the local check table above.

## M2.4 stable category identity and safeguards

### Status (kept separate)

| Status area | Result |
|---|---|
| Behavior approval | Approved by user on 2026-10-22: category IDs/FK, reject missing and mismatched IDs, rename custom categories in place, block deletion while referenced |
| Implementation | Code, tests, schema, and migration prepared locally; API and frontend now use category IDs. No migration was applied. |
| Review | Reviewed the Prisma schema and migration SQL statically; generated from-empty Prisma SQL confirms required `categoryId`, its index, and `ON DELETE RESTRICT`. Migration rollback implications are documented below. No independent reviewer or live database review has occurred. |
| Verification | Unit tests, lint, builds, Prisma validation, and schema diff passed as recorded below. Database migration, API/database integration, and restore rehearsal remain unverified. |
| Database-operation approval | No approval to inspect or modify the running Compose database was given. No commands were run against it. A separate approval is required before any migration or database operation against that stack. |

### Behavior and migration

Transaction create/update now accept `categoryId`, require an existing category matching the resulting transaction type, and retain `category` as a compatibility snapshot/display value. Read queries resolve the live category name through the relation. Filters and summary breakdowns use category IDs. Category rename preserves the category ID and atomically updates compatibility snapshots; defaults cannot be renamed. Deleting a referenced custom category returns HTTP 409, and the restrictive foreign key protects against races; default deletion remains HTTP 403. The category screen has a rename action and reports the referenced-category deletion error. Transaction reassignment through the UI is not yet available; until a later edit/reassignment flow exists, referenced custom categories can be reassigned through the API and then deleted.

The new migration is `backend/prisma/migrations/20261022000000_category_identity/migration.sql`. It adds a nullable column, backfills only exact `(category name, transaction type)` matches, then makes the ID required and creates an indexed `RESTRICT` foreign key. If any historical transaction has no exact same-type category, the required-column step fails. MySQL DDL may leave the earlier additive column/backfill in place on such a failure. Before applying, run this preflight against a disposable database or, only after separate approval, the intended database:

```sql
SELECT COUNT(*) AS unmatched_transactions
FROM transactions AS t
LEFT JOIN categories AS c
  ON BINARY c.name = BINARY t.category AND c.type = t.type
WHERE c.id IS NULL;
```

Expected result: `unmatched_transactions = 0`. If nonzero, do not apply the migration; explicitly map each unmatched label to a same-type category and verify the mapping first. Stop the old API while migrating so name-only writes cannot race with the backfill. In this environment no database operation was performed, so the preflight result is **unknown**.

On a separate disposable MySQL database only, the documented migration validation sequence is: load the synthetic database URL into `DATABASE_URL`, run `npm.cmd run db:init` from `backend/`, and verify both `20261021000000_init` and `20261022000000_category_identity` are applied, the unmatched count is zero, every transaction has a valid same-type `categoryId`, and the FK rejects category deletion while referenced. Then rehearse a backup/restore of that disposable database and verify its pre-migration transaction/category counts and labels. Expected startup on an empty database: both migrations complete, ten defaults seed once, and the category ID constraint is present. Neither this sequence nor the SQL preflight was executed for M2.4.

Rollback preserves the original `transactions.category` snapshot and does not delete transactions. If a migration fails, keep the app stopped and restore the verified pre-migration backup before retrying; the migration contains DDL that can partially apply. Do not simply mark a partially applied Prisma migration rolled back and rerun it, because its initial `ADD COLUMN` would conflict. After successful migration, an application rollback to the old API can read the maintained category name snapshots; schema rollback should only drop the FK/index/ID after confirming the name snapshot is current and restoring a backup if classification history is uncertain. Category renames update snapshots in the same DB transaction specifically to preserve that rollback path.

### Exact local checks and results

Commands were run from the indicated package directory. Tests use mock repositories; no database connection was made.

| Directory | Command | Result |
|---|---|---|
| `backend/` | `npm.cmd test -- src/transactions/transaction.repository.spec.ts src/transactions/transactions.controller.spec.ts src/categories/category.repository.spec.ts src/categories/categories.controller.spec.ts src/common/dto/transaction-validation.dto.spec.ts src/validator/validator.service.spec.ts src/filter/filter-engine.service.spec.ts src/summary/summarizer.service.spec.ts` | Pass: 8 files, 74 tests; missing/wrong-type IDs, type-change mismatch, type+matching-ID update, rename/duplicate/default behavior, reference-blocked deletion, filter and summary ID behavior |
| `backend/` | `npm.cmd test` | Pass: 16 files, 95 tests |
| `backend/` | `npm.cmd run lint` | Pass, exit 0 |
| `backend/` | `npm.cmd run build` | Pass, exit 0 |
| `frontend/` | `npm.cmd test -- --watch=false` | Pass: 4 files, 14 tests; includes category PATCH routing through `/api` |
| `frontend/` | `npm.cmd run build` | Pass, exit 0 |
| `backend/` | `npm.cmd exec prisma -- validate` | Pass; valid schema, no database connection |
| `backend/` | `npm.cmd exec prisma -- migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` | Pass; generated expected required category ID FK with `ON DELETE RESTRICT`. This is schema SQL generation, not a migration application. |
| `backend/` | `npm.cmd exec prisma -- format` and `npm.cmd exec prisma -- generate` | Pass after retrying client generation outside the sandbox due to `spawn EPERM`; no DB connection |
| Repository root | `git diff --check` | Pass |

The first sandboxed Vitest run failed before test execution with Windows `spawn EPERM`; retrying outside the sandbox passed. One later suite run exposed a mock fixture that did not use Prisma's known-error class; the fixture was corrected, and the final suite passed. Static migration review found the migration and Prisma schema use the same FK name, indexed ID field, requiredness, and restrict behavior. No database migration, data preflight, API/database smoke test, rollback restore rehearsal, push, or deployment was run. M2.4 database-backed acceptance remains unverified.

## M2.3 transaction PATCH validation

PATCH now rejects an empty patch with HTTP 400. For nonempty patches, the controller fetches the current transaction, overlays only supplied fields, validates the complete resulting record using the M2.2 business rules, then passes only supplied fields to the repository's sparse update. Thus omitted fields are preserved by persistence and also participate in merged-record validation. Tests use mocked repositories and synthetic values; no database was used.

From `backend/`, exact checks and results:

| Command | Result |
|---|---|
| `npm.cmd test -- src/transactions/transactions.controller.spec.ts` | Pass: 1 file, 14 tests; includes one-field valid update, invalid supplied amount/type/category/date/note, empty patch HTTP 400, merged-state validation, and unchanged omitted values |
| `npm.cmd test` | Pass: 14 files, 81 tests |
| `npm.cmd run lint` | Pass, exit 0 |
| `npm.cmd run build` | Pass, exit 0 |

The first focused test attempt inside the sandbox failed before test execution with Vite/Windows `spawn EPERM`; the same command was rerun outside the sandbox and passed. No database command or database operation was run for M2.3. No push or deployment occurred.

## Safe next readiness work

1. Implement and verify authentication plus single-owner authorization before any network exposure; replace or safely disable placeholder instrumentation credentials.
2. Assess any Float-to-decimal conversion with synthetic data and define how this migration applies to any existing data.
3. Complete local end-to-end startup and all checks. Create a release commit after review, then verify a successful remote CI run for that commit.
4. Identify exact staging and later production resources, domains, operators, network rules, TLS configuration, and secret sources. Validate staging with synthetic records.
5. Document and execute backup restoration and release rollback rehearsals, including recovery from a partially applied migration.

Reassess readiness after these items have evidence. Until then, deployment remains **BLOCKED** and no deployment approval request should be issued.
