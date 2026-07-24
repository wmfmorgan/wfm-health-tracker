"use client";

import { useEffect, useState } from "react";

const PROGRESS_STEPS = [
  "Uploading PDF…",
  "Extracting text layer…",
  "Calling the model…",
  "Waiting for AI response…",
  "Building draft lab panels…",
] as const;

type Props = {
  provider: "grok" | "ollama" | string;
  model: string;
  filename?: string | null;
  /** When true, cycle progress steps (active request). */
  active?: boolean;
  /** Optional status line under the title (e.g. char count). */
  detail?: string | null;
};

/**
 * Evaluate-style progress card for lab PDF import / extraction.
 */
export function ImportProgress({
  provider,
  model,
  filename,
  active = true,
  detail,
}: Props) {
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgressIndex(0);
      return;
    }
    setProgressIndex(0);
    const id = window.setInterval(() => {
      setProgressIndex((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [active]);

  const step = PROGRESS_STEPS[progressIndex] ?? PROGRESS_STEPS[0];
  const providerLabel =
    provider === "grok"
      ? "Grok"
      : provider === "ollama"
        ? "Ollama"
        : provider;

  return (
    <div
      className="max-w-xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy={active}
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-medium text-zinc-900">Importing…</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {filename ? (
              <>
                Processing{" "}
                <span className="font-medium text-zinc-800 break-all">
                  {filename}
                </span>{" "}
                via{" "}
              </>
            ) : (
              "Running extraction via "
            )}
            <span className="font-medium text-zinc-800">{providerLabel}</span>{" "}
            <span className="font-mono text-xs text-zinc-500">({model})</span>
          </p>
          <p className="mt-3 text-sm font-medium text-zinc-800">{step}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-700"
              style={{
                width: `${((progressIndex + 1) / PROGRESS_STEPS.length) * 100}%`,
              }}
            />
          </div>
          {detail ? (
            <p className="mt-2 text-xs tabular-nums text-zinc-500">{detail}</p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            This can take a while for local models or large PDFs. Keep this tab
            open.
          </p>
        </div>
      </div>
    </div>
  );
}
