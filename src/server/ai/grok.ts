import OpenAI from "openai";
import type { AIProvider } from "./types";

export class GrokProvider implements AIProvider {
  readonly id = "grok" as const;
  private client: OpenAI;

  constructor(apiKey = process.env.XAI_API_KEY) {
    const key = apiKey?.trim();
    if (!key) {
      throw new Error(
        "XAI_API_KEY is not set. Configure it in the environment to use Grok.",
      );
    }
    this.client = new OpenAI({
      apiKey: key,
      baseURL: "https://api.x.ai/v1",
    });
  }

  async completeJson(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<unknown> {
    const completion = await this.client.chat.completions.create({
      model: input.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content == null || content === "") {
      throw new Error("Grok returned empty content");
    }

    if (typeof content !== "string") {
      return content;
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("Grok returned non-JSON content");
    }
  }

  async completeText(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: input.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (content == null || content === "") {
      throw new Error("Grok returned empty content");
    }

    if (typeof content !== "string") {
      throw new Error("Grok returned non-text content");
    }

    return content;
  }
}
