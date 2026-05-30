---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/bootstrap-workspace.md
generated-section: Summary for agents
source-sha256: 8ed225f2ca913c14db8c9578357f89575b3485bac7b2b254314e609d7b37007f
pulled-at: 2026-05-30T09:50:34.451Z
name: sdlc-bootstrap
description: "AI-SDLC: take a fresh workspace from zero to a green aisdlc doctor. Use when the workspace has not yet been initialized, governance has not been vendored, or doctor reports failures."
purpose: Take a fresh project directory from zero to a green aisdlc doctor.
inputs:
  - workspace path
  - a governance source path (for init --governance)
outputs:
  - an initialized .workflow/ state store
  - vendored <workspace>/ai-sdlc/ governance
  - a starter AGENTS.md
steps:
  - Run aisdlc init --governance <path> to create state, vendor governance, and write AGENTS.md.
  - "Run aisdlc doctor and expect overall: ok."
  - If doctor still fails, read its remediation lines literally; do not improvise.
exit_criteria:
  - "aisdlc doctor reports overall: ok with no failing checks."
constraints:
  - Do not edit <workspace>/ai-sdlc/ after vendoring.
  - Do not create files inside <workspace>/.workflow/ by hand.
  - Do not invent a governance tree when one is missing; supply --governance or vendor manually.
---

## Summary for agents

1. `aisdlc init --governance <path>` — creates
   `<workspace>/.workflow/state.db`, vendors governance into
   `<workspace>/ai-sdlc/`, and writes a starter `AGENTS.md`. Exit 0.
2. `aisdlc doctor` — expect all checks ok, `overall: ok`.
3. If `doctor` still fails, **read its remediation lines literally**.
   They name the file or directory missing. Do not improvise.

Do not:

- Edit `<workspace>/ai-sdlc/` after vendoring. It is contract input,
  read-only to the harness and to you.
- Create files inside `<workspace>/.workflow/` by hand. The harness
  owns that directory.
- Run a bare `aisdlc init` and then expect the governance error to
  disappear on its own. It will not; supply `--governance` or vendor
  manually (see below).

If a step fails, capture the full output (stdout + stderr + exit code)
before retrying. The harness emits enough detail to diagnose without
guessing.
