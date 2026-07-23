import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { personas, personaViews, chatThreads, chatMessages, myPlan } from "@/server/db/schema";
import { seedBuiltinPersonas } from "@/server/db/migrate";
import { BUILTIN_PERSONAS } from "@/server/ai/personas/seed";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";
import {
  listPersonas,
  getPersona,
  createCustomPersona,
  updatePersona,
  resetPersonaPrompt,
  deleteCustomPersona,
  ensurePersonasSeeded,
} from "@/server/services/personas";
import { eq } from "drizzle-orm";

useFreshDb();

describe("personas schema + seed", () => {
  it("seeds at least 7 built-in personas on migrate", () => {
    const rows = getDb().select().from(personas).all();
    expect(rows.length).toBeGreaterThanOrEqual(7);
    const slugs = rows.map((r) => r.slug).sort();
    expect(slugs).toEqual(
      expect.arrayContaining([
        "gi",
        "pcp",
        "pharmacist",
        "functional",
        "urologist",
        "nutritionist",
        "cardiologist",
      ]),
    );
    expect(rows.every((r) => r.isBuiltin)).toBe(true);
    expect(rows.every((r) => r.isEnabled)).toBe(true);
    expect(rows.every((r) => r.systemPromptDefault.length > 0)).toBe(true);
  });

  it("uses fuller specialty prompts from seed.ts", () => {
    const gi = getPersona("gi");
    const seedGi = BUILTIN_PERSONAS.find((p) => p.id === "gi")!;
    expect(gi?.systemPromptDefault).toBe(seedGi.systemPromptDefault);
    expect(gi!.systemPromptDefault.length).toBeGreaterThan(200);
    expect(gi!.systemPromptDefault.toLowerCase()).toContain("gastroenterology");
  });

  it("persona_views, chat, and my_plan tables are queryable", () => {
    expect(getDb().select().from(personaViews).all()).toEqual([]);
    expect(getDb().select().from(chatThreads).all()).toEqual([]);
    expect(getDb().select().from(chatMessages).all()).toEqual([]);
    expect(getDb().select().from(myPlan).all()).toEqual([]);
  });

  it("seedBuiltinPersonas is idempotent and preserves overrides", () => {
    const db = getDb();
    db.update(personas)
      .set({ systemPromptOverride: "custom override" })
      .where(eq(personas.id, "gi"))
      .run();

    seedBuiltinPersonas();
    seedBuiltinPersonas();

    const rows = db.select().from(personas).all();
    expect(rows.length).toBe(7);
    const gi = db.select().from(personas).where(eq(personas.id, "gi")).get();
    expect(gi?.systemPromptOverride).toBe("custom override");
    expect(gi?.systemPromptDefault.length).toBeGreaterThan(0);
  });
});

describe("personas service", () => {
  it("listPersonas and enabledOnly filter", () => {
    ensurePersonasSeeded();
    const all = listPersonas();
    expect(all.length).toBeGreaterThanOrEqual(7);

    updatePersona("gi", { isEnabled: false });
    const enabled = listPersonas({ enabledOnly: true });
    expect(enabled.every((p) => p.isEnabled)).toBe(true);
    expect(enabled.find((p) => p.id === "gi")).toBeUndefined();

    const again = listPersonas();
    expect(again.find((p) => p.id === "gi")?.isEnabled).toBe(false);
  });

  it("override, reset, and resolveEffectivePrompt", () => {
    const before = getPersona("pharmacist")!;
    expect(before.systemPromptOverride).toBeNull();

    updatePersona("pharmacist", {
      systemPromptOverride: "  CUSTOM PHARMACIST LENS  ",
      description: "tweaked",
    });
    const overridden = getPersona("pharmacist")!;
    expect(overridden.systemPromptOverride).toBe("CUSTOM PHARMACIST LENS");
    expect(overridden.description).toBe("tweaked");

    const effective = resolveEffectivePrompt(overridden);
    expect(effective.startsWith("CUSTOM PHARMACIST LENS")).toBe(true);
    expect(effective).toContain(SAFETY_SYSTEM_SUFFIX);

    resetPersonaPrompt("pharmacist");
    const reset = getPersona("pharmacist")!;
    expect(reset.systemPromptOverride).toBeNull();
    const defaultEffective = resolveEffectivePrompt(reset);
    expect(defaultEffective.startsWith(reset.systemPromptDefault.trim())).toBe(true);
    expect(defaultEffective).toContain(SAFETY_SYSTEM_SUFFIX);
  });

  it("createCustomPersona, disable, and delete", () => {
    const custom = createCustomPersona({
      name: "Sleep specialist",
      specialty: "Sleep medicine",
      description: "Sleep-focused lens",
      systemPromptDefault: "You are an assistive sleep medicine reviewer of a personal health chart.",
    });
    expect(custom.isBuiltin).toBe(false);
    expect(custom.isEnabled).toBe(true);
    expect(custom.slug).toMatch(/^sleep-specialist-/);
    expect(listPersonas().length).toBe(8);

    updatePersona(custom.id, { isEnabled: false, name: "Sleep MD" });
    expect(getPersona(custom.id)?.name).toBe("Sleep MD");
    expect(listPersonas({ enabledOnly: true }).find((p) => p.id === custom.id)).toBeUndefined();

    deleteCustomPersona(custom.id);
    expect(getPersona(custom.id)).toBeUndefined();
    expect(listPersonas().length).toBe(7);
  });

  it("rejects deleting built-ins and resetting custom prompts", () => {
    expect(() => deleteCustomPersona("gi")).toThrow(/built-in/i);

    const custom = createCustomPersona({
      name: "Temp",
      systemPromptDefault: "temp prompt for testing custom persona rules",
    });
    expect(() => resetPersonaPrompt(custom.id)).toThrow(/built-in/i);
    deleteCustomPersona(custom.id);
  });

  it("clearing override via empty string nulls it", () => {
    updatePersona("pcp", { systemPromptOverride: "temp" });
    expect(getPersona("pcp")?.systemPromptOverride).toBe("temp");
    updatePersona("pcp", { systemPromptOverride: "  " });
    expect(getPersona("pcp")?.systemPromptOverride).toBeNull();
  });
});
