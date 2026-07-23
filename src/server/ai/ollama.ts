import type { AIProvider } from "./types";

export type OllamaModelInfo = {
  name: string;
  size: number | null;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, "");
}

/**
 * List models already pulled into the local Ollama instance (`GET /api/tags`).
 * Does not load/warm a model — tags is a lightweight catalog call.
 */
export async function listOllamaModels(
  baseUrl: string,
  opts?: { timeoutMs?: number },
): Promise<{ models: OllamaModelInfo[]; error: string | null }> {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    return { models: [], error: "Ollama base URL is empty" };
  }

  const timeoutMs = opts?.timeoutMs ?? 4000;
  try {
    const res = await fetch(`${base}/api/tags`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        models: [],
        error: `Ollama /api/tags failed (${res.status}): ${body.slice(0, 200) || res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      models?: Array<{ name?: string; model?: string; size?: number }>;
    };
    const models = (data.models ?? [])
      .map((m) => {
        const name = (m.name ?? m.model ?? "").trim();
        if (!name) return null;
        return {
          name,
          size: typeof m.size === "number" ? m.size : null,
        } satisfies OllamaModelInfo;
      })
      .filter((m): m is OllamaModelInfo => m != null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { models, error: null };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      models: [],
      error: `Could not reach Ollama at ${base} (${detail})`,
    };
  }
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama" as const;

  constructor(private readonly baseUrl: string) {
    if (!baseUrl?.trim()) {
      throw new Error("Ollama base URL is required");
    }
  }

  async completeJson(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<unknown> {
    const url = `${normalizeBaseUrl(this.baseUrl)}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama request failed (${res.status}): ${body.slice(0, 300) || res.statusText}`,
      );
    }

    const data = (await res.json()) as {
      message?: { content?: unknown };
    };
    const content = data.message?.content;
    if (content == null || content === "") {
      throw new Error("Ollama returned empty content");
    }

    if (typeof content === "object") {
      return content;
    }

    if (typeof content !== "string") {
      throw new Error("Ollama returned unexpected content type");
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("Ollama returned non-JSON content");
    }
  }

  async completeText(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<string> {
    const url = `${normalizeBaseUrl(this.baseUrl)}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama request failed (${res.status}): ${body.slice(0, 300) || res.statusText}`,
      );
    }

    const data = (await res.json()) as {
      message?: { content?: unknown };
    };
    const content = data.message?.content;
    if (content == null || content === "") {
      throw new Error("Ollama returned empty content");
    }

    if (typeof content === "string") {
      return content;
    }

    if (typeof content === "object") {
      return JSON.stringify(content);
    }

    throw new Error("Ollama returned unexpected content type");
  }
}
