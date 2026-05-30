---
description: Bootstrap an AI-SDLC workspace (init + vendor governance + place workspace AGENTS.md)
---

The user wants to bootstrap an AI-SDLC workspace in the current
directory. This is the first slash command that may run **before**
the workspace is fully initialized; treat the probes below as ground
truth for which steps still need to run.

# Current location

!`pwd`

# Workspace state (doctor output)

!`aisdlc doctor --workspace . 2>&1 | head -25`

# Governance source probe (sibling-checkout convention)

Per `ai-sdlc/workspace.md`, the canonical layout has governance as a
sibling directory (`../ai-sdlc/`). Probe for it:

!`test -d ../ai-sdlc && test -f ../ai-sdlc/formula.md && echo "sibling-found: $(cd ../ai-sdlc && pwd)" || echo "sibling-not-found"`

# Existing files in workspace (brownfield detection)

!`ls -A . 2>/dev/null | head -30`

# Task

Use the doctor output above to identify the workspace state, then
take the corresponding action. The user may have supplied `$1` as
an explicit governance source path; if so, it overrides any probe.

## State 1 — Already bootstrapped

Doctor reports `overall: ok` (state present, governance present).
The workspace is ready to use.

- Congratulate the user; do **not** re-run init.
- Suggest next steps:
  - `/sdlc-attach` to register a new project.
  - `aisdlc query state projects` to see existing projects.
- Stop.

## State 2 — Fresh workspace

Doctor reports `state-file: fail (missing)` and
`governance: fail (no AI-SDLC governance found)`.

1. Determine the governance source path:
   - If `$1` is non-empty: use `"$1"`.
   - Else if the sibling probe found `../ai-sdlc`: propose it to the
     user and confirm.
   - Else: ask the user for the absolute or relative path to a local
     governance checkout. Do not invent one.

2. Once the source path is confirmed, run:

   ```
   aisdlc init --workspace . --governance "<path>"
   ```

   This single invocation initializes the state file, vendors
   governance into `<workspace>/ai-sdlc/`, and writes
   `<workspace>/AGENTS.md` from the template (default
   `--agents-md greenfield`).

3. Re-run `aisdlc doctor --workspace .` and surface the result to
   the user.

4. Suggest next step: `/sdlc-attach` to register the first project.

## State 3 — Partial: state present, governance missing

Doctor reports `state-file: ok` and `governance: fail`.

1. Same governance source resolution as State 2.
2. Run `aisdlc init --workspace . --governance "<path>"`. The state
   file is idempotently kept; governance vendoring is the new work;
   AGENTS.md placement triggers automatically because the source
   template just became available.
3. Re-run `aisdlc doctor` and surface the result.
4. Suggest `/sdlc-attach`.

## State 4 — Partial: governance present, AGENTS.md missing

Doctor reports `state-file: ok` and `governance: ok`. Inspect the
`existing files` probe above: if `AGENTS.md` is not in the listing,
the workspace AGENTS.md was never placed.

1. Run `aisdlc init --workspace . --agents-md greenfield`. This is
   a no-op for state, no-op for governance (already present), and a
   write for AGENTS.md (template copy via the no-clobber path).
2. Re-run `aisdlc doctor` and surface the result.
3. Suggest `/sdlc-attach`.

## State 5 — Other partial / unclear

If the doctor output does not fit any of the above shapes (e.g.
schema is behind the binary, integrity check failed), do **not**
guess. Surface the doctor remediation messages verbatim and ask the
user how to proceed. Bootstrap is not the right command for repair.

## Brownfield context (parallel to the cases above)

If the existing-files probe shows the workspace already contains
code or other artifacts (e.g. `src/`, `package.json`, `.git/`,
language-specific config), tell the user this is a brownfield setup
**but do not stop**. The harness's no-clobber policy protects all
existing files: bootstrap only writes to `.workflow/`, `ai-sdlc/`,
and the workspace-root `AGENTS.md`. No existing file is touched.

Note the brownfield framing once for the user's awareness, then
proceed with the appropriate state-case logic above.

# Behavioral guardrails

- **No clobber, ever.** The harness's no-clobber policy
  (per ADR-0021) is the safety net. Never use `--force`-flavored
  flags during bootstrap. If a step would clobber, surface the
  conflict and ask the user.
- **No re-init on healthy workspaces.** If State 1 applies, stop.
  The user can re-run other commands; they do not need bootstrap.
- **Path quoting.** Always use `"$1"` (with quotes) so paths with
  spaces do not break. Do the same for any path you derive from
  the sibling probe.
- **No governance invention.** If the sibling probe fails and `$1`
  is empty, ask. Never substitute a guess.
- **Verify, do not assume.** After every state-changing invocation,
  re-run `aisdlc doctor` and report the new state. Bootstrap is
  cheap to recheck.
- **Defer to the `sdlc-bootstrap` skill** (if loaded) for
  conceptual questions about what a workspace is. This command
  drives the gesture; the skill explains the framework.
