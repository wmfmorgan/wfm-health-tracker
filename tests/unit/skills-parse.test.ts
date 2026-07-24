import { describe, it, expect } from "vitest";
import { parseSkillMarkdown, serializeSkillMarkdown } from "@/lib/skills/parse-skill-md";
import { validateSkillName, normalizeSkillName } from "@/lib/skills/validate-skill-name";
import { parseSlashCommand } from "@/server/ai/skills/registry";
import { parseCreateSkillArgs } from "@/server/ai/skills/meta-skills";
import { mergeSkillScope } from "@/server/ai/skills/runner";

describe("validateSkillName", () => {
  it("accepts valid names and normalizes underscores", () => {
    expect(validateSkillName("med-check")).toEqual({ ok: true, name: "med-check" });
    expect(normalizeSkillName("delete_skill")).toBe("delete-skill");
    expect(validateSkillName("delete_skill")).toEqual({
      ok: true,
      name: "delete-skill",
    });
  });

  it("rejects invalid names", () => {
    expect(validateSkillName("-bad")).toMatchObject({ ok: false });
    expect(validateSkillName("A")).toMatchObject({ ok: false });
  });
});

describe("parseSkillMarkdown", () => {
  it("parses frontmatter and body", () => {
    const md = `---
name: med-check
description: Check meds
argument-hint: "[focus]"
wfm:
  default_scope:
    medications: true
    labs: false
  allow_persona: true
  side_effect: none
  builtin: true
---

# Hello

Body text.
`;
    const skill = parseSkillMarkdown(md, "test.md", { builtin: true });
    expect(skill.name).toBe("med-check");
    expect(skill.description).toContain("Check meds");
    expect(skill.argumentHint).toBe("[focus]");
    expect(skill.body).toContain("Hello");
    expect(skill.wfm.defaultScope.medications).toBe(true);
    expect(skill.wfm.defaultScope.labs).toBe(false);
    expect(skill.wfm.builtin).toBe(true);
    expect(skill.wfm.sideEffect).toBe("none");
  });
});

describe("parseSlashCommand", () => {
  it("parses command and args", () => {
    expect(parseSlashCommand("/med-check focus iron")).toEqual({
      skillName: "med-check",
      args: "focus iron",
    });
    expect(parseSlashCommand("hello")).toBeNull();
  });
});

describe("parseCreateSkillArgs", () => {
  it("parses pipe format", () => {
    const p = parseCreateSkillArgs("flare-prep | prep for GI visit | List open questions.");
    expect(p).toMatchObject({
      name: "flare-prep",
      description: "prep for GI visit",
      body: "List open questions.",
    });
  });
});

describe("mergeSkillScope", () => {
  it("ANDs skill defaults with user scope", () => {
    const merged = mergeSkillScope(
      { medications: true, labs: true, tests: false },
      { medications: true, labs: false, tests: true },
    );
    expect(merged.medications).toBe(true);
    expect(merged.labs).toBe(false);
    expect(merged.tests).toBe(false);
  });
});

describe("serializeSkillMarkdown", () => {
  it("round-trips name", () => {
    const md = serializeSkillMarkdown({
      name: "my-skill",
      description: "Does a thing",
      body: "# Do the thing",
    });
    const skill = parseSkillMarkdown(md, "x", { builtin: false });
    expect(skill.name).toBe("my-skill");
    expect(skill.wfm.sideEffect).toBe("none");
    expect(skill.wfm.builtin).toBe(false);
  });
});
