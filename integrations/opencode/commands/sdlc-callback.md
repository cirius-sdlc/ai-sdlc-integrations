---
description: File a callback against an upstream artifact (reverse-edge gesture)
---

The user wants to file a callback — a recorded statement that the
current phase has found a prior upstream artifact wrong. Per
`ai-sdlc/flow.md`, callbacks are the only reverse edges through the
DDD → SDD → UDD → VDD → ADD chain.

# Current open slices

!`aisdlc query state slices --status open --json 2>/dev/null || echo '[]'`

# Task

Walk the user through filing one callback. Take inputs one at a
time. Validate the reverse-edge constraint before invoking the
harness — `aisdlc callback file` rejects forward edges, but catching
it early saves a turn.

If the user is unfamiliar with callbacks, briefly ground them: a
callback is filed *from* a downstream phase *against* a prior
upstream artifact. The chain is DDD → SDD → UDD → VDD → ADD; the
*target* must come earlier in the chain than the *origin*.

## 1. Identify the slice

The callback attaches to one slice. Use the JSON above to confirm
which open slices exist. Ask the user which slice this callback
belongs to (typically the slice the user is currently working on).
If the user says "the current slice" without an id, ask for the
specific slice id; the command needs the exact handle.

If no open slices exist, callbacks can still be filed against
completed slices (the harness allows it; downstream phases sometimes
surface evidence late). Ask the user to supply the slice id either
way.

## 2. Identify the origin phase

The phase the user is currently in — i.e. the phase that *discovered*
the upstream artifact is wrong. Ask the user. Valid values: `DDD`,
`SDD`, `UDD`, `VDD`, `ADD`.

If the user says `DDD`: there is no upstream phase to file against.
Explain and stop — DDD has no predecessor in the chain. Suggest the
user is probably thinking about an exception (`aisdlc query state
exceptions`) or a learning candidate, not a callback.

## 3. Identify the target phase

The phase whose artifact the user believes is wrong. Must come
*before* the origin in the chain.

Valid pairings (origin → allowed targets):

- `SDD` → `DDD`
- `UDD` → `DDD`, `SDD`
- `VDD` → `DDD`, `SDD`, `UDD`
- `ADD` → `DDD`, `SDD`, `UDD`, `VDD`

If the user names a forward edge (e.g. origin=`SDD`, target=`UDD`),
explain that callbacks are reverse-only and re-ask. Do not attempt
to invoke `aisdlc callback file` with a forward edge — it will exit
1 and the turn is wasted.

## 4. Subject reference

The path or anchor of the wrong artifact. Conventionally
`docs/<phase>/<file>.md` or similar workspace-relative path. Ask
the user to be specific (a path the harness can resolve later).

## 5. Reason

One sentence stating *why* the upstream artifact is wrong. This
becomes the durable record. Push back on vague reasons ("it's
wrong"); ask for the concrete contradiction.

## 6. Actor

The user's identity for the audit trail. If known from the session,
use it; otherwise ask.

## 7. File the callback

Once all inputs are confirmed, invoke:

```
aisdlc callback file \
    --slice <slice-id> \
    --origin <O> --target <T> \
    --subject <subject-ref> \
    --reason "<reason>" \
    --actor <actor> \
    --json
```

Surface the resulting callback id to the user. Explain the next
step: the callback is now `open`; the slice owner (or whoever
authority class points at, per `ai-sdlc/flow.md`) reconciles it via
`aisdlc callback reconcile --id <callback-id> --resolution <path>
--evidence <evidence-id> --actor <actor>` or rejects it via
`aisdlc callback reject --id <callback-id> --reason "<r>" --actor
<actor>`.

# Behavioral guardrails

- Never invoke `aisdlc callback file` with a forward edge. Validate
  the origin/target pairing in conversation first.
- Never invent a slice id; the JSON above is ground truth for open
  slices. If the user names a slice not in the list, surface that
  and ask for confirmation (it may be a completed slice, which is
  valid).
- Never invent a subject or reason. The whole point of a callback
  is the durable, specific record; vague inputs defeat that.
- The `sdlc-callback` skill (if loaded) provides additional context
  about callbacks. Defer to it for conceptual questions; this
  command is the gesture, not the explainer.
