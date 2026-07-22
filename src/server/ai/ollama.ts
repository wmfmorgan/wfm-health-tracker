import type { AIProvider } from "./types";

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
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/chat`;
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
}
