# AGENTS.md

Map for agents working on `ai-sdlc-integrations`. This file is a table of
contents, not a manual.

## What this repo is

Plane-5 implementation per `../ai-sdlc/formula.md`. Vendor-neutral skill
content + per-host integration loaders. Reads from
`../ai-sdlc-guideline/docs/agent-integration/` (read-only). Writes only to
its own `skills/` tree and (at install time, with user opt-in) to the
target agent host's config directory.

## Source inputs (read-only)

- Governance: `../ai-sdlc/`
- Harness CLI surface: `../ai-sdlc-harness/`
- Canonical agent-integration prose: `../ai-sdlc-guideline/docs/agent-integration/`

## Repository map

- [`README.md`](README.md) — purpose and current state.
- [`skills/`](skills/) — five generated skill files, one per canonical
  agent-integration concern.
- [`integrations/`](integrations/) — per-host loaders (today: `opencode/`).
- [`integrations/README.md`](integrations/README.md) — recipe for adding
  a new host.
- [`scripts/pull-skills.ts`](scripts/pull-skills.ts) — section extractor;
  the only place skills are regenerated.
- [`scripts/pull-skills.config.json`](scripts/pull-skills.config.json) —
  source/destination spec for the five skills.

## Working rules

- **Do not edit `skills/<name>/SKILL.md` directly.** Skills are generated
  from doc-page sections; the next pull refuses with exit code 3 if a
  mirror has been hand-edited. Change the source page in
  `../ai-sdlc-guideline/docs/agent-integration/` and re-run `npm run pull`.
- **Do not name agent vendors in `skills/` content.** Skill content is
  vendor-neutral by the framework's rules; vendor identity lives in
  `integrations/<host>/`, never above it. (This mirrors
  `ai-sdlc-harness/internal/invariant/arch_test.go`'s spirit.)
- **Do not mutate any sibling repo.** `../ai-sdlc/`, `../ai-sdlc-harness/`,
  `../ai-sdlc-guideline/` are read-only from this repo. Pull only.
- **Do not pretend to be governance.** Per `formula.md`, plane 5 is a
  category, not v1 artifact-bearing. If a change here requires adding
  prose to `formula.md` or asserting a new contract, that's a governance
  change in `ai-sdlc/`, not here.
- **Host installers are opt-in.** No installer here is invoked by
  `ai-sdlc-harness/install.sh`. Each host's `install.sh` is run by the
  user explicitly.

## Cross-document consistency

- Change to the five planes in `../ai-sdlc/formula.md` → review this
  README and `integrations/README.md` for "plane 5" language.
- Change to a source page in
  `../ai-sdlc-guideline/docs/agent-integration/<page>.md` (specifically its
  `## Summary for agents` section) → `npm run pull` propagates it to the
  corresponding skill.
- Change to skill frontmatter shape (`name`, `description`) → review every
  host loader in `integrations/<host>/`.
- New host added under `integrations/<host>/` → update `integrations/README.md`
  table; pattern-match on the opencode loader for structure.

## Verification

- `npm run typecheck` — TS sanity check on `pull-skills.ts`.
- `npm run pull` — must be idempotent; re-run reports `skipped`, never
  `conflict` on an unedited tree.
- Per-host installer smoke test: `<host>/install.sh --dry-run --prefix /tmp/test`
  must list the right skills and exit 0 without writing anything.
- A hand-edit conflict test on any `skills/<name>/SKILL.md`: re-running
  pull must exit 3.

## Out of scope

- MCP servers, tool wrappers, runtime agent integrations.
- Specific agent product names anywhere in `skills/`.
- Host integrations beyond what's already wired in `integrations/<host>/`.
  Adding one is its own slice; the recipe is in `integrations/README.md`.
