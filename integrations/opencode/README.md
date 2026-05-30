# opencode integration

Loaders that wire the canonical AI-SDLC skills and slash commands
into the opencode agent host.

## What opencode is

A terminal-based AI coding agent host that loads:

- **Skills** from `~/.config/opencode/skills/<skill-name>/SKILL.md`.
  Each skill has `name` and `description` frontmatter; opencode
  loads conditionally when the active task matches the description.
- **Slash commands** from `~/.config/opencode/commands/<name>.md`.
  Each command is a prompt template with optional frontmatter. The
  user invokes the command by typing `/<name>` in the TUI.

## What this directory provides

```
opencode/
  README.md                      # this file
  install.sh                     # opt-in installer (skills + commands)
  skills/
    sdlc-principles -> ../../../skills/sdlc-principles    (symlink)
    sdlc-bootstrap  -> ../../../skills/sdlc-bootstrap     (symlink)
    sdlc-slice      -> ../../../skills/sdlc-slice         (symlink)
    sdlc-callback   -> ../../../skills/sdlc-callback      (symlink)
    sdlc-learning   -> ../../../skills/sdlc-learning      (symlink)
  commands/
    sdlc-bootstrap.md              # /sdlc-bootstrap (init + vendor + AGENTS.md)
    sdlc-attach.md                 # /sdlc-attach (project lifecycle)
    sdlc-detach.md                 # /sdlc-detach (rework-impact + detach)
    sdlc-callback.md               # /sdlc-callback (reverse-edge callback file)
```

**Skills** are symlinks resolving to canonical content in
`ai-sdlc-integrations/skills/`. Editing the canonical content
auto-propagates to anyone who has installed via `install.sh` —
**only after** they re-run the installer (the installer copies
resolved content; it does not symlink into the user's config dir).

**Commands** are host-specific. They live natively here and are
copied into the user's config at install time. There is no
governance source for command content — commands implement opencode's
UX shape (`!` shell substitution, `$ARGUMENTS`) which is not
host-neutral.

## Slash commands

### `/sdlc-bootstrap [governance-path]`

Bootstraps an AI-SDLC workspace in the current directory: initializes
the state file, vendors governance from a local path, and places the
workspace `AGENTS.md` from the governance template. Runs `aisdlc
doctor` at template expansion to detect the current workspace state
(fresh, partial, or already-bootstrapped) and runs the matching
subset of init steps. Probes for `../ai-sdlc/` as the canonical
sibling-checkout source; the optional `$1` argument overrides the
probe. Safe on brownfield workspaces (the harness's no-clobber policy
protects existing files).

### `/sdlc-attach [id]`

Walks the user through attaching a project to the workspace. Asks
greenfield (new code) vs brownfield (existing code), gathers the
mission and location, invokes `aisdlc attach`, and suggests next
steps. Runs `aisdlc doctor` and `aisdlc query state projects` at
template expansion to surface workspace health and existing
projects.

### `/sdlc-detach <id>`

Drives the detach flow. Runs `aisdlc rework-impact <id> --json` at
template expansion to gather the cross-aggregate inventory, walks
each guidance item with the user (open work, sole-source learnings,
active exceptions, etc.), then invokes `aisdlc detach` — with
`--force --reason "..."` when the user opts to override blockers.

### `/sdlc-callback`

Walks the user through filing a callback (the framework's reverse
edge per `ai-sdlc/flow.md`). Runs `aisdlc query state slices
--status open --json` at template expansion to ground the user in
the workspace's open work. Validates the origin→target reverse-edge
constraint in conversation (catching forward edges before invoking
the harness), then invokes `aisdlc callback file`. The
`sdlc-callback` skill (if loaded) supplies conceptual context.

## Installation

Opt-in. This script is **not** invoked by the harness's `install.sh`.

```sh
cd ai-sdlc-integrations/integrations/opencode
./install.sh
```

Default behavior:

- Resolves the skill symlinks to their canonical targets.
- Copies each `SKILL.md` into `~/.config/opencode/skills/<name>/SKILL.md`.
- Copies each `commands/*.md` into `~/.config/opencode/commands/<name>.md`.
- Refuses to overwrite a non-regular destination file (link guard).
- Idempotent: re-running replaces regular files with the latest
  content.

After installing, **restart opencode** so it picks up the new skills
and commands.

### Flags

| Flag             | Default                    | Meaning                                                                   |
| ---------------- | -------------------------- | ------------------------------------------------------------------------- |
| `--prefix DIR`   | `$HOME/.config/opencode`   | Install root. Skills go to `<DIR>/skills/<name>/`; commands to `<DIR>/commands/`. |
| `--no-skills`    | off                        | Skip skills install.                                                      |
| `--no-commands`  | off                        | Skip commands install.                                                    |
| `--dry-run`      | off                        | Print what would be copied; change nothing.                               |
| `-h`, `--help`   | —                          | Show usage and exit.                                                      |

Passing both `--no-skills` and `--no-commands` exits 1 (nothing to
install).

### Exit codes

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| 0    | Installed (or dry-run succeeded).                                    |
| 1    | User error (bad flag, missing prerequisite, nothing to install).     |
| 3    | Install failed (filesystem, permissions, refusal to clobber).        |

## Dependencies

The slash commands invoke `aisdlc` via opencode's `` !` ` `` shell
substitution. **`aisdlc` must be on PATH** in the shell opencode
runs commands in. If not, command invocation produces
`command not found` and the LLM surfaces the failure.

Verify with:

```sh
which aisdlc
aisdlc version
```

Install the harness binary via the harness repo's `install.sh` if
missing.

## Manual smoke test

Slash commands have no automated test harness. After installing,
verify behavior manually:

1. `./install.sh --dry-run` — lists 5 skills + 4 commands; exit 0.
2. `./install.sh` — installs both; exit 0.
3. Restart opencode.
4. In a workspace with `.workflow/state.db` initialized, type
   `/sdlc-attach demo` and confirm the prompt expansion shows the
   `aisdlc doctor` output and `aisdlc query state projects` JSON.
5. Walk a greenfield attach to a tempdir; confirm the project
   appears in `aisdlc query state projects`.
6. Pre-create a directory and walk a brownfield attach to it;
   confirm scaffolding skipped existing files.
7. Type `/sdlc-detach <id>` against a clean project; expect
   `clean-historical-record` guidance and a successful detach.
8. Start a slice; then `/sdlc-detach <id>` to trigger `open-work`
   guidance; walk the force path with a reason; verify
   `aisdlc query state events --event-kind project.detached` shows
   `forced=true` and the reason in payload.

## Uninstallation

```sh
rm -rf ~/.config/opencode/skills/sdlc-*
rm -f  ~/.config/opencode/commands/sdlc-*.md
```

The harness binary and workspace state are unaffected.

## Updating

After pulling new content (canonical skill updates via
`npm run pull` in the integrations repo, or new commands here), re-run
`./install.sh`. The installer overwrites the existing regular files
with the latest content.

## What this does not do

- Does not install opencode itself. If `~/.config/opencode/` does not
  exist, the installer exits 1 with a remediation message.
- Does not edit opencode's main config file (`opencode.json`).
- Does not modify `$PATH`, shell rc files, or environment.
- Does not register MCP servers or any opencode feature beyond
  skills and slash commands.

## Related

- [Canonical skills](../../skills/) — vendor-neutral source content.
- [Adding a host](../README.md#adding-a-host) — pattern for
  integrating other agent hosts.
