import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { myPlan, personaViews, personas } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import {
  createDraftViewSchema,
  updateDraftViewSchema,
  type CreateDraftViewInput,
  type UpdateDraftViewInput,
  type BriefCitation,
  type FactOpinion,
} from "@/lib/validation/brief";
import { detectTopicConflicts } from "@/lib/brief/conflicts";

export type AcceptedPersonaView = {
  id: string;
  personaId: string;
  personaName: string;
  personaSlug: string;
  version: number;
  title: string | null;
  bodyMd: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function stringifyJson(value: unknown | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseViewTopics(topicsJson: string | null | undefined): string[] {
  return parseJson<string[]>(topicsJson, []);
}

export function parseViewCitations(
  citationsJson: string | null | undefined,
): BriefCitation[] {
  return parseJson<BriefCitation[]>(citationsJson, []);
}

export function parseViewSections(
  sectionsJson: string | null | undefined,
): Record<string, string> | null {
  return parseJson<Record<string, string> | null>(sectionsJson, null);
}

export function parseFactOpinion(
  factOpinionJson: string | null | undefined,
): FactOpinion {
  return parseJson<FactOpinion>(factOpinionJson, { facts: [], opinions: [] });
}

function factOpinionJsonFromParts(
  facts?: string[],
  opinions?: string[],
): string | null {
  if (facts === undefined && opinions === undefined) return null;
  return JSON.stringify({
    facts: facts ?? [],
    opinions: opinions ?? [],
  });
}

export function getView(id: string) {
  bootstrapDb();
  return getDb().select().from(personaViews).where(eq(personaViews.id, id)).get();
}

export function listViewsForPersona(personaId: string) {
  bootstrapDb();
  return getDb()
    .select()
    .from(personaViews)
    .where(eq(personaViews.personaId, personaId))
    .orderBy(desc(personaViews.createdAt))
    .all();
}

export function getCurrentAcceptedView(personaId: string) {
  bootstrapDb();
  return getDb()
    .select()
    .from(personaViews)
    .where(
      and(
        eq(personaViews.personaId, personaId),
        eq(personaViews.status, "accepted"),
      ),
    )
    .get();
}

/**
 * Current accepted persona views (status=accepted only).
 * Draft / rejected / superseded are never returned.
 */
export function listCurrentAcceptedViews(
  opts?: { excludePersonaId?: string },
): AcceptedPersonaView[] {
  bootstrapDb();
  const rows = getDb()
    .select({
      id: personaViews.id,
      personaId: personaViews.personaId,
      personaName: personas.name,
      personaSlug: personas.slug,
      version: personaViews.version,
      title: personaViews.title,
      bodyMd: personaViews.bodyMd,
      acceptedAt: personaViews.acceptedAt,
      createdAt: personaViews.createdAt,
      updatedAt: personaViews.updatedAt,
    })
    .from(personaViews)
    .innerJoin(personas, eq(personaViews.personaId, personas.id))
    .where(eq(personaViews.status, "accepted"))
    .orderBy(desc(personaViews.acceptedAt), desc(personaViews.createdAt))
    .all();

  if (opts?.excludePersonaId) {
    return rows.filter((r) => r.personaId !== opts.excludePersonaId);
  }
  return rows;
}

function getDraftForPersona(personaId: string) {
  return getDb()
    .select()
    .from(personaViews)
    .where(
      and(
        eq(personaViews.personaId, personaId),
        eq(personaViews.status, "draft"),
      ),
    )
    .get();
}

export function createDraftView(input: CreateDraftViewInput) {
  bootstrapDb();
  const data = createDraftViewSchema.parse(input);

  const persona = getDb()
    .select()
    .from(personas)
    .where(eq(personas.id, data.personaId))
    .get();
  if (!persona) {
    throw new Error(`Persona not found: ${data.personaId}`);
  }

  const existingDraft = getDraftForPersona(data.personaId);
  if (existingDraft) {
    if (!data.replaceExistingDraft) {
      throw new Error(
        `Persona already has a draft view (${existingDraft.id}). Pass replaceExistingDraft to replace it.`,
      );
    }
    // Reject prior draft so only one draft remains
    getDb()
      .update(personaViews)
      .set({ status: "rejected", updatedAt: nowIso() })
      .where(eq(personaViews.id, existingDraft.id))
      .run();
  }

  const id = newId();
  const t = nowIso();

  getDb()
    .insert(personaViews)
    .values({
      id,
      personaId: data.personaId,
      status: "draft",
      version: 0,
      title: data.title?.trim() || null,
      bodyMd: data.bodyMd,
      sectionsJson: stringifyJson(data.sections),
      topicsJson: stringifyJson(data.topics),
      citationsJson: stringifyJson(data.citations),
      factOpinionJson: factOpinionJsonFromParts(data.facts, data.opinions),
      provider: data.provider,
      model: data.model,
      parentViewId: data.parentViewId ?? null,
      focusNote: data.focusNote?.trim() || null,
      createdAt: t,
      acceptedAt: null,
      updatedAt: t,
    })
    .run();

  return getView(id)!;
}

export function updateDraftView(id: string, input: UpdateDraftViewInput) {
  bootstrapDb();
  const data = updateDraftViewSchema.parse(input);
  const existing = getView(id);
  if (!existing) {
    throw new Error(`View not found: ${id}`);
  }
  if (existing.status !== "draft") {
    throw new Error(`Only draft views can be updated (status=${existing.status})`);
  }

  const patch: Partial<typeof personaViews.$inferInsert> = {
    updatedAt: nowIso(),
  };

  if (data.bodyMd !== undefined) patch.bodyMd = data.bodyMd;
  if (data.title !== undefined) {
    patch.title = data.title?.trim() || null;
  }
  if (data.sections !== undefined) {
    patch.sectionsJson = stringifyJson(data.sections);
  }
  if (data.topics !== undefined) {
    patch.topicsJson = stringifyJson(data.topics);
  }
  if (data.citations !== undefined) {
    patch.citationsJson = stringifyJson(data.citations);
  }
  if (data.facts !== undefined || data.opinions !== undefined) {
    const current = parseFactOpinion(existing.factOpinionJson);
    patch.factOpinionJson = JSON.stringify({
      facts: data.facts ?? current.facts,
      opinions: data.opinions ?? current.opinions,
    });
  }

  getDb().update(personaViews).set(patch).where(eq(personaViews.id, id)).run();
  return getView(id)!;
}

export function acceptView(id: string) {
  bootstrapDb();
  const existing = getView(id);
  if (!existing) {
    throw new Error(`View not found: ${id}`);
  }
  if (existing.status !== "draft") {
    throw new Error(`Only draft views can be accepted (status=${existing.status})`);
  }

  const prior = getCurrentAcceptedView(existing.personaId);
  const nextVersion = (prior?.version ?? 0) + 1;
  const t = nowIso();

  if (prior) {
    getDb()
      .update(personaViews)
      .set({ status: "superseded", updatedAt: t })
      .where(eq(personaViews.id, prior.id))
      .run();
  }

  getDb()
    .update(personaViews)
    .set({
      status: "accepted",
      version: nextVersion,
      acceptedAt: t,
      updatedAt: t,
    })
    .where(eq(personaViews.id, id))
    .run();

  return getView(id)!;
}

export function rejectView(id: string) {
  bootstrapDb();
  const existing = getView(id);
  if (!existing) {
    throw new Error(`View not found: ${id}`);
  }
  if (existing.status !== "draft") {
    throw new Error(`Only draft views can be rejected (status=${existing.status})`);
  }

  const t = nowIso();
  getDb()
    .update(personaViews)
    .set({ status: "rejected", updatedAt: t })
    .where(eq(personaViews.id, id))
    .run();

  return getView(id)!;
}

/** Accepted + superseded versions for a persona, ordered by version ascending. */
export function listVersionHistory(personaId: string) {
  bootstrapDb();
  return getDb()
    .select()
    .from(personaViews)
    .where(
      and(
        eq(personaViews.personaId, personaId),
        inArray(personaViews.status, ["accepted", "superseded"]),
      ),
    )
    .orderBy(asc(personaViews.version))
    .all();
}

export function getMyPlan() {
  bootstrapDb();
  return getDb().select().from(myPlan).where(eq(myPlan.id, "default")).get();
}

export function saveMyPlan(bodyMd: string) {
  bootstrapDb();
  const t = nowIso();
  getDb()
    .insert(myPlan)
    .values({
      id: "default",
      bodyMd: bodyMd ?? "",
      updatedAt: t,
    })
    .onConflictDoUpdate({
      target: myPlan.id,
      set: { bodyMd: bodyMd ?? "", updatedAt: t },
    })
    .run();
  return getMyPlan()!;
}

/**
 * Topic conflicts among current accepted views (loads topics from DB).
 */
export function listTopicConflicts() {
  bootstrapDb();
  const accepted = getDb()
    .select({
      personaId: personaViews.personaId,
      topicsJson: personaViews.topicsJson,
    })
    .from(personaViews)
    .where(eq(personaViews.status, "accepted"))
    .all();

  return detectTopicConflicts(
    accepted.map((v) => ({
      personaId: v.personaId,
      topics: parseViewTopics(v.topicsJson),
    })),
  );
}

// Re-export pure helpers for convenience
export { detectTopicConflicts } from "@/lib/brief/conflicts";
export { simpleLineDiff } from "@/lib/brief/diff";
