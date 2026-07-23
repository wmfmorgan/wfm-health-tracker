import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";
import {
  CloudConfirmRequiredError,
  runEvaluatePersona,
} from "@/server/ai/skills/evaluate";

const bodySchema = z.object({
  personaId: z.string().min(1),
  focusNote: z.string().optional(),
  provider: z.enum(["grok", "ollama"]),
  model: z.string().min(1),
  cloudConfirmed: z.boolean().optional(),
  replaceExistingDraft: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await assertAuthenticated();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false as const, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false as const,
          error: parsed.error.issues.map((i) => i.message).join("; "),
        },
        { status: 400 },
      );
    }

    const { viewId, charCount } = await runEvaluatePersona(parsed.data);
    return NextResponse.json({ ok: true as const, viewId, charCount });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof CloudConfirmRequiredError) {
      return NextResponse.json(
        {
          ok: false as const,
          code: e.code,
          charCount: e.charCount,
          error: e.message,
        },
        { status: 400 },
      );
    }
    const message = e instanceof Error ? e.message : "evaluate failed";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
