import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { useFreshDb } from "../helpers/test-db";
import { createDiagnosis } from "@/server/services/diagnoses";
import {
  savePdfDocument,
  linkDocument,
  listDocumentsForEntity,
  listAllDocuments,
  unlinkDocument,
  deleteDocument,
  getDocumentFilePath,
} from "@/server/services/documents";

useFreshDb();

function fakePdf(): Buffer {
  // Minimal PDF header is enough for storage tests
  return Buffer.from("%PDF-1.4 fake content for tests");
}

describe("documents", () => {
  it("stores pdf and links to entity", () => {
    const d = createDiagnosis({ name: "UC", status: "chronic" });
    const doc = savePdfDocument({
      originalFilename: "colonoscopy.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    const linked = listDocumentsForEntity("diagnosis", d.id);
    expect(linked).toHaveLength(1);
    expect(linked[0].originalFilename).toBe("colonoscopy.pdf");
    const fp = getDocumentFilePath(doc.id);
    expect(fs.existsSync(fp!)).toBe(true);
  });

  it("rejects non-pdf content type path via save requiring pdf name/type", () => {
    expect(() =>
      savePdfDocument({
        originalFilename: "note.txt",
        buffer: Buffer.from("hi"),
        uploadedVia: "manual",
        contentType: "text/plain",
      }),
    ).toThrow(/pdf/i);
  });

  it("delete document removes file and links", () => {
    const d = createDiagnosis({ name: "X", status: "active" });
    const doc = savePdfDocument({
      originalFilename: "a.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    const fp = getDocumentFilePath(doc.id)!;
    deleteDocument(doc.id);
    expect(fs.existsSync(fp)).toBe(false);
    expect(listDocumentsForEntity("diagnosis", d.id)).toHaveLength(0);
  });

  it("unlink keeps file; entity delete does not delete document", () => {
    const d = createDiagnosis({ name: "Y", status: "active" });
    const doc = savePdfDocument({
      originalFilename: "b.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    unlinkDocument(doc.id, "diagnosis", d.id);
    expect(listAllDocuments().some((x) => x.id === doc.id)).toBe(true);
  });
});
