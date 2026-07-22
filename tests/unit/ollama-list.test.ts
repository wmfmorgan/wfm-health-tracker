import { afterEach, describe, expect, it, vi } from "vitest";
import { listOllamaModels } from "@/server/ai/ollama";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listOllamaModels", () => {
  it("returns sorted model names from /api/tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          models: [
            { name: "llama3.2:latest", size: 100 },
            { name: "qwen2.5:14b", size: 200 },
          ],
        }),
      ),
    );

    const result = await listOllamaModels("http://127.0.0.1:11434/");
    expect(result.error).toBeNull();
    expect(result.models.map((m) => m.name)).toEqual(["llama3.2:latest", "qwen2.5:14b"]);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/tags",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns error when Ollama is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    );

    const result = await listOllamaModels("http://127.0.0.1:11434");
    expect(result.models).toEqual([]);
    expect(result.error).toMatch(/Could not reach Ollama/);
  });
});
