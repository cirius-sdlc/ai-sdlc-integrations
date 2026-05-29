# opencode integration

Loaders that wire the five canonical AI-SDLC skills into the opencode
agent host.

## What opencode is

A terminal-based AI coding agent host that loads skills from
`~/.config/opencode/skills/<skill-name>/SKILL.md`. Each skill has a
`name` and `description` in its frontmatter; opencode loads the
skill conditionally when the active task matches the description.

## What this directory provides

```
opencode/
  README.md                      # this file
  install.sh                     # opt-in installer
  skills/
    sdlc-principles -> ../../../skills/sdlc-principles    (symlink)
    sdlc-bootstrap  -> ../../../skills/sdlc-bootstrap     (symlink)
    sdlc-slice      -> ../../../skills/sdlc-slice         (symlink)
    sdlc-callback   -> ../../../skills/sdlc-callback      (symlink)
    sdlc-learning   -> ../../../skills/sdlc-learning      (symlink)
```

The symlinks resolve to the canonical skill content in
`ai-sdlc-guideline/skills/`. Editing the canonical content
auto-propagates to anyone who has installed via `install.sh` —
**only after** they re-run the installer, because `install.sh` copies
the resolved content; it does not symlink into the user's config dir.

## Installation

Opt-in. This script is **not** invoked by the harness's `install.sh`.

```sh
cd ai-sdlc-guideline/integrations/opencode
./install.sh
```

Default behavior:

- Resolves the symlinks to their canonical targets.
- Copies each `SKILL.md` into `~/.config/opencode/skills/<name>/SKILL.md`.
- Refuses to overwrite a directory that contains a non-regular
  `SKILL.md` (link guard).
- Idempotent: re-running replaces files with the latest canonical
  content.

### Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `--prefix DIR` | `$HOME/.config/opencode` | Install root. Skills go to `<DIR>/skills/<name>/`. |
| `--dry-run` | off | Print what would be copied; change nothing. |
| `-h`, `--help` | — | Show usage and exit. |

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Installed (or dry-run succeeded). |
| 1 | User error (bad flag, missing prerequisite, unsupported platform). |
| 3 | Install failed (filesystem, permissions, refusal to clobber). |

## Uninstallation

```sh
rm -rf ~/.config/opencode/skills/sdlc-*
```

The harness binary and workspace state are unaffected.

## Updating

After pulling new canonical skill content (via `npm run pull` in the
docs repo, or just a `git pull` on this repo when canonical content
has been updated upstream), re-run `./install.sh`. The installer
overwrites the existing files with the latest canonical content.

## What this does not do

- Does not install opencode itself. If `~/.config/opencode/` does not
  exist, the installer exits 1 with a remediation message.
- Does not edit opencode's main config file.
- Does not register slash commands, MCP servers, or any other
  opencode feature beyond skills.
- Does not modify `$PATH`, shell rc files, or environment.

## Related

- [Canonical skills](../../skills/) — the source content the loaders
  point at.
- [Adding a host](../README.md#adding-a-host) — pattern for
  integrating other agent hosts.
