"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntityType } from "@/lib/validation/document";
import {
  unlinkDocumentAction,
  deleteDocumentAction,
} from "@/server/actions/documents";
import { Button } from "@/components/ui/button";

export type AttachmentDocument = {
  id: string;
  originalFilename: string;
  byteSize: number;
  contentType: string;
  createdAt: string;
  uploadedVia: string;
  title?: string | null;
};

type AttachmentsPanelProps = {
  entityType: EntityType;
  entityId: string;
  initialDocuments: AttachmentDocument[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  entityType,
  entityId,
  initialDocuments,
}: AttachmentsPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState(initialDocuments);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("entityType", entityType);
      form.set("entityId", entityId);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        document?: AttachmentDocument;
      };
      if (!res.ok || !data.document) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setDocs((prev) => [data.document!, ...prev]);
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onUnlink(documentId: string) {
    if (!confirm("Unlink this document from this record? The file will remain in the library.")) {
      return;
    }
    startTransition(async () => {
      await unlinkDocumentAction(documentId, entityType, entityId);
      setDocs((prev) => prev.filter((d) => d.id !== documentId));
      router.refresh();
    });
  }

  function onDelete(documentId: string) {
    if (!confirm("Permanently delete this PDF? This cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await deleteDocumentAction(documentId);
      setDocs((prev) => prev.filter((d) => d.id !== documentId));
      router.refresh();
    });
  }

  return (
    <section className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-700">Attachments</h2>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={uploading || pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading || pending}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {docs.length === 0 ? (
        <p className="text-sm text-zinc-500">No PDFs attached yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-zinc-900 hover:underline"
                >
                  {doc.title || doc.originalFilename}
                </a>
                <p className="text-xs text-zinc-500">
                  {formatBytes(doc.byteSize)}
                  {doc.createdAt
                    ? ` · ${new Date(doc.createdAt).toLocaleDateString()}`
                    : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button type="button" size="sm" variant="ghost">
                    Open
                  </Button>
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => onUnlink(doc.id)}
                >
                  Unlink
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => onDelete(doc.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
