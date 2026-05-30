---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/filing-callbacks.md
generated-section: Summary for agents
source-sha256: e648e47b4babf47c871525c13f5f84a2da00ce5e02411a0ccb702f74b8f937f1
pulled-at: 2026-05-30T10:25:17.707Z
name: sdlc-callback
description: "AI-SDLC: file a callback when an upstream artifact needs correction mid-slice. Use whenever the work in the current phase contradicts a prior DDD, SDD, UDD, or VDD artifact; never silently amend upstream."
purpose: Record a correction against an upstream artifact instead of silently editing it.
inputs:
  - the current slice id
  - the target upstream phase
  - the subject artifact path and the reason it is wrong
outputs:
  - a filed callback with an open status
steps:
  - Identify the upstream phase whose artifact is wrong.
  - File a callback naming origin phase, target phase, subject, and reason.
  - Continue downstream only with the open callback id referenced on the run record.
exit_criteria:
  - A callback exists against the upstream artifact and dependent work references its id until reconciled.
constraints:
  - Never silently amend an upstream artifact to fix a downstream problem.
  - Do not reconcile a callback without the regression verification its issue requires.
---

## Summary for agents

File a callback when, during a phase, you discover that an upstream
phase's artifact is wrong, incomplete, or contradicted by what you're
doing.

```sh
aisdlc callback file --slice <id> \
    --origin <CURRENT_PHASE> \
    --target <UPSTREAM_PHASE> \
    --subject "<file or section being challenged>" \
    --reason "<one sentence: what's wrong>" \
    --authority intra-project-evidence \
    --regression-evidence <evidence_id>     # if authority is intra-project-evidence
```

Rules:

1. **Origin must be the phase you are currently in or just left.**
   You cannot file a callback "on behalf of" a phase you didn't run.
2. **Target must be strictly upstream.** Side-callbacks (DDD → SDD as
   peers) don't exist; the chain is directional.
3. **Authority class is mandatory:**
   - `human-only`: the change requires human judgment (e.g. domain
     re-modeling). The harness records the callback but will not let
     it be reconciled without a human-recorded reconciliation.
   - `intra-project-evidence`: the change is supported by evidence
     already present in this project (a failing test, a contradicting
     observation). The `regression-evidence` flag is mandatory.
4. **Subject must be a file or section reference.** "The SDD" is too
   vague; "`docs/sdd/orders.md#cancellation`" is filable.
5. **Use `--target OPERATOR` when you lack information, not a wrong
   artifact.** This is the needs-input primitive: when you cannot
   proceed because information is absent from the workspace, file an
   `OPERATOR` callback whose `--subject` is the question. It is
   human-only and reconciles when the operator supplies the answer — no
   regression evidence. Halt and ask; never guess or fabricate.

Do not:

- **Silently amend upstream artifacts** and skip the callback. This
  is the single biggest failure mode. If you found yourself editing
  `docs/sdd/...` mid-ADD, stop, revert, file the callback, then
  proceed.
- **File a callback as a comment.** Callbacks are records; they have
  IDs, statuses, and emitted events. A `// TODO: SDD is wrong` is not
  a callback.
- **Reconcile callbacks you filed yourself without evidence.** The
  authority rules exist to prevent the loop "file → resolve →
  pretend it never happened."
