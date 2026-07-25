import { afterEach, describe, expect, it, vi } from "vitest";
import { warmOllamaModel } from "@/server/ai/ollama";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("warmOllamaModel", () => {
  it("POSTs empty generate with keep_alive and reports success", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ model: "qwen2.5:32b", done: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await warmOllamaModel("http://127.0.0.1:11434/", "qwen2.5:32b");
    expect(result).toEqual({
      ok: true,
      model: "qwen2.5:32b",
      keepAlive: "30m",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "qwen2.5:32b",
          keep_alive: "30m",
        }),
      }),
    );
  });

  it("forwards custom keepAlive", async () => {
    const fetchMock = vi.fn(async () => Response.json({ done: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await warmOllamaModel("http://127.0.0.1:11434", "llama3.2", {
      keepAlive: -1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.keepAlive).toBe(-1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        body: JSON.stringify({
          model: "llama3.2",
          keep_alive: -1,
        }),
      }),
    );
  });

  it("returns error when model is empty", async () => {
    const result = await warmOllamaModel("http://127.0.0.1:11434", "  ");
    expect(result).toEqual({ ok: false, error: "Model name is required" });
  });

  it("returns error when Ollama responds non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("model not found", { status: 404 })),
    );

    const result = await warmOllamaModel("http://127.0.0.1:11434", "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/404/);
  });

  it("returns error when Ollama is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    );

    const result = await warmOllamaModel("http://127.0.0.1:11434", "llama3.2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Could not reach Ollama/);
  });
});
