import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { warmOllamaModel } from "@/server/ai/ollama";
import { getAiSettings } from "@/server/services/settings";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";

const bodySchema = z.object({
  model: z.string().trim().min(1).max(100),
  /** Ollama keep_alive: duration string ("30m"), seconds, or -1 to keep forever. */
  keepAlive: z.union([z.string().min(1).max(20), z.number()]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await assertAuthenticated();

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "model is required (1–100 characters)" },
        { status: 400 },
      );
    }

    const settings = getAiSettings();
    const result = await warmOllamaModel(
      settings.ollamaBaseUrl,
      parsed.data.model,
      { keepAlive: parsed.data.keepAlive },
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      model: result.model,
      keepAlive: result.keepAlive,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "warm failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
