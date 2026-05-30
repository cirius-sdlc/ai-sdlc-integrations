---
description: Attach a project to the AI-SDLC workspace (greenfield or brownfield)
---

The user wants to attach a project to this AI-SDLC workspace.

# Workspace health

!`aisdlc doctor --workspace . 2>&1 | tail -10`

# Current project registry

!`aisdlc query state projects --json 2>/dev/null || echo '{"projects":[]}'`

# Task

Walk the user through attaching a new project. Take inputs one at a
time; do not bundle questions. Do not invent defaults for `mission`.

## 1. Project id

Suggested id: `$1` (if non-empty).

The id is a lowercase slug matching `^[a-z0-9][a-z0-9-]*$`. It is the
permanent handle for this project in workflow state. Cannot be changed
later. If the user typed something that doesn't match, ask for a valid
slug.

Check the registry output above: if the id already exists and is
**active**, stop and tell the user (they may have meant a different
id, or want to use the existing project). If it exists but is
**detached**, ask whether to re-attach with a new identity or pick a
different id.

## 2. Greenfield or brownfield

Ask the user explicitly:

- **Greenfield** — new project with no existing code. The harness will
  create the project directory and scaffold from
  `ai-sdlc/templates/project/`.
- **Brownfield** — existing code base. The harness will register the
  project against the existing directory and copy any missing
  template files alongside (never overwriting).

The distinction shapes the attach invocation and the next-steps
guidance.

## 3. Mission

One sentence stating what this project exists to do. Push back on
placeholders ("test", "TODO", "tbd"); the mission becomes part of
detach-time `rework-impact` analysis later. Ask for a concrete
sentence.

## 4. Location

Relative path from workspace root. Default: `./<id>`. If the user
wants a different path, take it as-is (the harness validates).

## 5. Pre-flight

Inspect the workspace health output above:

- If `[fail] governance` appears and the user chose **greenfield**:
  warn that scaffolding will fail. Offer two paths:
  (a) vendor governance first, then re-run `/sdlc-attach`, or
  (b) attach with `--register-only` (no scaffold; user manages
  project structure manually).
- If `[fail] state-file` appears: the workspace is not initialized.
  Tell the user to run `aisdlc init --workspace .` first and stop.
- Otherwise proceed.

## 6. Run the attach

- **Greenfield, governance present**:
  `aisdlc attach <id> --location <loc> --mission "<m>" -y`
- **Greenfield, governance missing, user chose --register-only**:
  `aisdlc attach <id> --location <loc> --mission "<m>" --register-only`
- **Brownfield**:
  `aisdlc attach <id> --location <loc> --mission "<m>"`

  If this errors with `location does not exist; pass --yes to create it`,
  ask the user whether to create the directory. If yes, retry with `-y`
  appended.

Always include `--actor` if the user has a known identity in this
session.

## 7. Confirm and suggest next

After a successful attach:

- Print the result to the user.
- **Greenfield next step**: suggest
  `aisdlc slice start --project <id> --title "..."` to begin the first
  slice. Recommend a small first slice that demonstrates DDD→ADD.
- **Brownfield next step**: tell the user to walk the adoption flow
  described in `ai-sdlc/adoption.md` — propose baseline DDD/SDD/UDD
  artifacts derived from the existing code, then progress to slice
  work.

# Behavioral guardrails

- Ask one question at a time when the user is ambiguous.
- Never invent a mission. The mission is the only field that cannot
  be inferred from convention; the user must supply it.
- Never run `attach` without explicit confirmation from the user that
  the id, location, and mission are correct.
- Treat the `aisdlc doctor` and `aisdlc query state projects` output
  above as ground truth. Don't claim a project exists/doesn't exist
  contrary to what those commands reported.
