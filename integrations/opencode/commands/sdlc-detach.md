---
description: Detach a project, with a rework-impact review first
---

The user wants to detach project **$1** from this AI-SDLC workspace.

# Rework impact analysis

!`aisdlc rework-impact $1 --json 2>&1`

# Task

The JSON above is the authoritative cross-aggregate view for project
`$1`. Use it as ground truth.

## 1. Handle errors first

If the JSON output above is an error message (not valid JSON), report
the exact error to the user and stop. Common cases:

- **No `$1` supplied**: tell the user the usage is `/sdlc-detach <project-id>`
  and stop.
- **`project "X" not found`**: suggest
  `aisdlc query state projects --project-status all` to find the
  correct id.
- Anything else: surface the message verbatim.

## 2. Summarise the inventory

Translate the JSON's `slices`, `runs`, `events`, `callbacks`,
`evidence`, `learning_candidates`, `exceptions`, `coverage_metrics`,
`bootstrap_state`, and `filesystem` sections into a short
human-readable summary. Mention the project's mission and current
status (active or detached).

If the project is already **detached**, tell the user and stop —
there is nothing further to do via `detach`.

## 3. Walk each guidance suggestion

The JSON has a `guidance` array. For each suggestion, frame the
trade-off for the user:

- **`open-work`** — list the blocker refs from the JSON's `blockers`
  array. Ask: resolve them first, or proceed with `--force`?
- **`sole-source-learnings`** — explain that without ongoing
  observations from this project, these learnings may stale. Ask:
  retire them now (manual; the harness has no auto-retire), leave
  them, or defer the decision?
- **`promoted-learnings`** — informational. The promotion stands;
  no action needed.
- **`failed-evidence`** — flag for review. Ask whether each failure
  was resolved before detach (audit trail is preserved either way).
- **`active-exceptions`** — ask: still valid post-detach, or do
  they expire with the project?
- **`project-filesystem`** — note that files at the project location
  remain on disk after detach. Ask whether to archive out of band.
- **`clean-historical-record`** — confirm the detach is safe.

Take input one item at a time. Wait for user confirmation before
moving on. Some items only require acknowledgement, not action.

## 4. Decide the detach mode

After walking the guidance:

- **No blockers, user wants to proceed**:
  `aisdlc detach $1`
- **Blockers exist, user chose to resolve first**:
  - For open slices: suggest closing each via the slice's natural
    completion path (run remaining phases, or `aisdlc slice cancel`
    when that exists).
  - For open callbacks: suggest `aisdlc callback reconcile` or
    `aisdlc callback reject`.
  - For open learning candidates: suggest `aisdlc promote-learning`
    or wait for gardener drop.
  - Stop after listing the paths. The user re-runs `/sdlc-detach`
    after resolving.
- **Blockers exist, user chose to force**:
  - Ask for a one-sentence `--reason` (recorded in the
    `project.detached` event payload).
  - Run: `aisdlc detach $1 --force --reason "<r>"`

## 5. Confirm and suggest cleanup

After a successful detach:

- Confirm to the user with the detach timestamp.
- If `filesystem.exists` was true in the rework-impact output: remind
  the user the project directory remains on disk; suggest archival
  out of band.
- If sole-source learnings exist: remind the user they were left in
  the registry; if they want retirement, that's a follow-up step.
- Mention that the project remains queryable via
  `aisdlc query state projects --project-status detached` for
  historical reference.

# Behavioral guardrails

- Never run `aisdlc detach` without explicit user confirmation.
- Never improvise about what `aisdlc` will do. The rework-impact
  JSON is truth; the user's confirmation is authority.
- If `--force` is used, ensure `--reason` is supplied. The harness
  rejects `--force` without `--reason`; trying to invoke without it
  wastes a turn.
- When suggesting `aisdlc detach $1 --force --reason "<r>"`, quote
  the reason properly so shell metacharacters don't break the
  command.
