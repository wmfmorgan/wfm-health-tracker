"use client";

import {
  EvaluateForm,
  type EvaluatePersonaOption,
} from "@/components/brief/evaluate-form";

type Props = {
  personas: EvaluatePersonaOption[];
  contextCharEstimates: Record<string, number>;
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaModel: string;
  ollamaModels: string[];
  ollamaListError: string | null;
  defaultPersonaId?: string;
};

/**
 * Evaluate panel — reuses EvaluateForm.
 */
export function EvaluatePanel(props: Props) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-zinc-900">Evaluate as…</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Run a persona lens over the chart. Output is a draft view you can edit,
          accept, or reject on the chart brief.
        </p>
      </div>
      <EvaluateForm {...props} />
    </div>
  );
}
