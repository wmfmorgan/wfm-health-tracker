export type AIProviderId = "grok" | "ollama";

export interface AIProvider {
  readonly id: AIProviderId;
  completeJson(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<unknown>;
  completeText(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<string>;
}
