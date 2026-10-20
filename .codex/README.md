# AI development workflow

This repo uses Codex project instructions and three focused subagents. The coordinator owns the request, assigns independent bounded tasks, integrates the changes, and asks a `quality_reviewer` agent to inspect the final diff. Codex reads the root `AGENTS.md` and the agent definitions in `.codex/agents/`; `.codex/config.toml` enables up to three concurrent subagents.

## Routine feature flow

1. Coordinator reads relevant implementation and requirements, then defines the expected behavior and acceptance checks.
2. Independent frontend and backend work can run in parallel after agreeing on the API contract. Otherwise, do dependent work in order.
3. Implementer adds regression coverage and runs the relevant tests, lint, and build.
4. Coordinator integrates and runs cross-layer checks. `quality_reviewer` performs an independent, read-only review of the final diff.
5. Coordinator fixes findings, checks the final diff for secrets and accidental data, and reports evidence and any remaining limitations.
6. Human input is reserved for material product choices, conflicting requirements, sensitive-data decisions, destructive data changes, and production or external actions. Routine implementation and verification do not wait for approval.

## CI

The GitHub Actions workflow runs backend and frontend checks independently for pull requests and pushes. It is a merge signal, not a deployment workflow. Production rollout remains a human checkpoint.

## Current known context

The requirements mention browser local storage, while the implemented architecture uses a NestJS API and MySQL. The Angular root template and starter tests may still contain scaffold content. Agents should confirm the actual behavior before relying on these details and avoid broad cleanup during unrelated tasks.
