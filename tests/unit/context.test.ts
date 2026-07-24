import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { useFreshDb, getDb } from "../helpers/test-db";
import { myPlan, personaViews } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import {
  buildChartContext,
  listCurrentAcceptedViews,
} from "@/server/ai/context";
import { upsertProfile } from "@/server/services/profile";
import { createAllergy } from "@/server/services/allergies";
import { createDiagnosis } from "@/server/services/diagnoses";
import { createMedication, listMedications } from "@/server/services/medications";
import { createSupplement } from "@/server/services/supplements";
import { createLabPanel, listLabPanels } from "@/server/services/labs";
import { createClinicalTest } from "@/server/services/clinical-tests";
import { createProcedure } from "@/server/services/procedures";
import { ensurePersonasSeeded } from "@/server/services/personas";

useFreshDb();

/** Test helper: insert a persona_views row via drizzle. */
export function insertPersonaView(opts: {
  personaId: string;
  status: "draft" | "accepted" | "rejected" | "superseded";
  bodyMd: string;
  title?: string;
  version?: number;
  acceptedAt?: string | null;
  topicsJson?: string | null;
}) {
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(personaViews)
    .values({
      id,
      personaId: opts.personaId,
      status: opts.status,
      version: opts.version ?? (opts.status === "accepted" ? 1 : 0),
      title: opts.title ?? null,
      bodyMd: opts.bodyMd,
      sectionsJson: null,
      topicsJson: opts.topicsJson ?? null,
      citationsJson: null,
      factOpinionJson: null,
      provider: "test",
      model: "test",
      parentViewId: null,
      focusNote: null,
      createdAt: t,
      acceptedAt:
        opts.acceptedAt !== undefined
          ? opts.acceptedAt
          : opts.status === "accepted"
            ? t
            : null,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(personaViews).where(eq(personaViews.id, id)).get()!;
}

function seedMinimalChart() {
  upsertProfile({
    displayName: "Test Patient",
    dateOfBirth: "1990-05-15",
    sex: "female",
    heightValue: 165,
    heightUnit: "cm",
    weightValue: 60,
    weightUnit: "kg",
    bloodType: "O+",
    notes: null,
    preferredLengthUnit: "cm",
    preferredWeightUnit: "kg",
  });
  createAllergy({
    name: "Penicillin",
    reaction: "rash",
    severity: "moderate",
  });
  createDiagnosis({
    name: "Ulcerative colitis",
    status: "active",
    diagnosedOn: "2018-03-01",
  });
  createDiagnosis({
    name: "Childhood asthma",
    status: "resolved",
    diagnosedOn: "2000-01-01",
  });
  createMedication({
    name: "Mesalamine",
    status: "active",
    dose: "1.2g",
    frequency: "twice daily",
    prn: false,
    purpose: "Ulcerative colitis",
  });
  createMedication({
    name: "Prednisone",
    status: "stopped",
    dose: "40mg",
    prn: false,
  });
  createSupplement({
    name: "Vitamin D",
    status: "active",
    dose: "2000 IU",
    prn: false,
  });
  createLabPanel(
    {
      name: "CBC",
      collectedOn: "2026-01-15",
      status: "final",
      facility: "LabCorp",
    },
    [
      {
        analyteName: "WBC",
        value: "6.2",
        unit: "K/uL",
        refLow: "4.0",
        refHigh: "11.0",
        flag: "normal",
      },
      {
        analyteName: "Hgb",
        value: "11.0",
        unit: "g/dL",
        refLow: "13.0",
        refHigh: "17.0",
        flag: "L",
      },
    ],
  );
  createClinicalTest({
    type: "imaging",
    name: "Colonoscopy",
    performedOn: "2025-06-01",
    summary: "Mild left-sided colitis",
  });
  createProcedure({
    name: "Colonoscopy with biopsy",
    performedOn: "2025-06-01",
    outcome: "Biopsies taken",
  });
}

describe("listCurrentAcceptedViews", () => {
  it("returns only status=accepted views and never drafts", () => {
    ensurePersonasSeeded();
    insertPersonaView({
      personaId: "gi",
      status: "draft",
      bodyMd: "DRAFT_SECRET_SHOULD_NOT_APPEAR",
    });
    insertPersonaView({
      personaId: "gi",
      status: "superseded",
      bodyMd: "OLD_SUPERSEDED_VIEW",
      version: 1,
    });
    insertPersonaView({
      personaId: "gi",
      status: "accepted",
      bodyMd: "CURRENT_GI_VIEW",
      version: 2,
      title: "GI brief",
    });
    insertPersonaView({
      personaId: "pcp",
      status: "accepted",
      bodyMd: "CURRENT_PCP_VIEW",
      version: 1,
    });
    insertPersonaView({
      personaId: "pharmacist",
      status: "rejected",
      bodyMd: "REJECTED_VIEW",
    });

    const views = listCurrentAcceptedViews();
    expect(views).toHaveLength(2);
    expect(views.map((v) => v.bodyMd).sort()).toEqual(
      ["CURRENT_GI_VIEW", "CURRENT_PCP_VIEW"].sort(),
    );
    expect(views.every((v) => v.personaName.length > 0)).toBe(true);
  });

  it("excludePersonaId filters that persona out", () => {
    ensurePersonasSeeded();
    insertPersonaView({
      personaId: "gi",
      status: "accepted",
      bodyMd: "GI",
    });
    insertPersonaView({
      personaId: "pcp",
      status: "accepted",
      bodyMd: "PCP",
    });
    const views = listCurrentAcceptedViews({ excludePersonaId: "gi" });
    expect(views).toHaveLength(1);
    expect(views[0]!.personaId).toBe("pcp");
  });
});

describe("buildChartContext", () => {
  it("includes profile, active meds, diagnoses, labs, and citations", () => {
    seedMinimalChart();

    const ctx = buildChartContext({
      scope: {
        profile: true,
        allergies: true,
        diagnoses: true,
        medications: true,
        supplements: true,
        labs: true,
        tests: true,
        procedures: true,
      },
    });

    expect(ctx.charCount).toBe(ctx.text.length);
    expect(ctx.truncated).toBe(false);
    expect(ctx.text).toContain("# Patient chart context");
    expect(ctx.text).toContain("Test Patient");
    expect(ctx.text).toContain("Penicillin");
    expect(ctx.text).toContain("Ulcerative colitis");
    expect(ctx.text).toContain("Mesalamine");
    expect(ctx.text).toContain("Vitamin D");
    expect(ctx.text).toContain("WBC");
    expect(ctx.text).toContain("Hgb");
    expect(ctx.text).toContain("Colonoscopy");
    expect(ctx.text).toContain("Colonoscopy with biopsy");

    // Active/chronic preferred; resolved childhood asthma should not dominate
    expect(ctx.text).toContain("Ulcerative colitis");
    // Stopped meds excluded when filtering active
    expect(ctx.text).not.toContain("Prednisone");

    expect(ctx.citations.some((c) => c.entityType === "medication" && c.label === "Mesalamine")).toBe(
      true,
    );
    expect(ctx.citations.some((c) => c.entityType === "lab_panel")).toBe(true);
    expect(ctx.citations.some((c) => c.entityType === "allergy")).toBe(true);
  });

  it("excludes draft persona views and labels accepted peers as opinion", () => {
    seedMinimalChart();
    ensurePersonasSeeded();

    insertPersonaView({
      personaId: "gi",
      status: "draft",
      bodyMd: "DRAFT_BODY_LEAK_CHECK_XYZ",
    });
    insertPersonaView({
      personaId: "pcp",
      status: "accepted",
      bodyMd: "Consider primary care follow-up for anemia.",
      title: "Anemia note",
    });

    const ctx = buildChartContext({
      scope: {
        medications: true,
        acceptedViews: true,
      },
    });

    expect(ctx.text).toContain("Mesalamine");
    expect(ctx.text).toContain("Peer persona view (accepted)");
    expect(ctx.text).toMatch(/opinion, not chart fact/i);
    expect(ctx.text).toContain("Consider primary care follow-up for anemia.");
    expect(ctx.text).not.toContain("DRAFT_BODY_LEAK_CHECK_XYZ");
    expect(ctx.citations.some((c) => c.entityType === "persona_view")).toBe(true);
  });

  it("excludes excluded persona's accepted view", () => {
    ensurePersonasSeeded();
    insertPersonaView({
      personaId: "gi",
      status: "accepted",
      bodyMd: "GI_OWN_VIEW",
    });
    insertPersonaView({
      personaId: "pcp",
      status: "accepted",
      bodyMd: "PCP_PEER_VIEW",
    });

    const ctx = buildChartContext({
      scope: { acceptedViews: true },
      excludePersonaId: "gi",
    });

    expect(ctx.text).toContain("PCP_PEER_VIEW");
    expect(ctx.text).not.toContain("GI_OWN_VIEW");
  });

  it("includes my_plan default row when present and scoped", () => {
    const t = nowIso();
    getDb()
      .insert(myPlan)
      .values({
        id: "default",
        bodyMd: "Walk 30 min daily; recheck CBC in 3 months.",
        updatedAt: t,
      })
      .run();

    const withPlan = buildChartContext({ scope: { myPlan: true } });
    expect(withPlan.text).toContain("## My plan");
    expect(withPlan.text).toContain("Walk 30 min daily");
    expect(withPlan.citations.some((c) => c.entityType === "my_plan")).toBe(true);

    const without = buildChartContext({ scope: { medications: true } });
    expect(without.text).not.toContain("Walk 30 min daily");
  });

  it("sets truncated when maxChars is small and drops lab detail first", () => {
    seedMinimalChart();
    ensurePersonasSeeded();

    // Large lab-ish payload + multiple peer views to force truncation path
    createLabPanel(
      { name: "Metabolic panel", collectedOn: "2026-02-01", status: "final" },
      Array.from({ length: 20 }, (_, i) => ({
        analyteName: `Analyte_${i}_LONG_NAME_FOR_SIZE`,
        value: `${100 + i}.123456`,
        unit: "mmol/L",
        refLow: "1.0",
        refHigh: "99.0",
        flag: "normal" as const,
        notes: "x".repeat(80),
      })),
    );

    insertPersonaView({
      personaId: "gi",
      status: "accepted",
      bodyMd: "OLD_PEER_VIEW_CONTENT " + "g".repeat(400),
      acceptedAt: "2025-01-01T00:00:00.000Z",
      version: 1,
    });
    insertPersonaView({
      personaId: "pcp",
      status: "accepted",
      bodyMd: "NEW_PEER_VIEW_CONTENT " + "p".repeat(400),
      acceptedAt: "2026-06-01T00:00:00.000Z",
      version: 1,
    });

    const full = buildChartContext({
      scope: {
        profile: true,
        labs: true,
        medications: true,
        acceptedViews: true,
      },
    });
    expect(full.truncated).toBe(false);
    expect(full.text).toContain("Analyte_0_LONG_NAME_FOR_SIZE");
    expect(full.text).toContain("OLD_PEER_VIEW_CONTENT");
    expect(full.text).toContain("NEW_PEER_VIEW_CONTENT");

    // Budget small enough that lab detail must go; peer views may remain as summary fits
    const mid = buildChartContext({
      scope: {
        profile: true,
        labs: true,
        medications: true,
        acceptedViews: true,
      },
      maxChars: Math.min(2500, Math.floor(full.charCount * 0.55)),
    });
    expect(mid.truncated).toBe(true);
    expect(mid.charCount).toBeLessThanOrEqual(
      Math.min(2500, Math.floor(full.charCount * 0.55)),
    );
    // After lab-detail drop we show summary label
    expect(
      mid.text.includes("details truncated") ||
        mid.text.includes("panel list only") ||
        !mid.text.includes("Analyte_0_LONG_NAME_FOR_SIZE"),
    ).toBe(true);

    // Very tight budget should drop older peer views
    const tight = buildChartContext({
      scope: {
        profile: true,
        labs: true,
        medications: true,
        acceptedViews: true,
      },
      maxChars: 900,
    });
    expect(tight.truncated).toBe(true);
    expect(tight.charCount).toBeLessThanOrEqual(900);
    // Prefer keeping newer peer view over older when possible
    if (tight.text.includes("NEW_PEER_VIEW_CONTENT")) {
      // older may be dropped
      expect(tight.text.includes("OLD_PEER_VIEW_CONTENT")).toBe(false);
    }
  });

  it("respects empty scope", () => {
    seedMinimalChart();
    const ctx = buildChartContext({ scope: {} });
    expect(ctx.text).toContain("# Patient chart context");
    expect(ctx.text).not.toContain("Mesalamine");
    expect(ctx.truncated).toBe(false);
    expect(ctx.citations).toEqual([]);
  });

  it("filters medications and labs by selected ids", () => {
    seedMinimalChart();
    const stopped = listMedications().find((m) => m.name === "Prednisone");
    const active = listMedications().find((m) => m.name === "Mesalamine");
    expect(stopped && active).toBeTruthy();

    const onlyStopped = buildChartContext({
      scope: {
        medications: true,
        medicationIds: [stopped!.id],
      },
    });
    expect(onlyStopped.text).toContain("Prednisone");
    expect(onlyStopped.text).not.toContain("Mesalamine");
    expect(onlyStopped.text).toContain("Medications (selected)");

    const panels = listLabPanels();
    expect(panels.length).toBeGreaterThan(0);
    const onlyLab = buildChartContext({
      scope: {
        labs: true,
        labPanelIds: [panels[0]!.id],
      },
    });
    expect(onlyLab.text).toContain("CBC");
    expect(onlyLab.text).toContain("selected panels");
  });
});

