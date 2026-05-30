---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/working-a-slice.md
generated-section: Summary for agents
source-sha256: dadbf3a3c123c75cb7b7c620d0b67ce32d8efdfbba5b98170df4ef37d04f0cb0
pulled-at: 2026-05-30T09:50:34.452Z
name: sdlc-slice
description: "AI-SDLC: how to walk one slice from DDD through ADD. Use when starting a new feature, bug fix, or refactor; when recording phase runs; when interpreting verify-gate output."
purpose: Walk one unit of work through the DDD to ADD phase chain, recording each phase as an audited run.
inputs:
  - an attached project id
  - a short slice title
  - a risk tier (T0/T1/T2)
outputs:
  - a slice id
  - one recorded run per phase
  - an evidence-gate result at ADD
steps:
  - aisdlc slice start --project <name> --title <title> --risk <tier> to obtain a slice id.
  - "For each phase in order DDD, SDD, UDD, VDD, ADD: aisdlc run-phase --slice <id> --phase <P> --outcome pass."
  - Inspect with aisdlc query state runs --slice <id> and aisdlc verify --slice <id>.
exit_criteria:
  - Every phase is recorded in order and the ADD evidence gate accepts, auto-completing the slice.
constraints:
  - Do not record a phase that did not happen.
  - Do not mark outcome=pass when the evidence gate would refuse.
  - Do not re-run slice start expecting it to reset state; it starts a new slice.
---

## Summary for agents

The minimum sequence for one slice (project already attached):

```sh
aisdlc slice start --project <name> --title "<short title>" --risk T1
# prints slice_id: <ULID> (plus project/title/phase/tier/status)

# For each phase in order DDD, SDD, UDD, VDD, ADD:
aisdlc run-phase --slice <slice_id> --phase <PHASE> --actor <name> \
    --outcome pass --notes "<what you did>"

# Inspect at any point:
aisdlc query state runs --slice <slice_id>
aisdlc verify --slice <slice_id>
```

Rules:

1. Phases must be recorded in order. The harness refuses backward or
   skipping transitions (ADR-0004).
2. ADD with outcome `pass` triggers the evidence gate
   (`aisdlc verify`) automatically. The slice is auto-completed only
   if the gate accepts (ADR-0009).
3. Outcomes other than `pass` (`fail`, `partial`, `cancelled`) leave
   the slice open at the recorded phase. You may re-run that phase or
   file a callback.
4. Risk tier (`T0`/`T1`/`T2`) determines the evidence set the gate
   demands (ADR-0010). Set it once at `slice start`; raising risk
   later is allowed via a separate update path, lowering is not.

Do not:

- Record a phase that didn't happen. The audit trail is the record of
  reality; lying corrupts every downstream query.
- Mark `outcome=pass` when the artifact gate would refuse the
  evidence. The harness will refuse to complete the slice, but the
  run row exists; you've now added noise.
- Re-run `slice start` thinking it will reset state. It starts a new
  slice; the old one stays open.
