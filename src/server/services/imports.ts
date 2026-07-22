import { eq, desc, asc } from "drizzle-orm";
import { getDb, getSqlite } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import {
  importJobs,
  draftLabPanels,
  draftLabResults,
  documents,
} from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import {
  importProviderSchema,
  importJobStatusSchema,
  extractedLabsSchema,
  type ExtractedLabs,
  type ImportJobStatus,
  type ImportProvider,
} from "@/lib/validation/import";
import {
  labPanelSchema,
  labResultSchema,
  type LabResultInput,
} from "@/lib/validation/lab";
import { createLabPanel } from "@/server/services/labs";
import { linkDocument } from "@/server/services/documents";

const OPEN_STATUSES = [
  "pending",
  "awaiting_cloud_confirm",
  "extracting",
  "ready",
] as const satisfies readonly ImportJobStatus[];

export type ImportJobRow = typeof importJobs.$inferSelect;
export type DraftLabPanelRow = typeof draftLabPanels.$inferSelect;
export type DraftLabResultRow = typeof draftLabResults.$inferSelect;

export type DraftPanelWithResults = DraftLabPanelRow & {
  results: DraftLabResultRow[];
};

export type ImportJobWithDrafts = ImportJobRow & {
  drafts: DraftPanelWithResults[];
};

export function createImportJob(opts: {
  documentId: string;
  provider: ImportProvider;
  model: string;
}): ImportJobRow {
  bootstrapDb();
  const provider = importProviderSchema.parse(opts.provider);
  const model = opts.model.trim();
  if (!model) throw new Error("Model is required");

  const doc = getDb()
    .select()
    .from(documents)
    .where(eq(documents.id, opts.documentId))
    .get();
  if (!doc) throw new Error(`Document not found: ${opts.documentId}`);

  const id = newId();
  const t = nowIso();
  getDb()
    .insert(importJobs)
    .values({
      id,
      documentId: opts.documentId,
      status: "pending",
      provider,
      model,
      errorMessage: null,
      extractedCharCount: null,
      cloudConfirmedAt: null,
      createdAt: t,
      updatedAt: t,
    })
    .run();

  return getDb().select().from(importJobs).where(eq(importJobs.id, id)).get()!;
}

export function getImportJob(id: string): ImportJobWithDrafts | undefined {
  bootstrapDb();
  const job = getDb().select().from(importJobs).where(eq(importJobs.id, id)).get();
  if (!job) return undefined;

  const panels = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.importJobId, id))
    .orderBy(asc(draftLabPanels.sortOrder), asc(draftLabPanels.createdAt))
    .all();

  const drafts: DraftPanelWithResults[] = panels.map((panel) => {
    const results = getDb()
      .select()
      .from(draftLabResults)
      .where(eq(draftLabResults.draftPanelId, panel.id))
      .orderBy(asc(draftLabResults.sortOrder), asc(draftLabResults.createdAt))
      .all();
    return { ...panel, results };
  });

  return { ...job, drafts };
}

export function listImportJobs(): Array<ImportJobRow & { filename?: string }> {
  bootstrapDb();
  const rows = getDb()
    .select({
      job: importJobs,
      filename: documents.originalFilename,
    })
    .from(importJobs)
    .leftJoin(documents, eq(importJobs.documentId, documents.id))
    .orderBy(desc(importJobs.createdAt))
    .all();

  return rows.map((r) => ({
    ...r.job,
    filename: r.filename ?? undefined,
  }));
}

export function setJobStatus(
  id: string,
  status: ImportJobStatus,
  patch?: {
    errorMessage?: string | null;
    extractedCharCount?: number | null;
    cloudConfirmedAt?: string | null;
  },
): ImportJobRow {
  bootstrapDb();
  const parsed = importJobStatusSchema.parse(status);
  const existing = getDb().select().from(importJobs).where(eq(importJobs.id, id)).get();
  if (!existing) throw new Error(`Import job not found: ${id}`);

  const t = nowIso();
  getDb()
    .update(importJobs)
    .set({
      status: parsed,
      ...(patch && "errorMessage" in patch ? { errorMessage: patch.errorMessage ?? null } : {}),
      ...(patch && "extractedCharCount" in patch
        ? { extractedCharCount: patch.extractedCharCount ?? null }
        : {}),
      ...(patch && "cloudConfirmedAt" in patch
        ? { cloudConfirmedAt: patch.cloudConfirmedAt ?? null }
        : {}),
      updatedAt: t,
    })
    .where(eq(importJobs.id, id))
    .run();

  return getDb().select().from(importJobs).where(eq(importJobs.id, id)).get()!;
}

export function writeDraftsFromExtracted(jobId: string, extracted: ExtractedLabs): void {
  bootstrapDb();
  const job = getDb().select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) throw new Error(`Import job not found: ${jobId}`);

  const data = extractedLabsSchema.parse(extracted);
  const t = nowIso();
  const db = getDb();

  const tx = getSqlite().transaction(() => {
    // Replace any existing drafts for this job (cascade deletes results)
    db.delete(draftLabPanels).where(eq(draftLabPanels.importJobId, jobId)).run();

    data.panels.forEach((panel, panelIndex) => {
      const panelId = newId();
      db.insert(draftLabPanels)
        .values({
          id: panelId,
          importJobId: jobId,
          sortOrder: panelIndex,
          name: panel.name,
          collectedOn: panel.collectedOn ?? null,
          facility: panel.facility ?? null,
          status: panel.status ?? "final",
          notes: panel.notes ?? null,
          reviewStatus: "pending",
          committedEntityId: null,
          createdAt: t,
          updatedAt: t,
        })
        .run();

      panel.results.forEach((r, resultIndex) => {
        db.insert(draftLabResults)
          .values({
            id: newId(),
            draftPanelId: panelId,
            sortOrder: resultIndex,
            analyteName: r.analyteName,
            value: r.value ?? null,
            unit: r.unit ?? null,
            refLow: r.refLow ?? null,
            refHigh: r.refHigh ?? null,
            flag: r.flag ?? null,
            notes: r.notes ?? null,
            createdAt: t,
            updatedAt: t,
          })
          .run();
      });
    });

    db.update(importJobs)
      .set({ updatedAt: t })
      .where(eq(importJobs.id, jobId))
      .run();
  });
  tx();
}

export function updateDraftPanel(
  draftPanelId: string,
  panelFields: {
    name: string;
    collectedOn?: string | null;
    facility?: string | null;
    status?: "pending" | "final";
    notes?: string | null;
  },
  results: LabResultInput[],
): void {
  bootstrapDb();
  const draft = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.id, draftPanelId))
    .get();
  if (!draft) throw new Error(`Draft panel not found: ${draftPanelId}`);
  if (draft.reviewStatus !== "pending") {
    throw new Error(`Cannot update draft panel in status: ${draft.reviewStatus}`);
  }

  const panel = labPanelSchema.parse({
    name: panelFields.name,
    collectedOn: panelFields.collectedOn,
    facility: panelFields.facility,
    status: panelFields.status ?? "final",
    notes: panelFields.notes,
  });
  const parsedResults = results.map((r) => labResultSchema.parse(r));

  const t = nowIso();
  const db = getDb();

  const tx = getSqlite().transaction(() => {
    db.update(draftLabPanels)
      .set({
        name: panel.name,
        collectedOn: panel.collectedOn || null,
        facility: panel.facility || null,
        status: panel.status ?? "final",
        notes: panel.notes || null,
        updatedAt: t,
      })
      .where(eq(draftLabPanels.id, draftPanelId))
      .run();

    db.delete(draftLabResults).where(eq(draftLabResults.draftPanelId, draftPanelId)).run();

    parsedResults.forEach((r, index) => {
      db.insert(draftLabResults)
        .values({
          id: newId(),
          draftPanelId,
          sortOrder: index,
          analyteName: r.analyteName,
          value: r.value ?? null,
          unit: r.unit ?? null,
          refLow: r.refLow ?? null,
          refHigh: r.refHigh ?? null,
          flag: r.flag ?? null,
          notes: r.notes ?? null,
          createdAt: t,
          updatedAt: t,
        })
        .run();
    });
  });
  tx();
}

export function acceptDraftPanel(draftPanelId: string): { labPanelId: string } {
  bootstrapDb();
  const draft = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.id, draftPanelId))
    .get();
  if (!draft) throw new Error(`Draft panel not found: ${draftPanelId}`);
  if (draft.reviewStatus !== "pending") {
    throw new Error(`Draft panel is already ${draft.reviewStatus}`);
  }

  const job = getDb()
    .select()
    .from(importJobs)
    .where(eq(importJobs.id, draft.importJobId))
    .get();
  if (!job) throw new Error(`Import job not found: ${draft.importJobId}`);

  const resultRows = getDb()
    .select()
    .from(draftLabResults)
    .where(eq(draftLabResults.draftPanelId, draftPanelId))
    .orderBy(asc(draftLabResults.sortOrder), asc(draftLabResults.createdAt))
    .all();

  const panelInput = labPanelSchema.parse({
    name: draft.name,
    collectedOn: draft.collectedOn,
    facility: draft.facility,
    status: draft.status === "pending" ? "pending" : "final",
    notes: draft.notes,
    source: "pdf_import",
  });
  const results = resultRows.map((r) =>
    labResultSchema.parse({
      analyteName: r.analyteName,
      value: r.value,
      unit: r.unit,
      refLow: r.refLow,
      refHigh: r.refHigh,
      flag: r.flag,
      notes: r.notes,
    }),
  );

  const live = createLabPanel(panelInput, results);
  linkDocument(job.documentId, "lab_panel", live.id);

  const t = nowIso();
  getDb()
    .update(draftLabPanels)
    .set({
      reviewStatus: "accepted",
      committedEntityId: live.id,
      updatedAt: t,
    })
    .where(eq(draftLabPanels.id, draftPanelId))
    .run();

  recomputeJobCompletion(job.id);
  return { labPanelId: live.id };
}

export function rejectDraftPanel(draftPanelId: string): void {
  bootstrapDb();
  const draft = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.id, draftPanelId))
    .get();
  if (!draft) throw new Error(`Draft panel not found: ${draftPanelId}`);
  if (draft.reviewStatus !== "pending") {
    throw new Error(`Draft panel is already ${draft.reviewStatus}`);
  }

  const t = nowIso();
  getDb()
    .update(draftLabPanels)
    .set({
      reviewStatus: "rejected",
      updatedAt: t,
    })
    .where(eq(draftLabPanels.id, draftPanelId))
    .run();

  recomputeJobCompletion(draft.importJobId);
}

export function acceptAllPending(jobId: string): void {
  bootstrapDb();
  const job = getDb().select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) throw new Error(`Import job not found: ${jobId}`);

  const pending = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.importJobId, jobId))
    .orderBy(asc(draftLabPanels.sortOrder), asc(draftLabPanels.createdAt))
    .all()
    .filter((p) => p.reviewStatus === "pending");

  for (const panel of pending) {
    acceptDraftPanel(panel.id);
  }
}

export function discardImportJob(jobId: string): void {
  bootstrapDb();
  const job = getDb().select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) throw new Error(`Import job not found: ${jobId}`);

  const t = nowIso();
  const db = getDb();

  const tx = getSqlite().transaction(() => {
    const pending = db
      .select()
      .from(draftLabPanels)
      .where(eq(draftLabPanels.importJobId, jobId))
      .all()
      .filter((p) => p.reviewStatus === "pending");

    for (const panel of pending) {
      db.update(draftLabPanels)
        .set({
          reviewStatus: "rejected",
          updatedAt: t,
        })
        .where(eq(draftLabPanels.id, panel.id))
        .run();
    }

    db.update(importJobs)
      .set({
        status: "discarded",
        updatedAt: t,
      })
      .where(eq(importJobs.id, jobId))
      .run();
  });
  tx();
}

export function hasOpenImportJobForDocument(documentId: string): boolean {
  bootstrapDb();
  const rows = getDb()
    .select()
    .from(importJobs)
    .where(eq(importJobs.documentId, documentId))
    .all();
  return rows.some((j) => (OPEN_STATUSES as readonly string[]).includes(j.status));
}

export function recomputeJobCompletion(jobId: string): void {
  bootstrapDb();
  const job = getDb().select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) return;
  // Only auto-complete from ready (not discarded/failed/etc.)
  if (job.status !== "ready") return;

  const pending = getDb()
    .select()
    .from(draftLabPanels)
    .where(eq(draftLabPanels.importJobId, jobId))
    .all()
    .filter((p) => p.reviewStatus === "pending");

  if (pending.length === 0) {
    getDb()
      .update(importJobs)
      .set({
        status: "completed",
        updatedAt: nowIso(),
      })
      .where(eq(importJobs.id, jobId))
      .run();
  }
}

