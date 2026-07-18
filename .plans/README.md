# PatchHub Plans

Use this folder for implementation plans that can survive handoffs between agent sessions.

## When to Create a Plan

Create a plan for work that has any of these traits:

- It changes more than one route, service, schema, or component family.
- It involves ambiguous product behavior or multiple implementation options.
- It requires data migrations, background jobs, authentication, external APIs, or caching.
- It may need more than one session to complete safely.

Small bug fixes can skip a plan when the fix and verification are obvious.

## File Naming

Use kebab-case names with a date prefix:

```text
YYYY-MM-DD-short-feature-name.md
```

Examples:

```text
2026-05-08-source-ingestion-pipeline.md
2026-05-08-game-patch-note-detail-page.md
```

## Lifecycle

1. Copy `.plans/templates/feature-plan.md`.
2. Fill in the goal, non-goals, scope, invariants, work items, and validation expectations.
3. Keep the plan updated while implementing.
4. Keep the Agent Handoff section current before stopping if anything remains unfinished.
5. Move completed plans into `.plans/archive/` only after the work is merged or intentionally abandoned.

Plans should be concise, but they must preserve the reasoning future agents need to continue confidently.
