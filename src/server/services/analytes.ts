import { eq, asc, like } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import {
  analytes,
  analyteAliases,
  analyteAliasRejections,
  labResults,
  labPanels,
  appSettings,
} from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { AnalyteInput } from "@/lib/validation/analyte";
import { COMMON_ANALYTES } from "@/server/services/common-analytes";
import {
  suggestTargetsForSpelling,
  type AliasSuggestReason,
} from "@/lib/analyte-alias-suggest";

export type AnalyteAliasRow = typeof analyteAliases.$inferSelect;

/** One real lab result used as an illustration in alias flags. */
export type AnalyteAliasExample = {
  rawName: string;
  value: string | null;
  unit: string | null;
  collectedOn: string | null;
  panelName: string;
  panelId: string;
};

export type AnalyteAliasFlag = {
  spelling: string;
  spellingKey: string;
  resultCount: number;
  targetAnalyteId: string;
  targetName: string;
  reason: AliasSuggestReason;
  score: number;
  detail: string;
  /** One sample row for the flagged spelling */
  spellingExample: AnalyteAliasExample | null;
  /** One sample row for the suggested catalog target */
  targetExample: AnalyteAliasExample | null;
};

export function normalizeAnalyteLabel(name: string): string {
  return name.trim().toLowerCase();
}

const COMMON_SEED_KEY = "common_analytes_seeded_v1";

/** Seed built-in common analytes (idempotent; safe to call often). */
export function seedCommonAnalytes() {
  bootstrapDb();
  const db = getDb();
  const flag = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, COMMON_SEED_KEY))
    .get();
  if (flag?.value === "1") return;

  const existing = new Set(
    db
      .select({ name: analytes.name })
      .from(analytes)
      .all()
      .map((r) => r.name.toLowerCase()),
  );
  const t = nowIso();
  for (const row of COMMON_ANALYTES) {
    const key = row.name.toLowerCase();
    if (existing.has(key)) {
      // Fill missing default unit on existing match
      const current = db
        .select()
        .from(analytes)
        .all()
        .find((a) => a.name.toLowerCase() === key);
      if (current && !current.defaultUnit && row.defaultUnit) {
        db.update(analytes)
          .set({
            defaultUnit: row.defaultUnit,
            notes: current.notes ?? row.notes ?? null,
            updatedAt: t,
          })
          .where(eq(analytes.id, current.id))
          .run();
      }
      continue;
    }
    db.insert(analytes)
      .values({
        id: newId(),
        name: row.name,
        defaultUnit: row.defaultUnit,
        notes: row.notes ?? null,
        createdAt: t,
        updatedAt: t,
      })
      .run();
    existing.add(key);
  }

  if (flag) {
    db.update(appSettings)
      .set({ value: "1" })
      .where(eq(appSettings.key, COMMON_SEED_KEY))
      .run();
  } else {
    db.insert(appSettings).values({ key: COMMON_SEED_KEY, value: "1" }).run();
  }
}

/** Import distinct names from existing lab_results into the master list (idempotent). */
export function seedAnalytesFromLabResults() {
  bootstrapDb();
  const db = getDb();
  const existing = new Set(
    db
      .select({ name: analytes.name })
      .from(analytes)
      .all()
      .map((r) => r.name.toLowerCase()),
  );
  // Confirmed aliases must not be re-seeded as separate catalog rows
  const aliasKeys = new Set(
    db
      .select({ alias: analyteAliases.alias })
      .from(analyteAliases)
      .all()
      .map((r) => r.alias.toLowerCase()),
  );
  const fromResults = db.select({ name: labResults.analyteName }).from(labResults).all();
  const t = nowIso();
  for (const row of fromResults) {
    const name = row.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existing.has(key) || aliasKeys.has(key)) continue;
    db.insert(analytes)
      .values({
        id: newId(),
        name,
        defaultUnit: null,
        notes: null,
        createdAt: t,
        updatedAt: t,
      })
      .run();
    existing.add(key);
  }
}

export function listAnalytes(filter?: { q?: string }) {
  bootstrapDb();
  seedCommonAnalytes();
  seedAnalytesFromLabResults();
  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    return getDb()
      .select()
      .from(analytes)
      .where(like(analytes.name, pattern))
      .orderBy(asc(analytes.name))
      .all();
  }
  return getDb().select().from(analytes).orderBy(asc(analytes.name)).all();
}

export function getAnalyte(id: string) {
  bootstrapDb();
  return getDb().select().from(analytes).where(eq(analytes.id, id)).get();
}

export function getAnalyteByName(name: string) {
  bootstrapDb();
  const trimmed = name.trim();
  return getDb()
    .select()
    .from(analytes)
    .all()
    .find((a) => a.name.toLowerCase() === trimmed.toLowerCase());
}

export function createAnalyte(input: AnalyteInput) {
  bootstrapDb();
  const name = input.name.trim();
  const existing = getAnalyteByName(name);
  if (existing) {
    if (input.defaultUnit && !existing.defaultUnit) {
      getDb()
        .update(analytes)
        .set({ defaultUnit: input.defaultUnit, updatedAt: nowIso() })
        .where(eq(analytes.id, existing.id))
        .run();
      return getAnalyte(existing.id)!;
    }
    return existing;
  }
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(analytes)
    .values({
      id,
      name,
      defaultUnit: emptyToNull(input.defaultUnit),
      notes: emptyToNull(input.notes),
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getAnalyte(id)!;
}

/** Ensure analyte exists when saving lab results; optionally set default unit. */
export function ensureAnalyte(name: string, unit?: string | null) {
  return createAnalyte({
    name,
    defaultUnit: unit ?? null,
    notes: null,
  });
}

export function updateAnalyte(id: string, input: AnalyteInput) {
  bootstrapDb();
  getDb()
    .update(analytes)
    .set({
      name: input.name.trim(),
      defaultUnit: emptyToNull(input.defaultUnit),
      notes: emptyToNull(input.notes),
      updatedAt: nowIso(),
    })
    .where(eq(analytes.id, id))
    .run();
  return getAnalyte(id)!;
}

export function deleteAnalyte(id: string) {
  bootstrapDb();
  getDb().delete(analytes).where(eq(analytes.id, id)).run();
}

export function listAliasesForAnalyte(analyteId: string): AnalyteAliasRow[] {
  bootstrapDb();
  return getDb()
    .select()
    .from(analyteAliases)
    .where(eq(analyteAliases.analyteId, analyteId))
    .orderBy(asc(analyteAliases.alias))
    .all();
}

export function listAllAliases(): AnalyteAliasRow[] {
  bootstrapDb();
  return getDb().select().from(analyteAliases).orderBy(asc(analyteAliases.alias)).all();
}

/**
 * Resolve a raw lab spelling to a catalog analyte (confirmed alias or canonical name).
 * Aliases win over a same-named catalog row so merges stay stable after seed.
 * Does not auto-create aliases.
 */
export function resolveAnalyteName(rawName: string): {
  key: string;
  displayName: string;
  analyteId: string | null;
  matchedAs: "canonical" | "alias" | "orphan";
} {
  bootstrapDb();
  const trimmed = rawName.trim();
  if (!trimmed) {
    return {
      key: "",
      displayName: "",
      analyteId: null,
      matchedAs: "orphan",
    };
  }
  const lower = normalizeAnalyteLabel(trimmed);

  // Prefer confirmed aliases so merges are not undone by re-seeded catalog names
  const aliasRow = getDb()
    .select()
    .from(analyteAliases)
    .all()
    .find((a) => normalizeAnalyteLabel(a.alias) === lower);
  if (aliasRow) {
    const parent = getAnalyte(aliasRow.analyteId);
    if (parent) {
      return {
        key: parent.id,
        displayName: parent.name,
        analyteId: parent.id,
        matchedAs: "alias",
      };
    }
  }

  const byName = getDb()
    .select()
    .from(analytes)
    .all()
    .find((a) => normalizeAnalyteLabel(a.name) === lower);
  if (byName) {
    return {
      key: byName.id,
      displayName: byName.name,
      analyteId: byName.id,
      matchedAs: "canonical",
    };
  }

  return {
    key: `orphan:${lower}`,
    displayName: trimmed,
    analyteId: null,
    matchedAs: "orphan",
  };
}

/**
 * User-confirmed alias. If the spelling is already a separate catalog row
 * (common after auto-seed from lab results), that row is removed and its
 * aliases re-parented so results merge under the target.
 */
export function addAnalyteAlias(analyteId: string, aliasRaw: string): AnalyteAliasRow {
  bootstrapDb();
  const parent = getAnalyte(analyteId);
  if (!parent) throw new Error("Analyte not found");

  const alias = aliasRaw.trim();
  if (!alias) throw new Error("Alias is required");
  const lower = normalizeAnalyteLabel(alias);

  if (normalizeAnalyteLabel(parent.name) === lower) {
    throw new Error("That spelling is already the catalog name for this analyte");
  }

  const existingAlias = getDb()
    .select()
    .from(analyteAliases)
    .all()
    .find((a) => normalizeAnalyteLabel(a.alias) === lower);
  if (existingAlias) {
    if (existingAlias.analyteId === analyteId) {
      return existingAlias;
    }
    const other = getAnalyte(existingAlias.analyteId);
    throw new Error(
      `“${alias}” is already an alias of “${other?.name ?? "another analyte"}”`,
    );
  }

  // Seeded catalog row with this exact name → fold into target (confirmed merge).
  const nameClash = getDb()
    .select()
    .from(analytes)
    .all()
    .find((a) => normalizeAnalyteLabel(a.name) === lower && a.id !== analyteId);
  if (nameClash) {
    const clashAliases = listAliasesForAnalyte(nameClash.id);
    for (const al of clashAliases) {
      // Re-parent under target if free; otherwise drop duplicate
      const taken = getDb()
        .select()
        .from(analyteAliases)
        .all()
        .find(
          (x) =>
            normalizeAnalyteLabel(x.alias) === normalizeAnalyteLabel(al.alias) &&
            x.analyteId === analyteId,
        );
      if (!taken && normalizeAnalyteLabel(al.alias) !== normalizeAnalyteLabel(parent.name)) {
        getDb()
          .update(analyteAliases)
          .set({ analyteId })
          .where(eq(analyteAliases.id, al.id))
          .run();
      }
    }
    getDb().delete(analytes).where(eq(analytes.id, nameClash.id)).run();
  }

  const id = newId();
  const t = nowIso();
  getDb()
    .insert(analyteAliases)
    .values({
      id,
      analyteId,
      alias,
      createdAt: t,
    })
    .run();

  // Accepted merge clears any open flags for this spelling
  clearAliasRejectionsForSpelling(lower);

  return getDb().select().from(analyteAliases).where(eq(analyteAliases.id, id)).get()!;
}

export function deleteAnalyteAlias(aliasId: string): void {
  bootstrapDb();
  getDb().delete(analyteAliases).where(eq(analyteAliases.id, aliasId)).run();
}

function clearAliasRejectionsForSpelling(spellingKey: string): void {
  getDb()
    .delete(analyteAliasRejections)
    .where(eq(analyteAliasRejections.spellingKey, spellingKey))
    .run();
}

export function rejectAliasSuggestion(spelling: string, targetAnalyteId: string): void {
  bootstrapDb();
  const parent = getAnalyte(targetAnalyteId);
  if (!parent) throw new Error("Target analyte not found");
  const trimmed = spelling.trim();
  if (!trimmed) throw new Error("Spelling is required");
  const key = normalizeAnalyteLabel(trimmed);

  const existing = getDb()
    .select()
    .from(analyteAliasRejections)
    .all()
    .find(
      (r) => r.spellingKey === key && r.targetAnalyteId === targetAnalyteId,
    );
  if (existing) return;

  getDb()
    .insert(analyteAliasRejections)
    .values({
      id: newId(),
      spellingKey: key,
      spelling: trimmed,
      targetAnalyteId,
      createdAt: nowIso(),
    })
    .run();
}

type ResultWithPanel = {
  rawName: string;
  value: string | null;
  unit: string | null;
  panelId: string;
  panelName: string;
  collectedOn: string | null;
  sortDate: string;
};

function loadResultsWithPanels(): ResultWithPanel[] {
  const panels = getDb().select().from(labPanels).all();
  const panelById = new Map(panels.map((p) => [p.id, p]));
  const results = getDb().select().from(labResults).all();
  const out: ResultWithPanel[] = [];
  for (const r of results) {
    const panel = panelById.get(r.panelId);
    if (!panel) continue;
    const name = r.analyteName?.trim();
    if (!name) continue;
    out.push({
      rawName: name,
      value: r.value,
      unit: r.unit,
      panelId: panel.id,
      panelName: panel.name,
      collectedOn: panel.collectedOn,
      sortDate: panel.collectedOn?.trim() || panel.createdAt,
    });
  }
  // Newest first so examples prefer recent draws
  out.sort((a, b) => (a.sortDate < b.sortDate ? 1 : a.sortDate > b.sortDate ? -1 : 0));
  return out;
}

function toExample(row: ResultWithPanel): AnalyteAliasExample {
  return {
    rawName: row.rawName,
    value: row.value,
    unit: row.unit,
    collectedOn: row.collectedOn,
    panelName: row.panelName,
    panelId: row.panelId,
  };
}

/**
 * Potential alias flags: lab spellings that look like other catalog analytes.
 * Excludes confirmed aliases and user-rejected pairs. Never auto-applied.
 * Each flag includes one sample result for the spelling and one for the target.
 */
export function listAnalyteAliasFlags(): AnalyteAliasFlag[] {
  bootstrapDb();
  listAnalytes();

  const catalog = getDb().select().from(analytes).orderBy(asc(analytes.name)).all();
  const catalogByLower = new Map(
    catalog.map((a) => [normalizeAnalyteLabel(a.name), a] as const),
  );
  const rejections = new Set(
    getDb()
      .select()
      .from(analyteAliasRejections)
      .all()
      .map((r) => `${r.spellingKey}→${r.targetAnalyteId}`),
  );

  const allRows = loadResultsWithPanels();

  // Result spellings that are not already alias-resolved to something else
  const resultCounts = new Map<
    string,
    { spelling: string; count: number; example: ResultWithPanel | null }
  >();
  // First example per catalog target id (from rows that resolve to that target)
  const targetExamples = new Map<string, ResultWithPanel>();

  for (const row of allRows) {
    const resolved = resolveAnalyteName(row.rawName);
    if (resolved.matchedAs === "alias") continue;

    const key = normalizeAnalyteLabel(row.rawName);
    const cur = resultCounts.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      resultCounts.set(key, { spelling: row.rawName, count: 1, example: row });
    }

    if (resolved.analyteId && !targetExamples.has(resolved.analyteId)) {
      targetExamples.set(resolved.analyteId, row);
    }
  }

  // Also capture examples that match catalog name via alias-free rows only above;
  // for targets with no results yet, targetExample stays null.

  const catalogNames = catalog.map((a) => a.name);
  const flags: AnalyteAliasFlag[] = [];

  for (const { spelling, count, example } of resultCounts.values()) {
    const suggestions = suggestTargetsForSpelling(spelling, catalogNames, { max: 2 });
    for (const sug of suggestions) {
      const target = catalogByLower.get(normalizeAnalyteLabel(sug.targetName));
      if (!target) continue;
      // Don't flag a name against itself as series
      if (normalizeAnalyteLabel(spelling) === normalizeAnalyteLabel(target.name)) continue;
      const rejectKey = `${normalizeAnalyteLabel(spelling)}→${target.id}`;
      if (rejections.has(rejectKey)) continue;

      // Prefer a target example that uses the catalog name (or any row resolved to target)
      let targetExampleRow = targetExamples.get(target.id) ?? null;
      if (!targetExampleRow) {
        targetExampleRow =
          allRows.find(
            (r) => normalizeAnalyteLabel(r.rawName) === normalizeAnalyteLabel(target.name),
          ) ?? null;
      }
      // Don't use the spelling's own row as the "target" example
      if (
        targetExampleRow &&
        normalizeAnalyteLabel(targetExampleRow.rawName) === normalizeAnalyteLabel(spelling)
      ) {
        targetExampleRow =
          allRows.find(
            (r) =>
              normalizeAnalyteLabel(r.rawName) === normalizeAnalyteLabel(target.name) &&
              normalizeAnalyteLabel(r.rawName) !== normalizeAnalyteLabel(spelling),
          ) ?? null;
      }

      flags.push({
        spelling,
        spellingKey: normalizeAnalyteLabel(spelling),
        resultCount: count,
        targetAnalyteId: target.id,
        targetName: target.name,
        reason: sug.reason,
        score: sug.score,
        detail: sug.detail,
        spellingExample: example ? toExample(example) : null,
        targetExample: targetExampleRow ? toExample(targetExampleRow) : null,
      });
    }
  }

  flags.sort((a, b) => b.score - a.score || a.spelling.localeCompare(b.spelling));
  return flags;
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}
