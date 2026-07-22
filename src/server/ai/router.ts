import { GrokProvider } from "./grok";
import { OllamaProvider } from "./ollama";
import type { AIProvider } from "./types";

export function getAIProvider(
  id: "grok" | "ollama",
  ollamaBaseUrl: string,
): AIProvider {
  if (id === "grok") {
    return new GrokProvider();
  }
  return new OllamaProvider(ollamaBaseUrl);
}
