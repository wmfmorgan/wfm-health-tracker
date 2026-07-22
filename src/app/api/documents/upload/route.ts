import { NextRequest, NextResponse } from "next/server";
import { entityTypeSchema } from "@/lib/validation/document";
import { savePdfDocument, linkDocument } from "@/server/services/documents";
// import auth guard when Task 12 lands

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const entityTypeRaw = form.get("entityType");
    const entityIdRaw = form.get("entityId");
    const entityId = entityIdRaw == null ? "" : String(entityIdRaw);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const doc = savePdfDocument({
      originalFilename: file.name,
      buffer: buf,
      uploadedVia: "manual",
      contentType: file.type || "application/pdf",
    });

    if (entityTypeRaw != null && String(entityTypeRaw) && entityId) {
      const parsedType = entityTypeSchema.safeParse(String(entityTypeRaw));
      if (!parsedType.success) {
        return NextResponse.json({ error: "invalid entityType" }, { status: 400 });
      }
      linkDocument(doc.id, parsedType.data, entityId);
    }

    return NextResponse.json({ ok: true, document: doc });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
