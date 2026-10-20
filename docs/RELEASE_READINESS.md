# Production Release Readiness

**Assessment date:** 2026-10-21  
**Status:** **BLOCKED**  
**Deployment performed:** No

## Decision

Do not deploy and do not request deployment approval. The product decisions are adopted: MySQL source of truth, single owner, local-only API until authenticated, and INR with exact two-decimal storage/API. The initial migration has now been applied successfully to a disposable MySQL 8 database. Authentication, remote CI evidence, staging validation, and a verified recovery plan are still missing. Lightsail is deferred until end-to-end and release gates are complete.

## Blockers

1. **No release candidate designated:** `main` tracks `origin/main` at base commit `6364a4d` (`Initial Bahi Khata application`), with uncommitted local readiness changes. No release candidate has been committed or reviewed for production.
2. **Authentication is not implemented:** The API has no authentication or owner authorization. Host startup defaults to loopback; Compose host ports are configured to bind to loopback. `backend/src/app.module.ts` also still contains placeholder observation credentials (`YOUR_APP_KEY` and `YOUR_APP_SECRET`). Do not expose this API to a network.
3. **Migration validation is partial:** The initial migration and repeated default seeding have been verified on an empty disposable MySQL 8 database. They have not been validated against existing user data or a production-like migration/restore scenario. Any existing Float values need inventory, backup, and conversion review.
4. **Remote CI and release validation are missing:** A successful remote workflow run for a designated release candidate is not evidenced. Local checks do not satisfy the CI gate.
5. **No staging evidence:** No staging target, URLs, deployment record, or synthetic end-to-end validation results are available.
6. **No identified production targets:** The design mentions Lightsail instances and a managed MySQL database but gives no actual hostnames/IPs, account/region, database identity, DNS name, operator, or firewall/TLS evidence. Deployment is deferred by decision.
7. **No verified rollback/recovery:** No release rollback steps, database backup identity, restore test, or migration recovery procedure is documented or verified.

## Local check evidence

Commands were run from the relevant package directories on the assessment date. Initial PowerShell invocations of `npm` were rejected by execution policy; retrying with `npm.cmd` produced these results. Test/build commands that failed with sandbox `spawn EPERM` were retried outside the sandbox.

| Check | Result | Evidence |
|---|---|---|
| Backend lint | Pass | `npm.cmd run lint`, exit 0 |
| Backend tests | Pass, limited coverage | `npm.cmd test`, exit 0; 16 tests passed in 4 files, including fresh/repeated default seeding |
| Backend build | Pass | `npm.cmd run build`, exit 0 |
| Backend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Frontend tests | Pass | `npm.cmd test -- --watch=false`; 3 files and 8 tests passed, including exact INR input/formatting cases |
| Frontend production build | Pass | `npm.cmd run build`, exit 0 |
| Angular serve proxy configuration | Pass | `npm.cmd exec ng -- config projects.frontend.architect.serve.options.proxyConfig` returned `proxy.conf.json` |
| Compose configuration | Pass | `docker compose config`, exit 0; confirmed frontend, API, and database published ports bind to `127.0.0.1`; no warning reported. |
| M1.6 Compose configuration | Pass | Copied `.env.example` to ignored `.env`; `docker compose config` and `docker compose -f docker-compose.test.yml config` both exited 0. Parsed both outputs: main published ports `3000`, `4200`, `3306`, and test port `3307` all bind to `127.0.0.1`. |
| Local credential/build-context review | Pass | `.env.example` contains only synthetic development values; `.env` is ignored by Git. Backend/frontend `.dockerignore` exclude `.env`, `.env.*`, and `*.env`. Test database credentials are explicitly synthetic. No production credentials are included in Compose or Docker build contexts. |
| Docker runtime versions | Pass | `backend/Dockerfile.dev` and `frontend/Dockerfile.dev` use `node:24-alpine`, matching `.github/workflows/ci.yml` Node 24. |
| Prisma schema validation | Pass, no DB connection | `DATABASE_URL` set to a synthetic local URL; `npm.cmd exec prisma -- validate`, exit 0. |
| Initial schema SQL preview | Pass, followed by database verification | `npm.cmd exec prisma -- migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, exit 0; generated create-table/index SQL with `DECIMAL(15,2)`. Applied to a disposable database as recorded below. |
| Disposable MySQL migration | Pass | Started `mysql:8.0` as `bahi-khata-migration-check`, with no persistent volume, bound to `127.0.0.1:3307`; `npm.cmd exec prisma -- migrate deploy` applied `20261021000000_init`; `prisma migrate status` reported schema up to date; MySQL showed `_prisma_migrations`, `categories`, and `transactions`, with `transactions.amount` as `DECIMAL(15,2)`. Container was stopped and auto-removed after verification. No existing database container or data was used. |
| Fresh and repeated startup initialization | Pass | `docker compose -f docker-compose.test.yml up -d --wait mysql-test`; from `backend/`, `npm.cmd run db:init` twice with synthetic `DATABASE_URL=mysql://pfuser:pfpass@127.0.0.1:3307/pftracker_test`. First run applied `20261021000000_init` and seeded 10 categories; second reported no pending migrations and seeded again. Aggregate MySQL query returned `10` total / `10` defaults and `1` completed migration. Disposable service was removed with `docker compose -f docker-compose.test.yml down`. |
| Default-category seed tests | Pass | `npm.cmd test -- prisma/seed-default-categories.spec.ts`; 1 file and 2 tests passed for fresh and repeated seed behavior |
| Backend lint/tests/build after local setup changes | Pass | `npm.cmd run lint`, `npm.cmd test` (16 tests across 4 files), and `npm.cmd run build`, exit 0 |
| `/api` development proxy runtime | Pass | With a temporary local mock API, `GET http://127.0.0.1:4201/api/transactions` returned `{"path":"/transactions"}`; this confirms `/api` is stripped and forwarded to port 3000. Mock and dev servers were stopped afterward. |
| NestJS local startup smoke | Blocked | `npm.cmd run start:prod` exited during Prisma initialization with `P1012` because this shell did not load `DATABASE_URL`. No database was contacted or changed. |
| Frontend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Remote CI | Not evidenced | No successful workflow run has been recorded for a designated release candidate |
| Staging deployment/validation | Not evidenced | No staging target or test record is available |
| Database migration | Pass on fresh disposable database | Initial migration applied and schema checked as described above. This does not validate existing data, production migration compatibility, or restore behavior. |
| Database backup/restore | Not run | No backup identity, restore rehearsal, or recovery evidence is available |

Passing local checks do not establish CI success or production readiness. The backend suite has limited coverage. The production Nginx example was inspected but not executed because no Nginx staging host is available.

## Safe next readiness work

1. Implement and verify authentication plus single-owner authorization before any network exposure; replace or safely disable placeholder instrumentation credentials.
2. Assess any Float-to-decimal conversion with synthetic data and define how this migration applies to any existing data.
3. Complete local end-to-end startup and all checks. Create a release commit after review, then verify a successful remote CI run for that commit.
4. Identify exact staging and later production resources, domains, operators, network rules, TLS configuration, and secret sources. Validate staging with synthetic records.
5. Document and execute backup restoration and release rollback rehearsals, including recovery from a partially applied migration.

Reassess readiness after these items have evidence. Until then, deployment remains **BLOCKED** and no deployment approval request should be issued.
