import { NextResponse } from "next/server";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";
import { createBackupZip } from "@/server/services/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await assertAuthenticated();
    const { buffer, filename } = await createBackupZip();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("backup failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
