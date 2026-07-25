import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { labResults, labPanels, documentLinks } from "@/server/db/schema";
import {
  listAnalytes,
  listAllAliases,
  resolveAnalyteName,
  normalizeAnalyteLabel,
} from "@/server/services/analytes";
import type {
  AnalyteResultPoint,
  AnalyteNumericPoint,
  AnalyteSummary,
} from "@/lib/analyte-series-types";

export type {
  AnalyteResultPoint,
  AnalyteNumericPoint,
  AnalyteSummary,
} from "@/lib/analyte-series-types";

/** Parse chartable numeric lab values; returns null for qualitative/text results. */
export function parseNumericLabValue(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Reject pure qualitative
  if (/^(neg|negative|pos|positive|trace|normal|abnormal|nd|n\/a)$/i.test(s)) {
    return null;
  }
  // Strip comparison operators and commas: "<5", "1,234.5"
  s = s.replace(/,/g, "").replace(/^[<>≤≥]=?\s*/, "");
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function documentsByPanelId(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const links = getDb()
    .select()
    .from(documentLinks)
    .where(eq(documentLinks.entityType, "lab_panel"))
    .all();
  for (const link of links) {
    const list = map.get(link.entityId) ?? [];
    list.push(link.documentId);
    map.set(link.entityId, list);
  }
  return map;
}

function aliasesByAnalyteId(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of listAllAliases()) {
    const list = map.get(row.analyteId) ?? [];
    list.push(row.alias);
    map.set(row.analyteId, list);
  }
  return map;
}

/**
 * Group all lab results by resolved analyte (catalog id or orphan key).
 */
export function listAnalyteSummaries(): AnalyteSummary[] {
  bootstrapDb();
  // Ensure catalog seeds exist for resolution
  listAnalytes();

  const panels = getDb().select().from(labPanels).all();
  const panelById = new Map(panels.map((p) => [p.id, p]));
  const results = getDb().select().from(labResults).all();
  const docs = documentsByPanelId();
  const aliasMap = aliasesByAnalyteId();

  type Bucket = {
    key: string;
    analyteId: string | null;
    displayName: string;
    points: AnalyteResultPoint[];
  };
  const buckets = new Map<string, Bucket>();

  for (const r of results) {
    const panel = panelById.get(r.panelId);
    if (!panel) continue;
    const resolved = resolveAnalyteName(r.analyteName);
    if (!resolved.key) continue;

    const sortDate = panel.collectedOn?.trim() || panel.createdAt;
    const point: AnalyteResultPoint = {
      resultId: r.id,
      panelId: panel.id,
      panelName: panel.name,
      rawAnalyteName: r.analyteName,
      value: r.value,
      unit: r.unit,
      flag: r.flag,
      refLow: r.refLow,
      refHigh: r.refHigh,
      collectedOn: panel.collectedOn,
      sortDate,
      documentIds: docs.get(panel.id) ?? [],
    };

    let bucket = buckets.get(resolved.key);
    if (!bucket) {
      bucket = {
        key: resolved.key,
        analyteId: resolved.analyteId,
        displayName: resolved.displayName,
        points: [],
      };
      buckets.set(resolved.key, bucket);
    }
    bucket.points.push(point);
  }

  const summaries: AnalyteSummary[] = [];
  for (const bucket of buckets.values()) {
    const history = [...bucket.points].sort((a, b) => {
      if (a.sortDate === b.sortDate) return b.resultId.localeCompare(a.resultId);
      return a.sortDate < b.sortDate ? 1 : -1;
    });
    const latest = history[0]!;
    const numericSeries: AnalyteNumericPoint[] = [];
    for (const p of [...history].reverse()) {
      const n = parseNumericLabValue(p.value);
      if (n == null) continue;
      numericSeries.push({
        date: p.sortDate.slice(0, 10),
        value: n,
        panelId: p.panelId,
      });
    }

    summaries.push({
      key: bucket.key,
      analyteId: bucket.analyteId,
      displayName: bucket.displayName,
      aliases: bucket.analyteId ? (aliasMap.get(bucket.analyteId) ?? []) : [],
      latest,
      history,
      pointCount: history.length,
      numericSeries,
    });
  }

  summaries.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
  );
  return summaries;
}

export function getAnalyteSummaryByKey(key: string): AnalyteSummary | null {
  const k = key.trim();
  if (!k) return null;
  return listAnalyteSummaries().find((s) => s.key === k) ?? null;
}

/**
 * Lab spellings that appear on results and are not yet aliases of another analyte.
 * Includes auto-seeded catalog names (so users can confirm-merge them into a preferred name).
 * Excludes spellings that already resolve via an alias mapping.
 */
export function listUnmatchedLabNames(): Array<{
  spelling: string;
  count: number;
}> {
  bootstrapDb();
  listAnalytes();
  const results = getDb().select({ name: labResults.analyteName }).from(labResults).all();
  const counts = new Map<string, { spelling: string; count: number }>();

  for (const row of results) {
    const name = row.name?.trim();
    if (!name) continue;
    const resolved = resolveAnalyteName(name);
    // Already folded under another catalog name via alias — skip
    if (resolved.matchedAs === "alias") continue;
    // Canonical match only when spelling equals catalog name — still list so user can
    // merge e.g. CRP (its own catalog row) into “C-Reactive Protein”.
    // Skip only if this spelling is not worth mapping (empty).
    const lower = normalizeAnalyteLabel(name);
    const cur = counts.get(lower);
    if (cur) cur.count += 1;
    else counts.set(lower, { spelling: name, count: 1 });
  }

  // Prefer showing only spellings that are “secondary” candidates: either orphans
  // or short/abbreviation-like rows that share no preferred display. Keep all
  // non-alias spellings that appear; UI maps into a *different* catalog analyte.
  return [...counts.values()].sort((a, b) => a.spelling.localeCompare(b.spelling));
}

/** Options for pin/ad-hoc pickers: groups that have at least one result. */
export function listAnalyteSeriesOptions(): Array<{
  key: string;
  label: string;
  pointCount: number;
}> {
  return listAnalyteSummaries().map((s) => ({
    key: s.key,
    label: s.displayName,
    pointCount: s.pointCount,
  }));
}
