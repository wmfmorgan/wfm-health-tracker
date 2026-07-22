import { NextRequest, NextResponse } from "next/server";
import { importProviderSchema } from "@/lib/validation/import";
import { startImportFromPdf } from "@/server/services/imports";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";

export async function POST(req: NextRequest) {
  try {
    await assertAuthenticated();

    const form = await req.formData();
    const file = form.get("file");
    const providerRaw = form.get("provider");
    const modelRaw = form.get("model");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const providerParsed = importProviderSchema.safeParse(
      providerRaw == null ? "" : String(providerRaw),
    );
    if (!providerParsed.success) {
      return NextResponse.json(
        { error: "provider must be grok or ollama" },
        { status: 400 },
      );
    }

    const model =
      modelRaw == null || String(modelRaw).trim() === ""
        ? undefined
        : String(modelRaw).trim();

    const buf = Buffer.from(await file.arrayBuffer());
    const { jobId } = await startImportFromPdf({
      originalFilename: file.name,
      buffer: buf,
      provider: providerParsed.data,
      model,
    });

    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "import upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
