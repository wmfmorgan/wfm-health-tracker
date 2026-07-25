"use client";

import { AiProgress } from "@/components/ui/ai-progress";
import {
  buildImportSteps,
  importMinStepIndex,
} from "@/lib/import-progress-steps";

export { buildImportSteps, importMinStepIndex };

type Props = {
  provider: "grok" | "ollama" | string;
  model: string;
  filename?: string | null;
  /** Job status for status-driven stage floor. */
  status?: string | null;
  /** When true, cycle progress steps (active request). */
  active?: boolean;
  /** Optional status line (e.g. char count). */
  detail?: string | null;
  extractedCharCount?: number | null;
};

/**
 * Multi-stage progress card for lab PDF import (aligned with Evaluate UI).
 */
export function ImportProgress({
  provider,
  model,
  filename,
  status,
  active = true,
  detail,
  extractedCharCount,
}: Props) {
  const providerLabel =
    provider === "grok"
      ? "Grok"
      : provider === "ollama"
        ? "Ollama"
        : String(provider);

  const minStepIndex = importMinStepIndex({
    status,
    extractedCharCount,
    provider,
  });

  const subtitle = (
    <>
      {filename ? (
        <>
          Processing{" "}
          <span className="font-medium text-zinc-800 break-all">{filename}</span>{" "}
          via{" "}
        </>
      ) : (
        "Running lab PDF extraction via "
      )}
      <span className="font-medium text-zinc-800">{providerLabel}</span>{" "}
      <span className="font-mono text-xs text-zinc-500">({model})</span>
    </>
  );

  const detailNode =
    detail ??
    (extractedCharCount != null && extractedCharCount > 0
      ? `${extractedCharCount.toLocaleString()} characters extracted from PDF`
      : null);

  return (
    <AiProgress
      title="Importing…"
      subtitle={subtitle}
      steps={buildImportSteps(providerLabel, provider)}
      active={active}
      minStepIndex={minStepIndex}
      // Ollama warm can take a while; advance stages a bit slower
      intervalMs={provider === "ollama" ? 3200 : 2600}
      detail={
        detailNode ? (
          <span className="tabular-nums">{detailNode}</span>
        ) : undefined
      }
      footer={
        <p className="mt-3 text-xs text-zinc-500">
          {provider === "ollama"
            ? "Local models may need a minute to load into memory on first use. Keep this tab open until drafts appear for review."
            : "This can take a while for large PDFs. Keep this tab open until drafts appear for review."}
        </p>
      }
    />
  );
}
