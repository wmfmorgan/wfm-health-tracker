import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useFreshDb } from "../helpers/test-db";
import { listSkills, createCustomSkill, deleteCustomSkill, getSkill } from "@/server/ai/skills/registry";
import { runChatTurn } from "@/server/ai/skills/chat";
import { createThread, getThread } from "@/server/services/chat";
import { createMedication } from "@/server/services/medications";
import { createAllergy } from "@/server/services/allergies";
import type { AIProvider } from "@/server/ai/types";
import { ensureDataDirs } from "@/server/db";

useFreshDb();

class FakeProvider implements AIProvider {
  id: "ollama" = "ollama";
  lastSystem = "";
  lastUser = "";
  constructor(private reply = "SKILL_OK") {}
  async completeJson() {
    return {};
  }
  async completeText(input: { system: string; user: string }) {
    this.lastSystem = input.system;
    this.lastUser = input.user;
    return this.reply;
  }
}

describe("skills registry", () => {
  it("loads builtin skills from repo", () => {
    const skills = listSkills();
    const names = skills.map((s) => s.name);
    expect(names).toContain("med-check");
    expect(names).toContain("lab-interpret");
    expect(names).toContain("analyte-explain");
    expect(names).toContain("synthesize-plan");
    expect(names).toContain("create-skill");
    expect(names).toContain("delete-skill");
    expect(getSkill("med-check")?.wfm.builtin).toBe(true);
  });

  it("creates and deletes custom skills under DATA_DIR", () => {
    const skill = createCustomSkill({
      name: "flare-prep",
      description: "Prep questions for a flare visit",
      body: "List open questions for GI.",
    });
    expect(skill.name).toBe("flare-prep");
    const { dataDir } = ensureDataDirs();
    const p = path.join(dataDir, "skills", "custom", "flare-prep", "SKILL.md");
    expect(fs.existsSync(p)).toBe(true);
    expect(getSkill("flare-prep")?.wfm.builtin).toBe(false);

    deleteCustomSkill("flare-prep");
    expect(getSkill("flare-prep")).toBeUndefined();
    expect(fs.existsSync(p)).toBe(false);
  });

  it("refuses deleting builtins", () => {
    expect(() => deleteCustomSkill("med-check")).toThrow(/built-in/i);
  });
});

describe("slash skills in chat", () => {
  it("runs /med-check with chart context", async () => {
    createMedication({
      name: "Mesalamine",
      status: "active",
      dose: "1.2g",
      prn: false,
    });
    createAllergy({ name: "Penicillin", reaction: "rash", severity: "moderate" });

    const thread = createThread();
    const provider = new FakeProvider("Checked meds OK");
    const result = await runChatTurn({
      threadId: thread.id,
      userMessage: "/med-check focus on mesalamine",
      provider: "ollama",
      model: "test",
      scope: {
        medications: true,
        supplements: true,
        allergies: true,
        diagnoses: true,
        profile: true,
        labs: true,
        acceptedViews: true,
        myPlan: true,
      },
      deps: { provider },
    });

    expect(result.skillName).toBe("med-check");
    expect(result.assistantMessage).toContain("Checked meds");
    expect(provider.lastSystem).toMatch(/Med \/ supplement/i);
    expect(provider.lastUser).toMatch(/Mesalamine/);
    expect(provider.lastUser).toMatch(/Penicillin/);

    const full = getThread(thread.id)!;
    expect(full.messages.some((m) => m.content.includes("/med-check"))).toBe(
      true,
    );
  });

  it("delete-skill removes custom skill via chat", async () => {
    createCustomSkill({
      name: "temp-skill",
      description: "temp",
      body: "Do temp things",
    });
    const thread = createThread();
    const result = await runChatTurn({
      threadId: thread.id,
      userMessage: "/delete_skill temp-skill",
      provider: "ollama",
      model: "test",
      scope: {},
      deps: { provider: new FakeProvider() },
    });
    expect(result.skillName).toBe("delete-skill");
    expect(result.assistantMessage).toMatch(/Deleted/i);
    expect(getSkill("temp-skill")).toBeUndefined();
  });

  it("create-skill pipe format saves custom skill", async () => {
    const thread = createThread();
    const result = await runChatTurn({
      threadId: thread.id,
      userMessage:
        "/create-skill visit-prep | Prep for clinic | List questions for the doctor.",
      provider: "ollama",
      model: "test",
      scope: {},
      deps: { provider: new FakeProvider() },
    });
    expect(result.skillName).toBe("create-skill");
    expect(result.assistantMessage).toMatch(/Created custom skill/i);
    expect(getSkill("visit-prep")?.description).toMatch(/Prep for clinic/);
    deleteCustomSkill("visit-prep");
  });
});
