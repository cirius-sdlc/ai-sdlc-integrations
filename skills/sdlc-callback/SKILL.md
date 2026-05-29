---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/filing-callbacks.md
generated-section: Summary for agents
source-sha256: ef21f29d32d1ad19898d92ac85ee330bce0561053fe089f67d7dfb36c01d011d
pulled-at: 2026-05-29T14:51:30.135Z
name: sdlc-callback
description: "AI-SDLC: file a callback when an upstream artifact needs correction mid-slice. Use whenever the work in the current phase contradicts a prior DDD, SDD, UDD, or VDD artifact; never silently amend upstream."
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
