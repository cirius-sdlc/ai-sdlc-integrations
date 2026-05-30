#!/usr/bin/env node
/**
 * pull-skills.ts - generate AI-SDLC skill files from sibling-repo source pages.
 *
 * For each entry in `pull-skills.config.json`:
 *   1. Open the source markdown file in the sibling docs repo.
 *   2. Extract the named section (matched by header text, code-fence-aware).
 *   3. Write the extracted slice to the destination SKILL.md with
 *      provenance frontmatter (`generated-from`, `generated-section`,
 *      `source-sha256`, `pulled-at`) merged with caller-supplied
 *      `name` / `description` fields.
 *
 * Behavior:
 *   - Refuses to overwrite a destination file whose stored
 *     `source-sha256:` no longer matches the body on disk (i.e., the
 *     skill has been hand-edited).
 *   - Idempotent: safe to re-run.
 *
 * Exit codes:
 *   0  ok
 *   1  user error (config missing, bad shape)
 *   3  destination conflict (hand-edited skill refuses overwrite),
 *      or named section not found in source.
 *
 * This is a section-only subset of the docs repo's pull-mirrors.ts. The
 * directory and files kinds live there; this repo only ever needs
 * section extraction.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type FrontmatterValue = string | number | boolean | string[];
type Frontmatter = Record<string, FrontmatterValue>;

// Required skill-schema fields per ai-sdlc/skill-contract.md. A
// generated skill missing any of these is a hard error (exit 1):
// the schema contract is not satisfied.
const REQUIRED_SKILL_FIELDS = [
  "name",
  "description",
  "purpose",
  "steps",
  "exit_criteria",
] as const;

interface SectionSource {
  name: string;
  src: string;
  dest: string;
  section: string;
  frontmatter?: Frontmatter;
}

interface Config {
  sources: SectionSource[];
}

// Matches a leading YAML frontmatter block and consumes the trailing
// blank line so the returned `body` is byte-identical to the upstream
// source after frontmatter stripping.
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n+/;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function readFrontmatter(content: string): {
  fm: Record<string, string>;
  raw: string;
  body: string;
} {
  const m = FRONTMATTER_RE.exec(content);
  if (!m) return { fm: {}, raw: "", body: content };
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    // Skip list-item continuation lines ("  - item"); only top-level
    // `key: value` scalars are captured here. List fields are compared
    // structurally via schemaFieldsMatch, not through this map.
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fm, raw: m[1], body: content.slice(m[0].length) };
}

// schemaFieldsMatch reports whether the on-disk frontmatter block already
// encodes exactly the caller-supplied schema fields. It re-renders the
// intended fields and checks each rendered line is present verbatim in
// the on-disk frontmatter, so a list field (multi-line) is compared
// structurally rather than via the scalar map. Provenance fields
// (generated-*, source-sha256, pulled-at) are not part of `frontmatter`
// and are ignored here.
function schemaFieldsMatch(
  intended: Frontmatter | undefined,
  rawBlock: string,
): boolean {
  if (!intended) return true;
  for (const key of Object.keys(intended)) {
    const rendered = renderField(key, intended[key]);
    if (!rawBlock.includes(rendered)) return false;
  }
  return true;
}

function renderScalar(v: string | number | boolean): string {
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Quote only when the value would be ambiguous as a YAML scalar.
  // Paths and ISO timestamps stay unquoted so the harness's lint regex
  // for `generated-from: <path>` keeps matching.
  const needsQuote =
    /^\s|\s$/.test(v) ||
    /: /.test(v) ||
    /^[!&*?|>'"%@`{[]/.test(v) ||
    /\n/.test(v);
  return needsQuote ? JSON.stringify(v) : v;
}

function renderField(key: string, v: FrontmatterValue): string {
  if (Array.isArray(v)) {
    // YAML block sequence. Empty arrays render as an explicit `[]`.
    if (v.length === 0) return `${key}: []`;
    const items = v.map((item) => `  - ${renderScalar(item)}`);
    return `${key}:\n${items.join("\n")}`;
  }
  return `${key}: ${renderScalar(v)}`;
}

function renderFrontmatter(fm: Frontmatter): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return "";
  const lines = keys.map((k) => renderField(k, fm[k]));
  return `---\n${lines.join("\n")}\n---\n\n`;
}

type Level = "info" | "warn" | "error";
function log(level: Level, msg: string): void {
  process.stderr.write(`pull-skills [${level}] ${msg}\n`);
}

/**
 * Extract a section from a markdown body by header text.
 *
 * `body` should already have its frontmatter stripped. Returns the
 * slice from the matching header (inclusive) up to but excluding the
 * next same-or-higher-level header, or end-of-file. Headers inside
 * fenced code blocks are not counted.
 */
function extractSection(body: string, sectionText: string): string | null {
  const lines = body.split("\n");
  const headerRe = /^(#{1,6})\s+(.+?)\s*$/;
  const fenceRe = /^(```|~~~)/;

  // Pre-walk to mark in-fence lines so shell `#` comments inside a
  // ```sh block aren't read as headers.
  const inFence: boolean[] = new Array<boolean>(lines.length).fill(false);
  let fenceOpen = false;
  for (let i = 0; i < lines.length; i++) {
    inFence[i] = fenceOpen;
    if (fenceRe.test(lines[i])) fenceOpen = !fenceOpen;
  }

  let startIdx = -1;
  let matchedLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const m = headerRe.exec(lines[i]);
    if (!m) continue;
    if (m[2].trim() === sectionText.trim()) {
      startIdx = i;
      matchedLevel = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (inFence[i]) continue;
    const m = headerRe.exec(lines[i]);
    if (!m) continue;
    if (m[1].length <= matchedLevel) {
      endIdx = i;
      break;
    }
  }

  let slice = lines.slice(startIdx, endIdx).join("\n");
  slice = slice.replace(/\n+$/, "\n");
  return slice;
}

interface PullResult {
  written: number;
  skipped: number;
  conflicts: string[];
}

function pullSection(source: SectionSource, repoRoot: string): PullResult {
  const srcAbs = resolve(repoRoot, source.src);
  const destAbs = resolve(repoRoot, source.dest);
  const result: PullResult = { written: 0, skipped: 0, conflicts: [] };

  if (!existsSync(srcAbs)) {
    log("warn", `source "${source.name}": file not found at ${srcAbs}`);
    return result;
  }

  const raw = readFileSync(srcAbs, "utf8");
  const { body } = readFrontmatter(raw);
  const slice = extractSection(body, source.section);
  if (slice === null) {
    log(
      "error",
      `source "${source.name}": section "${source.section}" not found in ${srcAbs}`,
    );
    result.conflicts.push(destAbs);
    return result;
  }

  const srcHash = sha256(slice);
  const generatedFrom = relative(repoRoot, srcAbs);

  if (existsSync(destAbs)) {
    const existing = readFileSync(destAbs, "utf8");
    const { fm, raw, body: existingBody } = readFrontmatter(existing);
    const recordedHash = fm["source-sha256"];
    const bodyHash = sha256(existingBody);

    // Hand-edit guard: a body whose hash no longer matches the recorded
    // source hash means someone edited the generated file. Refuse.
    if (recordedHash && bodyHash !== recordedHash) {
      result.conflicts.push(destAbs);
      return result;
    }
    // Idempotency: skip only when the source body is unchanged AND the
    // schema frontmatter already matches the config. A schema-only change
    // (new/updated skill fields, same body) must still rewrite the file.
    if (
      recordedHash &&
      recordedHash === srcHash &&
      bodyHash === recordedHash &&
      schemaFieldsMatch(source.frontmatter, raw)
    ) {
      result.skipped++;
      return result;
    }
  }

  const merged: Frontmatter = {
    "generated-from": generatedFrom,
    "generated-section": source.section,
    "source-sha256": srcHash,
    "pulled-at": new Date().toISOString(),
    ...(source.frontmatter ?? {}),
  };
  mkdirSync(dirname(destAbs), { recursive: true });
  writeFileSync(destAbs, renderFrontmatter(merged) + slice);
  result.written++;
  return result;
}

function validateConfig(raw: unknown): Config {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("config must be an object");
  }
  const c = raw as { sources?: unknown };
  if (!Array.isArray(c.sources)) {
    throw new Error("config.sources must be an array");
  }
  for (const s of c.sources) {
    if (typeof s !== "object" || s === null) {
      throw new Error(`invalid source: ${JSON.stringify(s)}`);
    }
    const so = s as {
      name?: unknown;
      src?: unknown;
      dest?: unknown;
      section?: unknown;
      frontmatter?: unknown;
    };
    if (!so.name || !so.src || !so.dest || !so.section) {
      throw new Error(`source missing required fields: ${JSON.stringify(so)}`);
    }
    validateSkillFields(so.name as string, so.frontmatter);
  }
  return raw as Config;
}

// validateSkillFields enforces the skill schema (ai-sdlc/skill-contract.md):
// every skill's frontmatter must carry the required fields, non-empty.
// A list field must be a non-empty array of strings; a scalar field must
// be a non-empty string.
function validateSkillFields(sourceName: string, frontmatter: unknown): void {
  if (typeof frontmatter !== "object" || frontmatter === null) {
    throw new Error(
      `skill "${sourceName}": frontmatter is required and must carry the skill schema fields`,
    );
  }
  const fm = frontmatter as Record<string, unknown>;
  for (const field of REQUIRED_SKILL_FIELDS) {
    const v = fm[field];
    if (v === undefined || v === null) {
      throw new Error(
        `skill "${sourceName}": missing required schema field "${field}" (see ai-sdlc/skill-contract.md)`,
      );
    }
    if (Array.isArray(v)) {
      if (v.length === 0 || v.some((x) => typeof x !== "string" || x.trim() === "")) {
        throw new Error(
          `skill "${sourceName}": field "${field}" must be a non-empty list of non-empty strings`,
        );
      }
    } else if (typeof v !== "string" || v.trim() === "") {
      throw new Error(
        `skill "${sourceName}": field "${field}" must be a non-empty string or list`,
      );
    }
  }
  // Optional fields, when present, must still be well-formed lists/strings.
  for (const field of ["inputs", "outputs", "constraints"]) {
    if (!(field in fm)) continue;
    const v = fm[field];
    if (Array.isArray(v)) {
      if (v.some((x) => typeof x !== "string" || x.trim() === "")) {
        throw new Error(
          `skill "${sourceName}": optional field "${field}" must contain only non-empty strings`,
        );
      }
    } else if (typeof v !== "string" || v.trim() === "") {
      throw new Error(
        `skill "${sourceName}": optional field "${field}", if present, must be a non-empty string or list`,
      );
    }
  }
}

function main(): number {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..");
  const configPath = resolve(here, "pull-skills.config.json");

  if (!existsSync(configPath)) {
    log("error", `config not found: ${configPath}`);
    return 1;
  }

  let config: Config;
  try {
    config = validateConfig(JSON.parse(readFileSync(configPath, "utf8")));
  } catch (err) {
    log("error", `config invalid: ${(err as Error).message}`);
    return 1;
  }

  let totalWritten = 0;
  let totalSkipped = 0;
  const allConflicts: string[] = [];

  for (const source of config.sources) {
    const r = pullSection(source, repoRoot);
    totalWritten += r.written;
    totalSkipped += r.skipped;
    allConflicts.push(...r.conflicts);
    log(
      "info",
      `source "${source.name}": written=${r.written} skipped=${r.skipped} conflicts=${r.conflicts.length}`,
    );
  }

  if (allConflicts.length > 0) {
    log("error", "refusing to overwrite hand-edited skill files (or section missing):");
    for (const p of allConflicts) log("error", `  ${p}`);
    log(
      "error",
      "remediation: revert any edit; if the source section was renamed or removed, update the source page or the config",
    );
    return 3;
  }

  log(
    "info",
    `summary: written=${totalWritten} skipped=${totalSkipped}`,
  );
  return 0;
}

process.exit(main());
