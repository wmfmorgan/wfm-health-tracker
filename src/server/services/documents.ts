import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { getDb, ensureDataDirs } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { documents, documentLinks, importJobs } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { EntityType } from "@/lib/validation/document";

const OPEN_IMPORT_STATUSES = [
  "pending",
  "awaiting_cloud_confirm",
  "extracting",
  "ready",
] as const;

export type { EntityType };

const MAX = () => Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);

export function savePdfDocument(opts: {
  originalFilename: string;
  buffer: Buffer;
  uploadedVia: "manual" | "ai_import";
  contentType?: string;
  title?: string;
  description?: string;
  notes?: string;
}) {
  bootstrapDb();
  const contentType = opts.contentType ?? "application/pdf";
  const isPdf =
    contentType === "application/pdf" ||
    opts.originalFilename.toLowerCase().endsWith(".pdf");
  if (!isPdf) throw new Error("Only PDF files are allowed");
  if (opts.buffer.byteLength > MAX()) throw new Error("File exceeds max upload size");

  const { uploadsDir } = ensureDataDirs();
  const id = newId();
  const checksum = crypto.createHash("sha256").update(opts.buffer).digest("hex");
  const storageName = `${id}.pdf`;
  const absPath = path.join(uploadsDir, storageName);

  try {
    fs.writeFileSync(absPath, opts.buffer);

    const createdAt = nowIso();
    getDb()
      .insert(documents)
      .values({
        id,
        originalFilename: opts.originalFilename,
        contentType: "application/pdf",
        storagePath: storageName,
        byteSize: opts.buffer.byteLength,
        checksum,
        title: opts.title ?? null,
        description: opts.description ?? null,
        uploadedVia: opts.uploadedVia,
        notes: opts.notes ?? null,
        createdAt,
      })
      .run();
  } catch (err) {
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    throw err;
  }

  return getDb().select().from(documents).where(eq(documents.id, id)).get()!;
}

export function linkDocument(documentId: string, entityType: EntityType, entityId: string) {
  bootstrapDb();
  getDb()
    .insert(documentLinks)
    .values({ documentId, entityType, entityId, createdAt: nowIso() })
    .onConflictDoNothing()
    .run();
}

export function unlinkDocument(documentId: string, entityType: EntityType, entityId: string) {
  bootstrapDb();
  getDb()
    .delete(documentLinks)
    .where(
      and(
        eq(documentLinks.documentId, documentId),
        eq(documentLinks.entityType, entityType),
        eq(documentLinks.entityId, entityId),
      ),
    )
    .run();
}

export function listDocumentsForEntity(entityType: EntityType, entityId: string) {
  bootstrapDb();
  const db = getDb();
  const links = db
    .select()
    .from(documentLinks)
    .where(and(eq(documentLinks.entityType, entityType), eq(documentLinks.entityId, entityId)))
    .all();
  return links
    .map((l) => db.select().from(documents).where(eq(documents.id, l.documentId)).get())
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
}

export function listAllDocuments() {
  bootstrapDb();
  return getDb().select().from(documents).orderBy(desc(documents.createdAt)).all();
}

export function listLinksForDocument(documentId: string) {
  bootstrapDb();
  return getDb()
    .select()
    .from(documentLinks)
    .where(eq(documentLinks.documentId, documentId))
    .all();
}

export function listAllDocumentLinks() {
  bootstrapDb();
  return getDb().select().from(documentLinks).all();
}

export function getDocumentFilePath(id: string): string | null {
  bootstrapDb();
  const doc = getDb().select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return null;
  const { uploadsDir } = ensureDataDirs();
  return path.join(uploadsDir, doc.storagePath);
}

export function deleteDocument(id: string) {
  bootstrapDb();
  const jobs = getDb()
    .select()
    .from(importJobs)
    .where(eq(importJobs.documentId, id))
    .all();

  const hasOpen = jobs.some((j) =>
    (OPEN_IMPORT_STATUSES as readonly string[]).includes(j.status),
  );
  if (hasOpen) {
    throw new Error(
      "Cannot delete document while an open AI import references it. Complete or discard the import first.",
    );
  }

  // Terminal jobs still hold FK on document_id (no ON DELETE CASCADE).
  // Remove them first so document delete can proceed (drafts cascade from jobs).
  if (jobs.length > 0) {
    getDb().delete(importJobs).where(eq(importJobs.documentId, id)).run();
  }

  const fp = getDocumentFilePath(id);
  getDb().delete(documents).where(eq(documents.id, id)).run();
  if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
}

/** Remove all links for an entity; keep document files in the library. */
export function unlinkAllForEntity(entityType: EntityType, entityId: string) {
  bootstrapDb();
  getDb()
    .delete(documentLinks)
    .where(and(eq(documentLinks.entityType, entityType), eq(documentLinks.entityId, entityId)))
    .run();
}
