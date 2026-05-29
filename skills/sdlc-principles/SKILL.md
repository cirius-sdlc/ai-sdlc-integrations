---
generated-from: ../ai-sdlc-guideline/docs/agent-integration/principles.md
generated-section: Summary for agents
source-sha256: f3e64db08fb7d7637ca811b485c8f3fecaab790d817be0e8622d6dbe100ef2ba
pulled-at: 2026-05-29T14:51:30.133Z
name: sdlc-principles
description: "AI-SDLC primer: the three rules an agent must internalize (governance is contract input, evidence over assertion, vendor-neutral source). Loads when working in an AI-SDLC workspace and no more specific skill applies."
---

## Summary for agents

Three rules. Internalize all three:

1. **Governance is contract input.** The `<workspace>/ai-sdlc/` tree
   is read-only. Read it to know what to do. Do not edit it as a side
   effect of any slice. If a slice seems to require a governance
   change, file a callback (target `GOVERNANCE`) or surface the
   contradiction; do not paper over it. (ADR-0001.)
2. **Evidence over assertion.** A phase is not complete because you
   say it is. It is complete when the artifact exists and a verifier
   accepts it. The harness's evidence gate refuses ADD completion if
   evidence is missing; in `blocking` adoption mode the command exits
   3. For every claim, expect to be asked for the evidence shape that
   backs it. (ADR-0004, ADR-0010.)
3. **Vendor-neutral in source.** Source code — Go, contracts, ADRs,
   site docs — must never name specific agent products, model names,
   or vendors. The harness's architecture test fails the build on any
   such mention. Vendor identity lives only inside the executor
   adapter that wraps that vendor. Everything else speaks in
   capabilities and gaps. (ADR-0005, ADR-0014.)

Do not:

- Treat governance as malleable mid-slice.
- Mark `outcome=pass` when verifying evidence is absent.
- Mention a specific agent vendor in any committed source or doc.
