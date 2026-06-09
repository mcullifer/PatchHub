# Agentic Workflow

## Small Changes

1. Inspect the relevant files and existing patterns.
2. Make the smallest coherent change.
3. Format touched files.
4. Run targeted checks.
5. Run `npm run validate` before calling the work complete.

## Large Refactors

Use `.plans/<name>.md` as the source of truth. Do not rely on chat history for multi-session work.

Tests added during a refactor should be named for the production API, component, or behavior they cover. Phase names and plan names belong in `.plans/`, not in test filenames.

A large refactor plan should include:

- durable goal
- execution mode
- non-goals
- affected areas
- invariants
- work units
- completed work
- remaining work
- known failures
- validation status

## Execution Mode

Each plan should state whether intermediate breakage is allowed.

Examples:

- Continuous stability: every step should keep typecheck/build behavior clean.
- Hard cutover: intermediate steps may break runtime/typecheck/lint, but only while the plan is actively in progress. The final gate still requires `npm run validate`.

## Continuing Work In A New Session

Start by reading:

```text
AGENTS.md
.docs/workspace-layout.md
.docs/scripts.md
.plans/<name>.md
```

Then restate the remaining scope and continue from the plan. Keep the plan updated as work is completed or blockers are discovered.

## Baseline Failures

If the repo already has validation failures, record them in the active `.plans` document before starting broad work. Do not confuse pre-existing failures with failures introduced by the current change.
