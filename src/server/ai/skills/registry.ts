import fs from "node:fs";
import path from "node:path";
import { parseSkillMarkdown, serializeSkillMarkdown } from "@/lib/skills/parse-skill-md";
import {
  META_SKILL_NAMES,
  type RegisteredSkill,
} from "@/lib/skills/types";
import { normalizeSkillName, validateSkillName } from "@/lib/skills/validate-skill-name";
import { ensureDataDirs } from "@/server/db";

function builtinRoot(): string {
  return path.join(process.cwd(), "src/server/ai/skills/builtin");
}

function customRoot(): string {
  const { dataDir } = ensureDataDirs();
  return path.join(dataDir, "skills", "custom");
}

function loadSkillDir(dir: string, builtin: boolean): RegisteredSkill[] {
  if (!fs.existsSync(dir)) return [];
  const out: RegisteredSkill[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    try {
      const md = fs.readFileSync(skillPath, "utf8");
      const skill = parseSkillMarkdown(md, skillPath, { builtin });
      // Directory name should match skill name
      if (skill.name !== normalizeSkillName(entry.name) && builtin) {
        // still accept; name from frontmatter wins
      }
      out.push(skill);
    } catch (e) {
      console.error("Failed to load skill", skillPath, e);
    }
  }
  return out;
}

export function listSkills(): RegisteredSkill[] {
  const builtins = loadSkillDir(builtinRoot(), true);
  const customs = loadSkillDir(customRoot(), false);
  const byName = new Map<string, RegisteredSkill>();
  for (const s of builtins) byName.set(s.name, s);
  for (const s of customs) {
    // custom cannot override builtin
    if (byName.has(s.name) && byName.get(s.name)!.wfm.builtin) continue;
    byName.set(s.name, s);
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkill(name: string): RegisteredSkill | undefined {
  const n = normalizeSkillName(name);
  return listSkills().find((s) => s.name === n);
}

export function createCustomSkill(input: {
  name: string;
  description: string;
  argumentHint?: string;
  body: string;
}): RegisteredSkill {
  const nameCheck = validateSkillName(input.name);
  if (!nameCheck.ok) throw new Error(nameCheck.error);
  const name = nameCheck.name;

  if (META_SKILL_NAMES.has(name)) {
    throw new Error(`'${name}' is reserved`);
  }
  const existing = getSkill(name);
  if (existing?.wfm.builtin) {
    throw new Error(`Cannot overwrite built-in skill '${name}'`);
  }
  if (existing && !existing.wfm.builtin) {
    throw new Error(`Custom skill '${name}' already exists. Delete it first.`);
  }

  const body = input.body.trim();
  if (!body) throw new Error("Skill body is required");
  const description = input.description.trim();
  if (!description) throw new Error("Description is required");

  // Enforce chat-only template footer
  const safetyNote = `

## App rules (do not remove)

- Assistive only — not medical advice.
- Do not invent chart data.
- Do not claim you updated chart records or brief memory.
- Chat-only: no clinical writes.
`;
  const finalBody = body.includes("App rules (do not remove)")
    ? body
    : `${body.trim()}\n${safetyNote}`;

  const md = serializeSkillMarkdown({
    name,
    description,
    argumentHint: input.argumentHint,
    body: finalBody,
    wfm: {
      defaultScope: undefined as never,
      allowPersona: true,
      sideEffect: "none",
      builtin: false,
    },
  });

  const dir = path.join(customRoot(), name);
  // prevent path escape
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(customRoot()) + path.sep) && resolved !== path.resolve(customRoot())) {
    throw new Error("Invalid skill path");
  }
  fs.mkdirSync(dir, { recursive: true });
  const skillPath = path.join(dir, "SKILL.md");
  fs.writeFileSync(skillPath, md, "utf8");
  return parseSkillMarkdown(md, skillPath, { builtin: false });
}

export function deleteCustomSkill(name: string): void {
  const nameCheck = validateSkillName(name);
  if (!nameCheck.ok) throw new Error(nameCheck.error);
  const n = nameCheck.name;
  if (META_SKILL_NAMES.has(n)) {
    throw new Error(`Cannot delete meta skill '${n}'`);
  }
  const skill = getSkill(n);
  if (!skill) throw new Error(`Skill not found: ${n}`);
  if (skill.wfm.builtin) throw new Error(`Cannot delete built-in skill '${n}'`);

  const dir = path.join(customRoot(), n);
  const resolved = path.resolve(dir);
  const root = path.resolve(customRoot());
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid skill path");
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Parse "/skill-name args here" */
export function parseSlashCommand(message: string): {
  skillName: string;
  args: string;
} | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("/")) return null;
  const rest = trimmed.slice(1).trim();
  if (!rest) return null;
  const sp = rest.search(/\s/);
  const rawName = sp === -1 ? rest : rest.slice(0, sp);
  const args = sp === -1 ? "" : rest.slice(sp + 1).trim();
  const nameCheck = validateSkillName(rawName.replace(/_/g, "-"));
  if (!nameCheck.ok) return null;
  return { skillName: nameCheck.name, args };
}
