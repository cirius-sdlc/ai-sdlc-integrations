#!/usr/bin/env sh
# install.sh - install AI-SDLC skills and slash commands into opencode.
#
# Opt-in installer. Not invoked by the harness's install.sh.
#
# Skills:   resolves symlinks under integrations/opencode/skills/ to
#           their canonical targets in ai-sdlc-integrations/skills/
#           and copies each SKILL.md into $PREFIX/skills/<name>/SKILL.md.
# Commands: copies each .md file under integrations/opencode/commands/
#           into $PREFIX/commands/<name>.md. Commands are host-specific
#           and live natively here (no symlinks).
#
# Usage:
#   ./install.sh [--prefix DIR] [--no-skills] [--no-commands] [--dry-run] [-h|--help]
#
# Defaults:
#   PREFIX = $HOME/.config/opencode
#   skills + commands are both installed unless explicitly opted out.
#
# Exit codes:
#   0  ok
#   1  user error (bad flag, prerequisite missing)
#   3  install failed (filesystem, refusal to clobber)
#
# Never modifies $PATH, shell rc files, or any path outside $PREFIX.

set -eu

# ---------- defaults ----------
PREFIX="${HOME}/.config/opencode"
DRY_RUN=0
INSTALL_SKILLS=1
INSTALL_COMMANDS=1

# ---------- locate self ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_LINK_DIR="${SCRIPT_DIR}/skills"
COMMANDS_DIR="${SCRIPT_DIR}/commands"
CANONICAL_DIR="$(cd "${SCRIPT_DIR}/../../skills" && pwd)"

if [ ! -d "${SKILLS_LINK_DIR}" ]; then
    printf 'install.sh: skills dir missing: %s\n' "${SKILLS_LINK_DIR}" >&2
    printf '  is this the opencode integration directory?\n' >&2
    exit 1
fi

# ---------- usage ----------
usage() {
    cat <<'EOF'
install.sh - install AI-SDLC skills and slash commands into opencode

Usage:
  ./install.sh [flags]

Flags:
  --prefix DIR     Opencode config root (default: $HOME/.config/opencode).
                   Skills go to <DIR>/skills/<name>/SKILL.md.
                   Commands go to <DIR>/commands/<name>.md.
  --no-skills      Skip the skills install.
  --no-commands    Skip the commands install.
  --dry-run        Show what would be copied; change nothing.
  -h, --help       Show this message and exit.

By default both skills and commands install. Pass --no-skills or
--no-commands to install just one.
EOF
}

# ---------- arg parsing ----------
while [ $# -gt 0 ]; do
    case "$1" in
        --prefix)
            [ $# -ge 2 ] || { printf 'install.sh: --prefix requires an argument\n' >&2; exit 1; }
            PREFIX="$2"; shift 2 ;;
        --prefix=*)
            PREFIX="${1#--prefix=}"; shift ;;
        --no-skills)
            INSTALL_SKILLS=0; shift ;;
        --no-commands)
            INSTALL_COMMANDS=0; shift ;;
        --dry-run)
            DRY_RUN=1; shift ;;
        -h|--help)
            usage; exit 0 ;;
        *)
            printf 'install.sh: unknown flag: %s\n' "$1" >&2
            usage >&2
            exit 1 ;;
    esac
done

if [ "${INSTALL_SKILLS}" -eq 0 ] && [ "${INSTALL_COMMANDS}" -eq 0 ]; then
    printf 'install.sh: --no-skills and --no-commands together leave nothing to install\n' >&2
    exit 1
fi

# ---------- prerequisite check ----------
if [ "${DRY_RUN}" -eq 0 ] && [ ! -d "${PREFIX}" ]; then
    printf 'install.sh: opencode config dir not found at %s\n' "${PREFIX}" >&2
    printf '  remediation: install opencode first, or pass --prefix <dir>\n' >&2
    exit 1
fi

DEST_SKILLS="${PREFIX}/skills"
DEST_COMMANDS="${PREFIX}/commands"

# ---------- skills install ----------
skills_copied=0
errors=0

if [ "${INSTALL_SKILLS}" -eq 1 ]; then
    for link in "${SKILLS_LINK_DIR}"/*; do
        [ -e "${link}" ] || continue
        name="$(basename "${link}")"
        canonical="${CANONICAL_DIR}/${name}"
        src_file="${canonical}/SKILL.md"

        if [ ! -f "${src_file}" ]; then
            printf 'install.sh: missing canonical skill: %s\n' "${src_file}" >&2
            errors=$((errors + 1))
            continue
        fi

        dest_dir="${DEST_SKILLS}/${name}"
        dest_file="${dest_dir}/SKILL.md"

        # Refuse to clobber a non-regular file (symlink, dir, device).
        if [ -e "${dest_file}" ] && [ ! -f "${dest_file}" ]; then
            printf 'install.sh: refusing to overwrite non-regular file at %s\n' "${dest_file}" >&2
            errors=$((errors + 1))
            continue
        fi

        if [ "${DRY_RUN}" -eq 1 ]; then
            printf 'would install skill: %s -> %s\n' "${name}" "${dest_file}"
            skills_copied=$((skills_copied + 1))
            continue
        fi

        mkdir -p "${dest_dir}" || {
            printf 'install.sh: cannot create %s\n' "${dest_dir}" >&2
            errors=$((errors + 1))
            continue
        }

        if ! install -m 0644 "${src_file}" "${dest_file}"; then
            printf 'install.sh: install failed for %s\n' "${dest_file}" >&2
            errors=$((errors + 1))
            continue
        fi

        skills_copied=$((skills_copied + 1))
    done
fi

# ---------- commands install ----------
commands_copied=0

if [ "${INSTALL_COMMANDS}" -eq 1 ]; then
    if [ ! -d "${COMMANDS_DIR}" ]; then
        printf 'install.sh: commands dir missing: %s\n' "${COMMANDS_DIR}" >&2
        printf '  is this an incomplete opencode integration?\n' >&2
        errors=$((errors + 1))
    else
        for src_file in "${COMMANDS_DIR}"/*.md; do
            [ -e "${src_file}" ] || continue
            name="$(basename "${src_file}")"
            dest_file="${DEST_COMMANDS}/${name}"

            # Refuse to clobber a non-regular file.
            if [ -e "${dest_file}" ] && [ ! -f "${dest_file}" ]; then
                printf 'install.sh: refusing to overwrite non-regular file at %s\n' "${dest_file}" >&2
                errors=$((errors + 1))
                continue
            fi

            if [ "${DRY_RUN}" -eq 1 ]; then
                printf 'would install command: %s -> %s\n' "${name}" "${dest_file}"
                commands_copied=$((commands_copied + 1))
                continue
            fi

            mkdir -p "${DEST_COMMANDS}" || {
                printf 'install.sh: cannot create %s\n' "${DEST_COMMANDS}" >&2
                errors=$((errors + 1))
                continue
            }

            if ! install -m 0644 "${src_file}" "${dest_file}"; then
                printf 'install.sh: install failed for %s\n' "${dest_file}" >&2
                errors=$((errors + 1))
                continue
            fi

            commands_copied=$((commands_copied + 1))
        done
    fi
fi

# ---------- summary ----------
if [ "${errors}" -gt 0 ]; then
    printf 'install.sh: %d error(s); skills=%d commands=%d\n' \
        "${errors}" "${skills_copied}" "${commands_copied}" >&2
    exit 3
fi

if [ "${DRY_RUN}" -eq 1 ]; then
    printf 'dry-run: would install %d skill(s) and %d command(s) under %s\n' \
        "${skills_copied}" "${commands_copied}" "${PREFIX}"
else
    printf 'installed: %d skill(s) and %d command(s) under %s\n' \
        "${skills_copied}" "${commands_copied}" "${PREFIX}"
fi
