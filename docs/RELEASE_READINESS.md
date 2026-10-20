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

Commands were run from the relevant package directories on the assessment date. Initial PowerShell invocations of `npm` were rejected by execution policy; retrying with `npm.cmd` produced these results. Test/build commands that failed with sandbox `spawn EPERM` were retried outside the sandbox.

| Check | Result | Evidence |
|---|---|---|
| Backend lint | Pass | `npm.cmd run lint`, exit 0 |
| Backend tests | Pass, limited coverage | `npm.cmd test`, exit 0; 21 tests passed in 7 files, including fresh/repeated seeding, readiness, and safe startup failure cases |
| Backend build | Pass | `npm.cmd run build`, exit 0 |
| Backend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Frontend tests | Pass | `npm.cmd test -- --watch=false`; 3 files and 8 tests passed, including exact INR input/formatting cases |
| Frontend production build | Pass | `npm.cmd run build`, exit 0 |
| Angular serve proxy configuration | Pass | `npm.cmd exec ng -- config projects.frontend.architect.serve.options.proxyConfig` returned `proxy.conf.json` |
| Compose configuration | Pass | `docker compose config`, exit 0; confirmed frontend, API, and database published ports bind to `127.0.0.1`; no warning reported. |
| M1.6 Compose configuration | Pass | Copied `.env.example` to ignored `.env`; `docker compose config` and `docker compose -f docker-compose.test.yml config` both exited 0. Parsed both outputs: main published ports `3000`, `4200`, `3306`, and test port `3307` all bind to `127.0.0.1`. |
| Local credential/build-context review | Pass | `.env.example` contains only synthetic development values; `.env` is ignored by Git. Backend/frontend `.dockerignore` exclude `.env`, `.env.*`, and `*.env`. Test database credentials are explicitly synthetic. No production credentials are included in Compose or Docker build contexts. |
| Docker runtime versions | Pass | `backend/Dockerfile.dev` and `frontend/Dockerfile.dev` use `node:24-alpine`, matching `.github/workflows/ci.yml` Node 24. |
| Dependency advisory notice during Node 24 image build | Follow-up required | Backend image `npm ci` reported 5 vulnerabilities (2 low, 1 moderate, 2 high). M1.7 made no dependency changes; these findings need a separate dependency audit/triage before release. |
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

## Safe next readiness work

1. Implement and verify authentication plus single-owner authorization before any network exposure; replace or safely disable placeholder instrumentation credentials.
2. Assess any Float-to-decimal conversion with synthetic data and define how this migration applies to any existing data.
3. Complete local end-to-end startup and all checks. Create a release commit after review, then verify a successful remote CI run for that commit.
4. Identify exact staging and later production resources, domains, operators, network rules, TLS configuration, and secret sources. Validate staging with synthetic records.
5. Document and execute backup restoration and release rollback rehearsals, including recovery from a partially applied migration.

Reassess readiness after these items have evidence. Until then, deployment remains **BLOCKED** and no deployment approval request should be issued.
