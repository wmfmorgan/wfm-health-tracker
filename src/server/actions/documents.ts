"use server";

import { revalidatePath } from "next/cache";
import type { EntityType } from "@/lib/validation/document";
import {
  unlinkDocument,
  deleteDocument,
  listLinksForDocument,
} from "@/server/services/documents";

function entityPath(entityType: EntityType, entityId: string): string {
  switch (entityType) {
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
  }
}

export async function unlinkDocumentAction(
  documentId: string,
  entityType: EntityType,
  entityId: string,
) {
  unlinkDocument(documentId, entityType, entityId);
  revalidatePath("/documents");
  revalidatePath(entityPath(entityType, entityId));
}

export async function deleteDocumentAction(documentId: string) {
  const links = listLinksForDocument(documentId);
  deleteDocument(documentId);
  revalidatePath("/documents");
  for (const link of links) {
    revalidatePath(entityPath(link.entityType as EntityType, link.entityId));
  }
}
