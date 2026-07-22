import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { documents } from "@/server/db/schema";
import { getDocumentFilePath } from "@/server/services/documents";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await assertAuthenticated();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    throw e;
  }

  bootstrapDb();
  const { id } = await ctx.params;
  const doc = getDb().select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const fp = getDocumentFilePath(id);
  if (!fp || !fs.existsSync(fp)) {
    return new NextResponse("File missing on disk", { status: 404 });
  }
  const data = fs.readFileSync(fp);
  const safeName = doc.originalFilename.replace(/"/g, "");
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
