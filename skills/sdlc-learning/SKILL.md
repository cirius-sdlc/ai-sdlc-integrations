---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/promoting-learnings.md
generated-section: Summary for agents
source-sha256: e25fd548b8796bdce6398f9efd5ff5b6dbebcca0967add7b74e63af8b1f49f1c
pulled-at: 2026-05-29T14:51:30.135Z
name: sdlc-learning
description: "AI-SDLC: record observations and propose learning promotions. Use when recurring insights cross threshold and may belong in durable project memory. Never auto-writes to memory; promotion is operator-curated."
---

## Summary for agents

Record observations during phase runs. The harness tracks them as
`learning.candidate` events. When a candidate accumulates enough
evidence (default: 3 observations across 1 project, no contradicting
callback), it becomes eligible for promotion. Promotion is a
deliberate operator action, not automatic.

```sh
# Record observations during normal run-phase calls:
aisdlc run-phase --slice <id> --phase <P> ... \
    --notes "obs: <terse observation in domain language>"

# Periodically inspect:
aisdlc promote-learning list                  # all candidates
aisdlc promote-learning assess --learning <id>  # is this one eligible?

# When eligible:
aisdlc promote-learning promote --learning <id> \
    --target memory/<project>.md
```

Critical rule:

**`aisdlc promote-learning promote` does NOT write to `memory/<...>.md`.**
It records a `Promotion` row and emits `learning.promoted`, naming the
target path and the evidence refs. **You** (the operator) then open
that file and write the learning into it as a deliberate edit. This
is the "PR-shaped, not autofill" rule (ADR-0011 + memory.md).

Do not:

- Treat `promote-learning promote` as the act of remembering. It is
  the act of *flagging* a candidate as ready. The remembering is a
  separate human-or-agent edit to `memory/<project>.md`.
- Promote candidates that haven't met threshold. The CLI will refuse,
  but the deeper reason is that low-threshold promotion creates
  noise in durable memory and erodes its signal.
- Write observations that aren't observations. "Implemented feature
  X" is a phase-run note. "Calling endpoint A before endpoint B
  yields stale data" is an observation. Use phase-run `--notes` for
  the first, `--notes "obs: ..."` (or whatever convention your
  workspace adopts) for the second.
