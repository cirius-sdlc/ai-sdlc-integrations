---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/bootstrap-workspace.md
generated-section: Summary for agents
source-sha256: 0f12cc2708211441948de81ddb8392a61f3a304f4e90a65fae9d78f1608f5b15
pulled-at: 2026-05-29T14:51:30.135Z
name: sdlc-bootstrap
description: "AI-SDLC: take a fresh workspace from zero to a green aisdlc doctor. Use when the workspace has not yet been initialized, governance has not been vendored, or doctor reports failures."
---

## Summary for agents

1. `aisdlc init` — creates `<workspace>/.workflow/state.db`. Exit 0.
2. Vendor governance: copy the `ai-sdlc/` source tree to
   `<workspace>/ai-sdlc/`. Do not write into it; treat it as read-only.
3. `aisdlc doctor` — expect all five checks ok, `overall: ok`.
4. If `doctor` still fails, **read its remediation lines literally**.
   They name the file or directory missing. Do not improvise.

Do not:

- Edit `<workspace>/ai-sdlc/` after vendoring. It is contract input.
- Create files inside `<workspace>/.workflow/` by hand. The harness
  owns that directory.
- Re-run `aisdlc init` repeatedly hoping the governance error
  disappears. It will not. Step 2 is required.

If a step fails, capture the full output (stdout + stderr + exit code)
before retrying. The harness emits enough detail to diagnose without
guessing.
