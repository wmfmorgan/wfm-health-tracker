import Link from "next/link";
import {
  listAllDocuments,
  listAllDocumentLinks,
} from "@/server/services/documents";
import { deleteDocumentAction } from "@/server/actions/documents";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EntityType } from "@/lib/validation/document";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function entityHref(entityType: string, entityId: string): string | null {
  switch (entityType as EntityType) {
    case "diagnosis":
      return `/diagnoses/${entityId}`;
    case "medication":
      return `/medications/${entityId}`;
    case "supplement":
      return `/supplements/${entityId}`;
    case "lab_panel":
      return `/labs/${entityId}`;
    case "test":
      return `/tests/${entityId}`;
    case "procedure":
      return `/procedures/${entityId}`;
    default:
      return null;
  }
}

function entityLabel(entityType: string): string {
  switch (entityType) {
    case "lab_panel":
      return "lab panel";
    default:
      return entityType;
  }
}

export default async function DocumentsLibraryPage() {
  const docs = listAllDocuments();
  const links = listAllDocumentLinks();
  const linksByDoc = new Map<string, typeof links>();
  for (const link of links) {
    const list = linksByDoc.get(link.documentId) ?? [];
    list.push(link);
    linksByDoc.set(link.documentId, list);
  }

  return (
    <div className="text-zinc-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-zinc-600">
          All uploaded PDFs. Open a file inline, or delete it from the library.
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          No documents yet. Attach a PDF from any record detail page.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Via</th>
                <th className="px-4 py-3">Linked to</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {docs.map((doc) => {
                const docLinks = linksByDoc.get(doc.id) ?? [];
                return (
                  <tr key={doc.id} className="align-top">
                    <td className="px-4 py-3">
                      <a
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {doc.title || doc.originalFilename}
                      </a>
                      {doc.title && doc.title !== doc.originalFilename ? (
                        <p className="text-xs text-zinc-500">{doc.originalFilename}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatBytes(doc.byteSize)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(doc.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="muted" className="capitalize">
                        {doc.uploadedVia.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {docLinks.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {docLinks.map((l) => {
                            const href = entityHref(l.entityType, l.entityId);
                            const label = `${entityLabel(l.entityType)}`;
                            return (
                              <li key={`${l.documentId}-${l.entityType}-${l.entityId}`}>
                                {href ? (
                                  <Link
                                    href={href}
                                    className="text-zinc-700 hover:underline"
                                  >
                                    <span className="capitalize">{label}</span>
                                    <span className="text-zinc-400"> · </span>
                                    <span className="font-mono text-xs">{l.entityId.slice(0, 8)}</span>
                                  </Link>
                                ) : (
                                  <span className="capitalize text-zinc-600">{label}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <a
                          href={`/api/documents/${doc.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button type="button" size="sm" variant="ghost">
                            Open
                          </Button>
                        </a>
                        <ConfirmDeleteButton
                          action={asFormAction(deleteDocumentAction.bind(null, doc.id))}
                          message={`Permanently delete “${doc.originalFilename}”?`}
                          label="Delete"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
