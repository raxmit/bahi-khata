# Production Release Readiness

**Assessment date:** 2026-10-21  
**Status:** **BLOCKED**  
**Deployment performed:** No

## Decision

Do not deploy and do not request deployment approval. The product decisions are adopted: MySQL source of truth, single owner, local-only API until authenticated, and INR with exact two-decimal storage/API. The repository still has no release commit, implemented authentication boundary, verified initial migration, remote CI run, staging evidence, or recovery plan. Lightsail is deferred until end-to-end and release gates are complete.

## Blockers

1. **No release candidate:** `git status` reports no commits on `master`; `HEAD` does not resolve. All project files are untracked. There is no specific release commit to approve or deploy.
2. **Authentication is not implemented:** The API has no authentication or owner authorization. Host startup defaults to loopback; Compose host ports are configured to bind to loopback, but runtime exposure has not been verified because Docker is unavailable. `backend/src/app.module.ts` also still contains placeholder observation credentials (`YOUR_APP_KEY` and `YOUR_APP_SECRET`). Do not expose this API to a network.
3. **Migration is not database-verified:** An initial create-tables SQL migration was generated from the current schema and reviewed for destructive statements. It has not been applied to a disposable MySQL database or checked against any existing data. Any existing Float values need inventory, backup, and conversion review.
4. **Disposable DB validation is currently unavailable:** `docker info` cannot access the local Docker Desktop engine (`Access is denied`). No container or database was started or modified. Prisma did generate schema-only SQL without connecting to a database.
5. **Remote CI and release candidate are missing:** Project files are uncommitted/untracked and there is no remote workflow run. Local checks do not satisfy the CI gate.
6. **No staging evidence:** No staging target, URLs, deployment record, or synthetic end-to-end validation results are available.
7. **No identified production targets:** The design mentions Lightsail instances and a managed MySQL database but gives no actual hostnames/IPs, account/region, database identity, DNS name, operator, or firewall/TLS evidence. Deployment is deferred by decision.
8. **No verified rollback/recovery:** No release rollback steps, database backup identity, restore test, or migration recovery procedure is documented or verified.

## Local check evidence

Commands were run from the relevant package directories on the assessment date. Initial PowerShell invocations of `npm` were rejected by execution policy; retrying with `npm.cmd` produced these results. Test/build commands that failed with sandbox `spawn EPERM` were retried outside the sandbox.

| Check | Result | Evidence |
|---|---|---|
| Backend lint | Pass | `npm.cmd run lint`, exit 0 |
| Backend tests | Pass, limited coverage | `npm.cmd test`, exit 0; 14 tests passed in 3 files after exact-decimal tests were added |
| Backend build | Pass | `npm.cmd run build`, exit 0 |
| Backend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Frontend tests | Pass | `npm.cmd test -- --watch=false`; 3 files and 8 tests passed, including exact INR input/formatting cases |
| Frontend production build | Pass | `npm.cmd run build`, exit 0 |
| Angular serve proxy configuration | Pass | `npm.cmd exec ng -- config projects.frontend.architect.serve.options.proxyConfig` returned `proxy.conf.json` |
| Compose configuration | Pass | `docker compose config`, exit 0; confirmed frontend, API, and database published ports bind to `127.0.0.1`; no warning reported. |
| Prisma schema validation | Pass, no DB connection | `DATABASE_URL` set to a synthetic local URL; `npm.cmd exec prisma -- validate`, exit 0. |
| Initial schema SQL preview | Pass, not a DB migration test | `npm.cmd exec prisma -- migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, exit 0; generated create-table/index SQL with `DECIMAL(15,2)`. Saved as the initial migration; it has not been applied. |
| `/api` development proxy runtime | Pass | With a temporary local mock API, `GET http://127.0.0.1:4201/api/transactions` returned `{"path":"/transactions"}`; this confirms `/api` is stripped and forwarded to port 3000. Mock and dev servers were stopped afterward. |
| NestJS local startup smoke | Blocked | `npm.cmd run start:prod` exited during Prisma initialization with `P1012` because this shell did not load `DATABASE_URL`. No database was contacted or changed. |
| Frontend dependency audit | Pass | `npm.cmd audit --audit-level=high`; 0 vulnerabilities reported |
| Remote CI | Not evidenced | No commit or workflow run is available |
| Staging deployment/validation | Not evidenced | No staging target or test record is available |
| Database migration/restore | Not run / not available | Initial migration exists but no disposable MySQL runtime was available; no migration apply, backup, or restore rehearsal occurred |

Passing local checks do not establish CI success or production readiness. The backend suite has limited coverage. The production Nginx example was inspected but not executed because no Nginx staging host is available.

## Safe next readiness work

1. Implement and verify authentication plus single-owner authorization before any network exposure; replace or safely disable placeholder instrumentation credentials.
2. Validate the initial Prisma migration on a disposable database; verify fresh setup/seed behavior and assess any Float-to-decimal conversion with synthetic data.
3. Complete local end-to-end startup and all checks. Create a release commit after review, then verify a successful remote CI run for that commit.
4. Identify exact staging and later production resources, domains, operators, network rules, TLS configuration, and secret sources. Validate staging with synthetic records.
5. Document and execute backup restoration and release rollback rehearsals, including recovery from a partially applied migration.

Reassess readiness after these items have evidence. Until then, deployment remains **BLOCKED** and no deployment approval request should be issued.
