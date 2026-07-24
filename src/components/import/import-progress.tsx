"use client";

import { AiProgress } from "@/components/ui/ai-progress";

/** Stage labels for import — mirrors Evaluate’s staged checklist. */
export function buildImportSteps(providerLabel: string): string[] {
  return [
    "Uploading PDF…",
    "Extracting text layer…",
    `Calling ${providerLabel}…`,
    "Waiting for AI response…",
    "Parsing structured lab drafts…",
    "Saving draft panels for review…",
  ];
}

/**
 * Map job status / extracted text to a minimum stage so progress reflects
 * real server state while still animating through the AI wait stages.
 *
 * Steps: 0 upload · 1 text · 2 call AI · 3 wait · 4 parse · 5 save
 */
export function importMinStepIndex(opts: {
  status?: string | null;
  extractedCharCount?: number | null;
}): number {
  const { status, extractedCharCount } = opts;
  if (status === "extracting" || status === "awaiting_cloud_confirm") {
    // Text done; AI call in flight
    return extractedCharCount != null && extractedCharCount > 0 ? 2 : 1;
  }
  if (status === "pending") {
    if (extractedCharCount != null && extractedCharCount > 0) return 2;
    return 0;
  }
  if (status === "ready" || status === "completed") return 5;
  return 0;
}

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

  const minStepIndex = importMinStepIndex({ status, extractedCharCount });

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
      steps={buildImportSteps(providerLabel)}
      active={active}
      minStepIndex={minStepIndex}
      detail={
        detailNode ? (
          <span className="tabular-nums">{detailNode}</span>
        ) : undefined
      }
      footer={
        <p className="mt-3 text-xs text-zinc-500">
          This can take a while for local models or large PDFs. Keep this tab
          open until drafts appear for review.
        </p>
      }
    />
  );
}
