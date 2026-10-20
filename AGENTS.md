# Bahi Khata agent workflow

## Project

Bahi Khata is a personal finance tracker. The Angular app is in `frontend/`; the NestJS API and Prisma/MySQL persistence are in `backend/`. The product requirements and original design notes are in `.kiro/specs/personal-finance-tracker/`. If implementation and spec disagree, report the mismatch and follow the user's latest direction.

## How to work

- Own the request end to end. Inspect relevant code, implement the smallest complete change, add or update focused tests, run relevant checks, and review the final diff.
- Delegate independent exploration, implementation, and review work to the `frontend`, `backend`, or `quality_reviewer` subagents in `.codex/agents/`. Give each task a clear scope, files, and expected result. Do not have multiple agents edit the same files; the coordinator integrates their work and resolves conflicts.
- Use parallel agents when the work is separable. Keep short or tightly dependent changes with the coordinator.
- Never ask the user to approve an action that the coordinator recommends against, is unsafe under known conditions, or lacks prerequisites. State the blocker and continue safe preparatory work autonomously; ask only for a material product decision or missing information that genuinely blocks safe work. For release approval, request approval only after the release candidate and required validation evidence are ready. Separate approval to make a product decision from approval to execute a production action.
- Make routine technical decisions and proceed. Ask the user only at critical checkpoints: material product decisions, conflicting requirements, unclear sensitive-data handling, destructive migrations/operations, or production/external actions. Before asking, complete safe preparatory work and present a concrete review packet: proposed action and scope, changed files/data/systems, evidence from relevant checks, exact validation steps and expected outcomes, user-run validation steps when applicable (concrete commands/screens, where to run them, and expected results), material risks, rollback/recovery steps, and the specific approval requested. If targets or details are unknown, do not invent them: mark the action blocked and keep the user validation steps conditional until the agent has prepared a real, reviewable candidate. For destructive or external actions, wait for explicit approval before executing. Do not ask approval for routine implementation, tests, local builds, or agent delegation.
- Never deploy, publish, merge, contact people, create paid resources, or modify external systems without explicit user authorization. Prepare and validate everything locally first.

## Quality gates

- Treat all financial records as sensitive. Use synthetic data only. Never add secrets, real personal data, transaction dumps, or credentials to source, logs, fixtures, screenshots, or agent prompts.
- Keep authorization, validation, and business rules enforced by the backend; frontend checks are for usability and do not replace server checks.
- Review changes affecting amounts, rounding, dates, category ownership, or summaries for financial correctness. Flag the schema's `Float` amount representation when a change depends on exact currency arithmetic; do not silently expand scope to migrate stored data.
- For database changes, inspect migration and rollback implications. Never drop, reset, or rewrite a database containing user data. Prefer additive migrations and synthetic local databases.
- Do not add dependencies unless existing packages cannot reasonably solve the need. Check package advisories and license implications before adding or upgrading dependencies.
- Add regression tests for changed behavior. Run the relevant frontend/backend tests, lint, and production build when available. Report checks that could not run and why; never claim a check passed without its output.
- Before finishing, review the diff for secrets, unsafe input handling, missing error paths, unintended files, and whether the tests cover the changed behavior. Fix findings before reporting completion.

## Project commands

- Backend: from `backend/`, `npm test`, `npm run lint`, and `npm run build`.
- Frontend: from `frontend/`, `npm test -- --watch=false` and `npm run build`.
- Local stack: `docker compose up --build` from the repository root. Use only synthetic local data.

## Human checkpoints

Routine implementation, code review, tests, dependency analysis, and local builds are agent-owned. At every critical checkpoint, the coordinator must provide the complete review packet defined above and ask one explicit approval question. Never execute a destructive or external action before approval. CI passing does not authorize production deployment or release.

## Code Review Rules

- Flag any exposure of financial records, credentials, or personal data in logs, client bundles, errors, fixtures, or telemetry.
- Flag missing server-side validation or authorization, unsafe mass assignment, injection paths, and permissive cross-origin or cookie handling.
- Flag financial arithmetic that can lose precision, date boundary errors, and summaries that include transactions outside the selected period.
- Flag destructive database changes, unsafe reset behavior, and schema changes without a safe migration path.
- Flag missing regression coverage for behavior changes and any checks reported as passing without evidence.



