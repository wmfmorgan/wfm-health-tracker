import { parseSkillMarkdown } from "@/lib/skills/parse-skill-md";
import {
  createCustomSkill,
  deleteCustomSkill,
  listSkills,
} from "@/server/ai/skills/registry";
import { validateSkillName } from "@/lib/skills/validate-skill-name";

export type MetaResult = {
  assistantMessage: string;
  skillName: string;
  mutated: boolean;
};

function extractCodeFence(text: string): string | null {
  const m = text.match(/```(?:markdown|md|yaml)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}

/** Parse create-skill arguments into structured fields. */
export function parseCreateSkillArgs(args: string): {
  name: string;
  description: string;
  body: string;
  argumentHint?: string;
} | null {
  const raw = args.trim();
  if (!raw) return null;

  if (raw.startsWith("{")) {
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      const name = String(j.name ?? "");
      const description = String(j.description ?? "");
      const body = String(j.body ?? "");
      if (name && description && body) {
        return {
          name,
          description,
          body,
          argumentHint: j.argumentHint ? String(j.argumentHint) : undefined,
        };
      }
    } catch {
      /* fall through */
    }
  }

  const fence = extractCodeFence(raw);
  const md = fence && fence.includes("name:") ? fence : raw.startsWith("---") ? raw : null;
  if (md) {
    try {
      const skill = parseSkillMarkdown(md, "inline", { builtin: false });
      return {
        name: skill.name,
        description: skill.description,
        body: skill.body,
        argumentHint: skill.argumentHint,
      };
    } catch {
      /* fall through */
    }
  }

  const pipe = raw.split("|").map((s) => s.trim());
  if (pipe.length >= 3) {
    const [name, description, ...rest] = pipe;
    const body = rest.join("|").trim();
    if (name && description && body) {
      return { name, description, body };
    }
  }

  const lines = raw.split("\n");
  const nameToken = lines[0]?.trim().split(/\s+/)[0] ?? "";
  const nameCheck = validateSkillName(nameToken);
  if (nameCheck.ok && lines.length >= 3) {
    let description = "";
    let bodyStart = 1;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^description:\s*/i.test(line)) {
        description = line.replace(/^description:\s*/i, "").trim();
        bodyStart = i + 1;
        if (!description) {
          const parts: string[] = [];
          let j = i + 1;
          while (j < lines.length && lines[j]!.trim() !== "") {
            parts.push(lines[j]!);
            j++;
          }
          description = parts.join(" ").trim();
          bodyStart = j + 1;
        }
        break;
      }
    }
    const body = lines.slice(bodyStart).join("\n").trim();
    if (description && body) {
      return { name: nameCheck.name, description, body };
    }
  }

  return null;
}

export function handleDeleteSkill(args: string): MetaResult {
  const name = args.trim().split(/\s+/)[0] ?? "";
  if (!name) {
    return {
      skillName: "delete-skill",
      mutated: false,
      assistantMessage:
        "Usage: `/delete-skill <skill-name>`\n\nOnly **custom** skills can be deleted. Built-in skills are protected.",
    };
  }
  try {
    deleteCustomSkill(name);
    return {
      skillName: "delete-skill",
      mutated: true,
      assistantMessage: `Deleted custom skill **${name}**.`,
    };
  } catch (e) {
    return {
      skillName: "delete-skill",
      mutated: false,
      assistantMessage: e instanceof Error ? e.message : "Delete failed",
    };
  }
}

export function handleCreateSkillSave(args: string): MetaResult | null {
  const parsed = parseCreateSkillArgs(args);
  if (!parsed) return null;
  try {
    const skill = createCustomSkill(parsed);
    return {
      skillName: "create-skill",
      mutated: true,
      assistantMessage: [
        `Created custom skill **/${skill.name}**.`,
        "",
        skill.description,
        "",
        "Run it with:",
        `\`${skill.argumentHint ? `/${skill.name} ${skill.argumentHint}` : `/${skill.name}`}\``,
      ].join("\n"),
    };
  } catch (e) {
    return {
      skillName: "create-skill",
      mutated: false,
      assistantMessage: e instanceof Error ? e.message : "Create failed",
    };
  }
}

export function createSkillHelpMessage(): string {
  return [
    "## Create a custom skill",
    "",
    "Provide enough detail for the server to save a file. Formats:",
    "",
    "1. **Pipe:** `/create-skill my-skill | short description | markdown body instructions…`",
    "2. **JSON:** `/create-skill {\"name\":\"my-skill\",\"description\":\"…\",\"body\":\"…\"}`",
    "3. **SKILL.md** in a fenced code block after `/create-skill`",
    "",
    "Rules enforced:",
    "- Name: lowercase, digits, hyphens (2–64 chars)",
    "- Cannot overwrite built-ins or meta skills",
    "- Chat-only (`side_effect: none`) — no clinical chart writes",
    "- Safety footer is added automatically",
    "",
    "Or send `/create-skill` with free-form notes and I will help draft a SKILL.md (re-run with a fenced block or pipe format to save).",
  ].join("\n");
}

export function formatSkillsList(): string {
  const skills = listSkills();
  const lines = skills.map(
    (s) =>
      `- \`/${s.name}\`${s.argumentHint ? ` ${s.argumentHint}` : ""} — ${s.description.split("\n")[0]}`,
  );
  return ["## Available skills", "", ...lines].join("\n");
}
