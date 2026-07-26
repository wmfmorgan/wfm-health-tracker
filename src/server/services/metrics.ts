import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { metricReadings, metricSessions, profile } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import { getMetricDef, SUMMARY_METRIC_KEYS, METRIC_CATALOG } from "@/lib/metrics/catalog";
import { computeBmi, formatBmi } from "@/lib/metrics/bmi";
import type { ReadingInput, SessionInput } from "@/lib/validation/metrics";
import type {
  MetricNumericPoint,
  MetricSummary,
} from "@/lib/metrics/series-types";

export type { MetricNumericPoint, MetricSummary } from "@/lib/metrics/series-types";

const PROFILE_ID = "default";

export type MetricReading = typeof metricReadings.$inferSelect;
export type MetricSession = typeof metricSessions.$inferSelect;

export type MetricSessionWithReadings = MetricSession & {
  readings: MetricReading[];
};

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}

// ─── Dual-write: profile current height/weight from latest readings ───

/**
 * Set profile height/weight from the latest reading of each type.
 * If no reading exists, leaves profile field unchanged (does not clear)
 * unless `clearIfMissing` is true.
 */
export function syncProfileHeightWeightFromLatest(opts?: {
  clearIfMissing?: boolean;
}) {
  bootstrapDb();
  const db = getDb();
  const clear = opts?.clearIfMissing === true;

  // Ensure profile row exists (createReading may run before any profile page visit)
  const existing = db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get();
  if (!existing) {
    db.insert(profile)
      .values({
        id: PROFILE_ID,
        preferredLengthUnit: "cm",
        preferredWeightUnit: "kg",
        updatedAt: nowIso(),
      })
      .run();
  }

  const latestHeight = getLatestReading("height");
  const latestWeight = getLatestReading("weight");

  if (!latestHeight && !latestWeight && !clear) return;

  const set: {
    heightValue?: number | null;
    heightUnit?: string | null;
    weightValue?: number | null;
    weightUnit?: string | null;
    updatedAt: string;
  } = { updatedAt: nowIso() };

  if (latestHeight) {
    set.heightValue = latestHeight.valuePrimary;
    set.heightUnit = latestHeight.unit;
  } else if (clear) {
    set.heightValue = null;
    set.heightUnit = null;
  }

  if (latestWeight) {
    set.weightValue = latestWeight.valuePrimary;
    set.weightUnit = latestWeight.unit;
  } else if (clear) {
    set.weightValue = null;
    set.weightUnit = null;
  }

  db.update(profile).set(set).where(eq(profile.id, PROFILE_ID)).run();
}

/**
 * After profile form save: if height and/or weight changed, insert ad-hoc readings.
 * Call with previous profile row before upsert.
 */
export function recordHeightWeightFromProfileChange(opts: {
  previous: {
    heightValue: number | null;
    heightUnit: string | null;
    weightValue: number | null;
    weightUnit: string | null;
  };
  next: {
    heightValue: number | null | undefined;
    heightUnit: string | null | undefined;
    weightValue: number | null | undefined;
    weightUnit: string | null | undefined;
  };
  measuredAt?: string;
}) {
  const measuredAt =
    opts.measuredAt ?? new Date().toISOString().slice(0, 10);

  const heightChanged =
    opts.next.heightValue != null &&
    Number.isFinite(opts.next.heightValue) &&
    (opts.previous.heightValue !== opts.next.heightValue ||
      (opts.previous.heightUnit ?? null) !== (opts.next.heightUnit ?? null));

  const weightChanged =
    opts.next.weightValue != null &&
    Number.isFinite(opts.next.weightValue) &&
    (opts.previous.weightValue !== opts.next.weightValue ||
      (opts.previous.weightUnit ?? null) !== (opts.next.weightUnit ?? null));

  if (heightChanged && opts.next.heightValue != null) {
    createReading(
      {
        metricType: "height",
        valuePrimary: opts.next.heightValue,
        valueSecondary: null,
        unit: opts.next.heightUnit || "cm",
        category: null,
        measuredAt,
        notes: "From profile",
        sessionId: null,
      },
      { skipProfileSync: true },
    );
  }

  if (weightChanged && opts.next.weightValue != null) {
    createReading(
      {
        metricType: "weight",
        valuePrimary: opts.next.weightValue,
        valueSecondary: null,
        unit: opts.next.weightUnit || "kg",
        category: null,
        measuredAt,
        notes: "From profile",
        sessionId: null,
      },
      { skipProfileSync: true },
    );
  }

  // Profile already has the new values from upsert; no need to re-sync
}

// ─── Readings ───

export function getReading(id: string): MetricReading | undefined {
  bootstrapDb();
  return getDb().select().from(metricReadings).where(eq(metricReadings.id, id)).get();
}

export function getLatestReading(metricType: string): MetricReading | undefined {
  bootstrapDb();
  return getDb()
    .select()
    .from(metricReadings)
    .where(eq(metricReadings.metricType, metricType))
    .orderBy(desc(metricReadings.measuredAt), desc(metricReadings.createdAt))
    .limit(1)
    .get();
}

export function listReadings(filter?: {
  metricType?: string;
  sessionId?: string | null;
  adHocOnly?: boolean;
  limit?: number;
}): MetricReading[] {
  bootstrapDb();
  const db = getDb();
  const conditions = [];

  if (filter?.metricType) {
    conditions.push(eq(metricReadings.metricType, filter.metricType));
  }
  if (filter?.sessionId) {
    conditions.push(eq(metricReadings.sessionId, filter.sessionId));
  }
  if (filter?.adHocOnly) {
    conditions.push(isNull(metricReadings.sessionId));
  }

  let q = db
    .select()
    .from(metricReadings)
    .orderBy(desc(metricReadings.measuredAt), desc(metricReadings.createdAt))
    .$dynamic();

  if (conditions.length === 1) {
    q = q.where(conditions[0]!);
  } else if (conditions.length > 1) {
    q = q.where(and(...conditions));
  }

  if (filter?.limit && filter.limit > 0) {
    q = q.limit(filter.limit);
  }

  return q.all();
}

export function createReading(
  input: ReadingInput,
  opts?: { skipProfileSync?: boolean },
): MetricReading {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(metricReadings)
    .values({
      id,
      sessionId: emptyToNull(input.sessionId ?? null),
      metricType: input.metricType,
      valuePrimary: input.valuePrimary,
      valueSecondary:
        input.valueSecondary != null && Number.isFinite(input.valueSecondary)
          ? input.valueSecondary
          : null,
      unit: input.unit,
      category: emptyToNull(input.category),
      measuredAt: input.measuredAt,
      notes: emptyToNull(input.notes),
      createdAt: t,
      updatedAt: t,
    })
    .run();

  if (!opts?.skipProfileSync && (input.metricType === "height" || input.metricType === "weight")) {
    syncProfileHeightWeightFromLatest();
  }

  return getReading(id)!;
}

export function updateReading(id: string, input: ReadingInput): MetricReading | undefined {
  bootstrapDb();
  const existing = getReading(id);
  if (!existing) return undefined;

  getDb()
    .update(metricReadings)
    .set({
      metricType: input.metricType,
      valuePrimary: input.valuePrimary,
      valueSecondary:
        input.valueSecondary != null && Number.isFinite(input.valueSecondary)
          ? input.valueSecondary
          : null,
      unit: input.unit,
      category: emptyToNull(input.category),
      measuredAt: input.measuredAt,
      notes: emptyToNull(input.notes),
      updatedAt: nowIso(),
    })
    .where(eq(metricReadings.id, id))
    .run();

  if (
    existing.metricType === "height" ||
    existing.metricType === "weight" ||
    input.metricType === "height" ||
    input.metricType === "weight"
  ) {
    syncProfileHeightWeightFromLatest({ clearIfMissing: true });
  }

  return getReading(id)!;
}

export function deleteReading(id: string): void {
  bootstrapDb();
  const existing = getReading(id);
  if (!existing) return;
  getDb().delete(metricReadings).where(eq(metricReadings.id, id)).run();
  if (existing.metricType === "height" || existing.metricType === "weight") {
    syncProfileHeightWeightFromLatest({ clearIfMissing: true });
  }
}

// ─── Sessions ───

export function getSession(id: string): MetricSession | undefined {
  bootstrapDb();
  return getDb().select().from(metricSessions).where(eq(metricSessions.id, id)).get();
}

export function getSessionWithReadings(id: string): MetricSessionWithReadings | undefined {
  const session = getSession(id);
  if (!session) return undefined;
  const readings = listReadings({ sessionId: id });
  return { ...session, readings };
}

export function listSessions(limit?: number): MetricSession[] {
  bootstrapDb();
  let q = getDb()
    .select()
    .from(metricSessions)
    .orderBy(desc(metricSessions.measuredAt), desc(metricSessions.createdAt))
    .$dynamic();
  if (limit && limit > 0) q = q.limit(limit);
  return q.all();
}

export function listSessionsWithReadingCounts(limit?: number): Array<
  MetricSession & { readingCount: number }
> {
  bootstrapDb();
  const sessions = listSessions(limit);
  return sessions.map((s) => {
    const row = getDb()
      .select({ c: sql<number>`count(*)` })
      .from(metricReadings)
      .where(eq(metricReadings.sessionId, s.id))
      .get();
    return { ...s, readingCount: Number(row?.c ?? 0) };
  });
}

export function createSession(input: SessionInput): MetricSessionWithReadings {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  const db = getDb();

  db.insert(metricSessions)
    .values({
      id,
      measuredAt: input.measuredAt,
      source: input.source ?? "device_report",
      deviceLabel: emptyToNull(input.deviceLabel),
      notes: emptyToNull(input.notes),
      createdAt: t,
      updatedAt: t,
    })
    .run();

  for (const r of input.readings) {
    createReading(
      {
        metricType: r.metricType,
        valuePrimary: r.valuePrimary,
        valueSecondary: r.valueSecondary,
        unit: r.unit,
        category: r.category,
        measuredAt: input.measuredAt,
        notes: null,
        sessionId: id,
      },
      { skipProfileSync: true },
    );
  }

  syncProfileHeightWeightFromLatest();
  return getSessionWithReadings(id)!;
}

export function updateSessionMeta(
  id: string,
  patch: {
    measuredAt?: string;
    source?: "manual" | "device_report";
    deviceLabel?: string | null;
    notes?: string | null;
  },
): MetricSession | undefined {
  bootstrapDb();
  const existing = getSession(id);
  if (!existing) return undefined;

  const measuredAt = patch.measuredAt ?? existing.measuredAt;
  getDb()
    .update(metricSessions)
    .set({
      measuredAt,
      source: patch.source ?? existing.source,
      deviceLabel:
        patch.deviceLabel !== undefined
          ? emptyToNull(patch.deviceLabel)
          : existing.deviceLabel,
      notes: patch.notes !== undefined ? emptyToNull(patch.notes) : existing.notes,
      updatedAt: nowIso(),
    })
    .where(eq(metricSessions.id, id))
    .run();

  // Keep child readings' measured_at in sync when session date changes
  if (patch.measuredAt && patch.measuredAt !== existing.measuredAt) {
    getDb()
      .update(metricReadings)
      .set({ measuredAt: patch.measuredAt, updatedAt: nowIso() })
      .where(eq(metricReadings.sessionId, id))
      .run();
    syncProfileHeightWeightFromLatest();
  }

  return getSession(id)!;
}

/**
 * Replace all readings on a session (delete + re-insert).
 */
export function replaceSessionReadings(
  sessionId: string,
  readings: SessionInput["readings"],
  measuredAt: string,
): MetricSessionWithReadings | undefined {
  bootstrapDb();
  const session = getSession(sessionId);
  if (!session) return undefined;

  getDb().delete(metricReadings).where(eq(metricReadings.sessionId, sessionId)).run();

  for (const r of readings) {
    createReading(
      {
        metricType: r.metricType,
        valuePrimary: r.valuePrimary,
        valueSecondary: r.valueSecondary,
        unit: r.unit,
        category: r.category,
        measuredAt,
        notes: null,
        sessionId,
      },
      { skipProfileSync: true },
    );
  }

  getDb()
    .update(metricSessions)
    .set({ measuredAt, updatedAt: nowIso() })
    .where(eq(metricSessions.id, sessionId))
    .run();

  syncProfileHeightWeightFromLatest({ clearIfMissing: true });
  return getSessionWithReadings(sessionId)!;
}

export function deleteSession(id: string): void {
  bootstrapDb();
  // Cascade deletes readings
  getDb().delete(metricSessions).where(eq(metricSessions.id, id)).run();
  syncProfileHeightWeightFromLatest({ clearIfMissing: true });
}

// ─── Summary helpers ───

export type LatestSummary = {
  latestByType: Partial<Record<string, MetricReading>>;
  bmi: number | null;
  bmiFormatted: string | null;
};

export function getLatestSummary(): LatestSummary {
  bootstrapDb();
  const latestByType: Partial<Record<string, MetricReading>> = {};
  for (const key of SUMMARY_METRIC_KEYS) {
    const row = getLatestReading(key);
    if (row) latestByType[key] = row;
  }
  // Also pull any other latest that might help BMI
  if (!latestByType.height) {
    const h = getLatestReading("height");
    if (h) latestByType.height = h;
  }
  if (!latestByType.weight) {
    const w = getLatestReading("weight");
    if (w) latestByType.weight = w;
  }

  // Prefer profile for BMI if readings missing
  const p = getDb().select().from(profile).where(eq(profile.id, PROFILE_ID)).get();
  const height = latestByType.height;
  const weight = latestByType.weight;
  const bmi = computeBmi(
    height?.valuePrimary ?? p?.heightValue,
    height?.unit ?? p?.heightUnit,
    weight?.valuePrimary ?? p?.weightValue,
    weight?.unit ?? p?.weightUnit,
  );

  return { latestByType, bmi, bmiFormatted: formatBmi(bmi) };
}

export function formatReadingDisplay(r: MetricReading): string {
  const def = getMetricDef(r.metricType);
  if (def?.mode === "bp" && r.valueSecondary != null) {
    return `${Math.round(r.valuePrimary)}/${Math.round(r.valueSecondary)} ${r.unit}`;
  }
  const v =
    Number.isInteger(r.valuePrimary) || Math.abs(r.valuePrimary) >= 100
      ? String(Math.round(r.valuePrimary * 10) / 10)
      : String(Math.round(r.valuePrimary * 100) / 100);
  // Hide unit for pure index/score when unit equals key style
  if (r.unit === "index" || r.unit === "score") return v;
  return `${v} ${r.unit}`;
}

/**
 * Group readings by metric type for dashboard pin/trend cards.
 * Includes synthetic `bmi` when height + weight history allow it.
 */
export function listMetricSummaries(): MetricSummary[] {
  bootstrapDb();
  const all = listReadings(); // newest first
  const byType = new Map<string, MetricReading[]>();
  for (const r of all) {
    const list = byType.get(r.metricType) ?? [];
    list.push(r);
    byType.set(r.metricType, list);
  }

  const summaries: MetricSummary[] = [];

  // Catalog order first, then any unknown types
  const typeOrder = [
    ...METRIC_CATALOG.map((m) => m.key),
    ...[...byType.keys()].filter((k) => !getMetricDef(k)),
  ];
  const seen = new Set<string>();

  for (const metricType of typeOrder) {
    if (seen.has(metricType)) continue;
    const rows = byType.get(metricType);
    if (!rows || rows.length === 0) continue;
    seen.add(metricType);

    // Chronological for sparkline
    const chronological = [...rows].sort((a, b) => {
      const d = a.measuredAt.localeCompare(b.measuredAt);
      if (d !== 0) return d;
      return a.createdAt.localeCompare(b.createdAt);
    });
    const latest = rows[0]!; // listReadings is newest first
    const def = getMetricDef(metricType);

    const numericSeries: MetricNumericPoint[] = chronological.map((r) => ({
      date: r.measuredAt,
      value: r.valuePrimary,
      readingId: r.id,
    }));

    summaries.push({
      key: metricType,
      displayName: def?.shortLabel ?? def?.label ?? metricType,
      latestDisplay: formatReadingDisplay(latest),
      latestDate: latest.measuredAt,
      latestUnit: latest.unit,
      category: latest.category,
      pointCount: rows.length,
      numericSeries,
    });
  }

  // Synthetic BMI series from weight history + best height
  const bmiSummary = buildBmiSummary(byType);
  if (bmiSummary) summaries.unshift(bmiSummary);

  return summaries;
}

function buildBmiSummary(
  byType: Map<string, MetricReading[]>,
): MetricSummary | null {
  const weights = byType.get("weight");
  if (!weights || weights.length === 0) return null;

  const heights = byType.get("height") ?? [];
  const p = getDb().select().from(profile).where(eq(profile.id, PROFILE_ID)).get();

  const heightsChrono = [...heights].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  const weightsChrono = [...weights].sort((a, b) => {
    const d = a.measuredAt.localeCompare(b.measuredAt);
    if (d !== 0) return d;
    return a.createdAt.localeCompare(b.createdAt);
  });

  function heightAsOf(date: string): {
    value: number;
    unit: string;
  } | null {
    let best: MetricReading | null = null;
    for (const h of heightsChrono) {
      if (h.measuredAt <= date) best = h;
    }
    if (best) return { value: best.valuePrimary, unit: best.unit };
    if (p?.heightValue != null && p.heightUnit) {
      return { value: p.heightValue, unit: p.heightUnit };
    }
    // fall back to any height reading
    if (heightsChrono.length > 0) {
      const h = heightsChrono[heightsChrono.length - 1]!;
      return { value: h.valuePrimary, unit: h.unit };
    }
    return null;
  }

  const series: MetricNumericPoint[] = [];
  for (const w of weightsChrono) {
    const h = heightAsOf(w.measuredAt);
    if (!h) continue;
    const bmi = computeBmi(h.value, h.unit, w.valuePrimary, w.unit);
    if (bmi == null) continue;
    series.push({ date: w.measuredAt, value: bmi, readingId: w.id });
  }

  if (series.length === 0) return null;

  const latestBmi = series[series.length - 1]!;
  return {
    key: "bmi",
    displayName: "BMI",
    latestDisplay: formatBmi(latestBmi.value) ?? String(latestBmi.value),
    latestDate: latestBmi.date,
    latestUnit: null,
    category: null,
    pointCount: series.length,
    numericSeries: series,
  };
}

/** Recent readings for co-pilot context (ad-hoc + session), capped. */
export function listRecentForContext(opts?: {
  perTypeLimit?: number;
  sessionLimit?: number;
}): {
  latestCore: MetricReading[];
  recentSessions: MetricSessionWithReadings[];
} {
  const perType = opts?.perTypeLimit ?? 3;
  const sessionLimit = opts?.sessionLimit ?? 2;

  const coreTypes = [
    "blood_pressure",
    "weight",
    "height",
    "heart_rate",
    "glucose",
    "waist_circumference",
    "spo2",
    "temperature",
    "body_fat_percent",
    "visceral_fat_index",
  ];

  const latestCore: MetricReading[] = [];
  for (const t of coreTypes) {
    const rows = listReadings({ metricType: t, limit: perType });
    latestCore.push(...rows);
  }

  const sessions = listSessions(sessionLimit);
  const recentSessions = sessions
    .map((s) => getSessionWithReadings(s.id))
    .filter((s): s is MetricSessionWithReadings => s != null);

  return { latestCore, recentSessions };
}
