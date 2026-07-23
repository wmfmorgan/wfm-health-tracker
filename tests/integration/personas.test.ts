import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { personas, personaViews, chatThreads, chatMessages, myPlan } from "@/server/db/schema";
import { seedBuiltinPersonas } from "@/server/db/migrate";
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
