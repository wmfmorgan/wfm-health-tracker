import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createReading,
  createSession,
  deleteReading,
  deleteSession,
  getLatestReading,
  getLatestSummary,
  getSessionWithReadings,
  listMetricSummaries,
  listReadings,
} from "@/server/services/metrics";
import { getProfile, upsertProfile } from "@/server/services/profile";
import {
  getPinnedVitals,
  savePinnedVitals,
} from "@/server/services/settings";

useFreshDb();

describe("metrics service", () => {
  it("creates ad-hoc BP and returns latest", () => {
    createReading({
      metricType: "blood_pressure",
      valuePrimary: 120,
      valueSecondary: 80,
      unit: "mmHg",
      measuredAt: "2026-07-01",
      notes: null,
      category: null,
      sessionId: null,
    });
    const latest = getLatestReading("blood_pressure");
    expect(latest?.valuePrimary).toBe(120);
    expect(latest?.valueSecondary).toBe(80);
  });

  it("dual-writes weight to profile on create", () => {
    createReading({
      metricType: "weight",
      valuePrimary: 211,
      valueSecondary: null,
      unit: "lb",
      measuredAt: "2026-07-10",
      notes: null,
      category: null,
      sessionId: null,
    });
    const p = getProfile();
    expect(p.weightValue).toBe(211);
    expect(p.weightUnit).toBe("lb");
  });

  it("uses latest measured_at for profile sync", () => {
    createReading({
      metricType: "weight",
      valuePrimary: 215,
      unit: "lb",
      measuredAt: "2026-06-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    createReading({
      metricType: "weight",
      valuePrimary: 211,
      unit: "lb",
      measuredAt: "2026-07-15",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    expect(getProfile().weightValue).toBe(211);
  });

  it("creates body-comp session with multiple readings", () => {
    const session = createSession({
      measuredAt: "2026-07-20",
      source: "device_report",
      deviceLabel: "InBody",
      notes: null,
      readings: [
        { metricType: "weight", valuePrimary: 211.2, unit: "lb" },
        { metricType: "body_fat_percent", valuePrimary: 19.3, unit: "%" },
        { metricType: "visceral_fat_index", valuePrimary: 9, unit: "index" },
        { metricType: "lean_mass", valuePrimary: 161.8, unit: "lb" },
        { metricType: "heart_rate", valuePrimary: 106, unit: "bpm" },
      ],
    });
    expect(session.readings).toHaveLength(5);
    expect(getProfile().weightValue).toBe(211.2);
    const full = getSessionWithReadings(session.id);
    expect(full?.deviceLabel).toBe("InBody");
    expect(full?.readings.some((r) => r.metricType === "body_fat_percent")).toBe(
      true,
    );
  });

  it("records height/weight history when profile changes", () => {
    upsertProfile({
      preferredLengthUnit: "in",
      preferredWeightUnit: "lb",
      heightValue: 70,
      heightUnit: "in",
      weightValue: 210,
      weightUnit: "lb",
    });
    const heights = listReadings({ metricType: "height" });
    const weights = listReadings({ metricType: "weight" });
    expect(heights.length).toBeGreaterThanOrEqual(1);
    expect(weights.length).toBeGreaterThanOrEqual(1);
    expect(heights[0]!.valuePrimary).toBe(70);
  });

  it("recomputes profile after deleting latest weight", () => {
    createReading({
      metricType: "weight",
      valuePrimary: 200,
      unit: "lb",
      measuredAt: "2026-05-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    const newer = createReading({
      metricType: "weight",
      valuePrimary: 205,
      unit: "lb",
      measuredAt: "2026-07-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    expect(getProfile().weightValue).toBe(205);
    deleteReading(newer.id);
    expect(getProfile().weightValue).toBe(200);
  });

  it("deletes session and cascade readings", () => {
    const session = createSession({
      measuredAt: "2026-07-01",
      source: "manual",
      deviceLabel: null,
      notes: null,
      readings: [{ metricType: "bmr", valuePrimary: 1920, unit: "cal" }],
    });
    deleteSession(session.id);
    expect(getSessionWithReadings(session.id)).toBeUndefined();
    expect(listReadings({ sessionId: session.id })).toHaveLength(0);
  });

  it("computes BMI in latest summary", () => {
    createReading({
      metricType: "height",
      valuePrimary: 70,
      unit: "in",
      measuredAt: "2026-01-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    createReading({
      metricType: "weight",
      valuePrimary: 211,
      unit: "lb",
      measuredAt: "2026-07-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    const summary = getLatestSummary();
    expect(summary.bmi).not.toBeNull();
    expect(summary.bmi!).toBeGreaterThan(25);
    expect(summary.bmiFormatted).toMatch(/^\d+\.\d$/);
  });

  it("lists metric summaries with series and synthetic BMI", () => {
    createReading({
      metricType: "height",
      valuePrimary: 70,
      unit: "in",
      measuredAt: "2026-01-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    createReading({
      metricType: "weight",
      valuePrimary: 215,
      unit: "lb",
      measuredAt: "2026-06-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    createReading({
      metricType: "weight",
      valuePrimary: 211,
      unit: "lb",
      measuredAt: "2026-07-01",
      valueSecondary: null,
      notes: null,
      category: null,
      sessionId: null,
    });
    createReading({
      metricType: "blood_pressure",
      valuePrimary: 120,
      valueSecondary: 80,
      unit: "mmHg",
      measuredAt: "2026-07-02",
      notes: null,
      category: null,
      sessionId: null,
    });

    const summaries = listMetricSummaries();
    const keys = summaries.map((s) => s.key);
    expect(keys).toContain("weight");
    expect(keys).toContain("blood_pressure");
    expect(keys).toContain("bmi");

    const weight = summaries.find((s) => s.key === "weight")!;
    expect(weight.pointCount).toBe(2);
    expect(weight.numericSeries).toHaveLength(2);
    expect(weight.latestDisplay).toMatch(/211/);

    const bp = summaries.find((s) => s.key === "blood_pressure")!;
    expect(bp.latestDisplay).toMatch(/120\/80/);

    const bmi = summaries.find((s) => s.key === "bmi")!;
    expect(bmi.numericSeries.length).toBeGreaterThanOrEqual(2);
  });

  it("persists pinned vitals settings", () => {
    expect(getPinnedVitals()).toEqual([]);
    savePinnedVitals(["weight", "bmi", "blood_pressure"]);
    expect(getPinnedVitals()).toEqual(["weight", "bmi", "blood_pressure"]);
    savePinnedVitals([]);
    expect(getPinnedVitals()).toEqual([]);
  });
});
