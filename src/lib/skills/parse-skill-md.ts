import type { ChartContextScope } from "@/server/ai/context";
import {
  DEFAULT_SKILL_SCOPE,
  type RegisteredSkill,
  type SkillWfmConfig,
} from "@/lib/skills/types";
import { validateSkillName } from "@/lib/skills/validate-skill-name";

function parseSimpleYamlValue(raw: string): unknown {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/** Minimal frontmatter parser (no nested structures beyond one-level wfm keys). */
export function splitFrontmatter(md: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const text = md.replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) {
    return { frontmatter: {}, body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, body: text };
  }
  const fmBlock = text.slice(3, end).replace(/^\n/, "");
  const body = text.slice(end + 4).replace(/^\n/, "");
  const frontmatter: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let multiline = "";
  let inMultiline = false;
  let wfm: Record<string, unknown> | null = null;
  let inWfm = false;
  let inScope = false;
  let scope: Record<string, unknown> = {};

  const flushMultiline = () => {
    if (currentKey && inMultiline) {
      const target = inWfm && !inScope ? wfm! : frontmatter;
      target[currentKey] = multiline.replace(/\n$/, "");
      multiline = "";
      inMultiline = false;
      currentKey = null;
    }
  };

  for (const line of fmBlock.split("\n")) {
    if (inMultiline) {
      if (line.startsWith("  ") || line.startsWith("\t") || line.trim() === "") {
        multiline += (multiline ? "\n" : "") + line.replace(/^  /, "");
        continue;
      }
      flushMultiline();
    }

    if (/^wfm:\s*$/.test(line)) {
      wfm = {};
      inWfm = true;
      inScope = false;
      continue;
    }

    if (inWfm && /^  default_scope:\s*$/.test(line)) {
      inScope = true;
      scope = {};
      continue;
    }

    if (inWfm && inScope && /^    ([a-zA-Z_]+):\s*(.+)\s*$/.test(line)) {
      const m = line.match(/^    ([a-zA-Z_]+):\s*(.+)\s*$/)!;
      scope[m[1]] = parseSimpleYamlValue(m[2]);
      continue;
    }

    if (inWfm && inScope && /^  [a-zA-Z_]/.test(line)) {
      wfm!.default_scope = scope;
      inScope = false;
    }

    if (inWfm && /^  ([a-zA-Z_]+):\s*(.*)\s*$/.test(line) && !inScope) {
      const m = line.match(/^  ([a-zA-Z_]+):\s*(.*)\s*$/)!;
      const key = m[1];
      const rest = m[2];
      if (rest === ">" || rest === "|") {
        currentKey = key;
        inMultiline = true;
        multiline = "";
        continue;
      }
      wfm![key] = parseSimpleYamlValue(rest);
      continue;
    }

    if (/^[a-zA-Z_][a-zA-Z0-9_-]*:\s*(.*)$/.test(line) && !line.startsWith(" ")) {
      if (inWfm) {
        if (inScope) {
          wfm!.default_scope = scope;
          inScope = false;
        }
        frontmatter.wfm = wfm;
        inWfm = false;
        wfm = null;
      }
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/)!;
      const key = m[1];
      const rest = m[2];
      if (rest === ">" || rest === "|") {
        currentKey = key;
        inMultiline = true;
        multiline = "";
        continue;
      }
      frontmatter[key] = parseSimpleYamlValue(rest);
    }
  }
  flushMultiline();
  if (inWfm && wfm) {
    if (inScope) wfm.default_scope = scope;
    frontmatter.wfm = wfm;
  }

  return { frontmatter, body };
}

function asScope(raw: unknown): ChartContextScope {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SKILL_SCOPE };
  const o = raw as Record<string, unknown>;
  const pick = (k: keyof ChartContextScope, fallback: boolean) =>
    typeof o[k] === "boolean" ? (o[k] as boolean) : fallback;
  return {
    profile: pick("profile", true),
    allergies: pick("allergies", true),
    diagnoses: pick("diagnoses", true),
    medications: pick("medications", true),
    supplements: pick("supplements", true),
    labs: pick("labs", true),
    tests: pick("tests", false),
    procedures: pick("procedures", false),
    acceptedViews: pick("acceptedViews", true) || pick("accepted_views" as never, true),
    myPlan: pick("myPlan", true) || pick("my_plan" as never, true),
  };
}

function asWfm(raw: unknown, builtin: boolean): SkillWfmConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scopeRaw = o.default_scope ?? o.defaultScope;
  return {
    defaultScope: asScope(scopeRaw),
    allowPersona: o.allow_persona !== false && o.allowPersona !== false,
    sideEffect: "none",
    builtin,
  };
}

export function parseSkillMarkdown(
  md: string,
  path: string,
  opts?: { builtin?: boolean },
): RegisteredSkill {
  const builtin = opts?.builtin ?? false;
  const { frontmatter, body } = splitFrontmatter(md);
  const nameRaw = String(frontmatter.name ?? "");
  const nameCheck = validateSkillName(nameRaw);
  if (!nameCheck.ok) {
    throw new Error(`${path}: ${nameCheck.error}`);
  }
  const description = String(frontmatter.description ?? "").trim();
  if (!description) {
    throw new Error(`${path}: description is required`);
  }
  const argumentHint =
    frontmatter["argument-hint"] != null
      ? String(frontmatter["argument-hint"])
      : frontmatter.argumentHint != null
        ? String(frontmatter.argumentHint)
        : undefined;

  return {
    name: nameCheck.name,
    description,
    argumentHint: argumentHint?.trim() || undefined,
    body: body.trim(),
    wfm: asWfm(frontmatter.wfm, builtin),
    path,
  };
}

export function serializeSkillMarkdown(skill: {
  name: string;
  description: string;
  argumentHint?: string;
  body: string;
  wfm?: Partial<SkillWfmConfig>;
}): string {
  const scope = { ...DEFAULT_SKILL_SCOPE, ...skill.wfm?.defaultScope };
  const desc = skill.description.includes("\n")
    ? `>\n${skill.description
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n")}`
    : skill.description;

  const lines = [
    "---",
    `name: ${skill.name}`,
    `description: ${desc}`,
  ];
  if (skill.argumentHint) {
    lines.push(`argument-hint: "${skill.argumentHint}"`);
  }
  lines.push("wfm:");
  lines.push("  default_scope:");
  for (const [k, v] of Object.entries(scope)) {
    if (typeof v === "boolean") {
      lines.push(`    ${k}: ${v}`);
    }
  }
  lines.push(`  allow_persona: ${skill.wfm?.allowPersona !== false}`);
  lines.push("  side_effect: none");
  lines.push(`  builtin: false`);
  lines.push("---");
  lines.push("");
  lines.push(skill.body.trim());
  lines.push("");
  return lines.join("\n");
}
