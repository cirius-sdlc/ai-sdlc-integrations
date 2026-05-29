# ai-sdlc-integrations

Plane-5 implementation for AI-SDLC.

Per [`ai-sdlc/formula.md`](../ai-sdlc/formula.md), AI-SDLC has five planes.
Plane 5 — **Agent-host integration** — binds the framework's other four
planes (governance, harness, workspace root, workflow state) to specific
agent hosts. This repository is that binding: vendor-neutral skill content
plus per-host loaders that point at it.

The governance repo defines plane 5 as **a category, not a v1 artifact** —
it declares the plane exists and its anti-bleed rules, but does not endorse
or enumerate specific contents. Everything in this repo is implementation
of that category, outside v1 governance scope. The repo can evolve on its
own cadence without touching `ai-sdlc/`.

## What's in here

- **`skills/`** — five canonical, vendor-neutral skill files generated from
  the agent-integration pages in `../ai-sdlc-guideline/docs/agent-integration/`:
  `sdlc-principles`, `sdlc-bootstrap`, `sdlc-slice`, `sdlc-callback`,
  `sdlc-learning`. Each carries provenance frontmatter
  (`generated-from:`, `source-sha256:`, `pulled-at:`) plus opencode-readable
  `name`/`description` fields any compliant host can parse.

- **`integrations/<host>/`** — per-host loaders. Currently:
  - [`opencode/`](integrations/opencode/) — opencode-flavored loader and
    opt-in installer.

- **`scripts/pull-skills.ts`** — extracts the `Summary for agents` section
  from each agent-integration doc page and writes it to the corresponding
  `skills/<name>/SKILL.md`. Same conflict-guard machinery as the docs
  repo's `pull-mirrors.ts`. Idempotent.

## Sibling-repo assumption

This repo reads from `../ai-sdlc-guideline/docs/agent-integration/` at
pull time. All four AI-SDLC repos are expected to be checked out as
siblings:

```
<workspace>/
  ai-sdlc/                  governance (read-only contract)
  ai-sdlc-harness/          reference harness
  ai-sdlc-guideline/        documentation site
  ai-sdlc-integrations/     this repo
```

If `../ai-sdlc-guideline/` is missing, `npm run pull` warns and writes no
skills. The repo can still be used for installation (the skill files are
checked in), just not regenerated.

## Local development

```sh
npm install
npm run pull        # regenerate skills from source pages
npm run typecheck   # sanity-check the pull script
```

## Installing the opencode integration

Opt-in. Not invoked by the harness installer.

```sh
cd integrations/opencode
./install.sh
```

See [`integrations/opencode/README.md`](integrations/opencode/README.md)
for flags and exit codes.

## Adding a new host

See [`integrations/README.md`](integrations/README.md) for the recipe.

## What this repo is NOT

- **Not part of v1 governance.** Plane 5 is governed as a category;
  concrete artifacts (skills, loaders, installers) live here, not in
  `ai-sdlc/`. The "Out of scope for v1" rule in `ai-sdlc/AGENTS.md` still
  applies to the governance repo itself.
- **Not an MCP server.** The skills are static text; the agent host loads
  them. An MCP server is a runtime; if you want one, it would be a
  separate phase.
- **Not a substitute for the harness installer.** That ships the
  `aisdlc` binary. This repo installs *into* an agent host *after* the
  binary is installed.
- **Not coupled to any vendor.** Skill content is vendor-neutral (no
  agent-product names). Loader files in `integrations/<host>/` name
  their host because naming the host is the loader's job.
