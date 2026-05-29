#!/usr/bin/env sh
# install.sh - copy AI-SDLC skills into the opencode skills directory.
#
# Opt-in installer. Not invoked by the harness's install.sh.
# Resolves the symlinks under integrations/opencode/skills/ to their
# canonical targets in ai-sdlc-guideline/skills/ and copies each
# SKILL.md into $PREFIX/skills/<name>/SKILL.md.
#
# Usage:
#   ./install.sh [--prefix DIR] [--dry-run] [-h|--help]
#
# Defaults:
#   PREFIX = $HOME/.config/opencode
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

# ---------- locate self ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_LINK_DIR="${SCRIPT_DIR}/skills"
CANONICAL_DIR="$(cd "${SCRIPT_DIR}/../../skills" && pwd)"

if [ ! -d "${SKILLS_LINK_DIR}" ]; then
    printf 'install.sh: skills dir missing: %s\n' "${SKILLS_LINK_DIR}" >&2
    printf '  is this the opencode integration directory?\n' >&2
    exit 1
fi

# ---------- usage ----------
usage() {
    cat <<'EOF'
install.sh - copy AI-SDLC skills into the opencode skills directory

Usage:
  ./install.sh [flags]

Flags:
  --prefix DIR     Opencode config root (default: $HOME/.config/opencode).
                   Skills are placed under <DIR>/skills/<name>/SKILL.md.
  --dry-run        Show what would be copied; change nothing.
  -h, --help       Show this message and exit.
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

# ---------- prerequisite check ----------
if [ "${DRY_RUN}" -eq 0 ] && [ ! -d "${PREFIX}" ]; then
    printf 'install.sh: opencode config dir not found at %s\n' "${PREFIX}" >&2
    printf '  remediation: install opencode first, or pass --prefix <dir>\n' >&2
    exit 1
fi

DEST_SKILLS="${PREFIX}/skills"

# ---------- copy each skill ----------
copied=0
skipped=0
errors=0

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
        printf 'would install: %s -> %s\n' "${name}" "${dest_file}"
        copied=$((copied + 1))
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

    copied=$((copied + 1))
done

# ---------- summary ----------
if [ "${errors}" -gt 0 ]; then
    printf 'install.sh: %d error(s); copied=%d skipped=%d\n' "${errors}" "${copied}" "${skipped}" >&2
    exit 3
fi

if [ "${DRY_RUN}" -eq 1 ]; then
    printf 'dry-run: %d skill(s) would be installed under %s\n' "${copied}" "${DEST_SKILLS}"
else
    printf 'installed: %d skill(s) under %s\n' "${copied}" "${DEST_SKILLS}"
fi
