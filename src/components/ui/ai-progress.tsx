"use client";

import { useEffect, useState } from "react";

export type AiProgressStep = {
  id: string;
  label: string;
};

type Props = {
  title: string;
  subtitle: React.ReactNode;
  steps: readonly AiProgressStep[] | readonly string[];
  /** Advance step index on an interval while active (default true). */
  active?: boolean;
  /**
   * Floor for the animated step index (e.g. skip past upload once text
   * extraction is known complete). Clamped to last step.
   */
  minStepIndex?: number;
  /** ms between step advances */
  intervalMs?: number;
  footer?: React.ReactNode;
  detail?: React.ReactNode;
};

function normalizeSteps(
  steps: readonly AiProgressStep[] | readonly string[],
): AiProgressStep[] {
  return steps.map((s, i) =>
    typeof s === "string" ? { id: `step-${i}`, label: s } : s,
  );
}

/**
 * Shared multi-stage progress card (Evaluate, Import, etc.).
 * Shows a checklist: done ✓ · current (spinner) · upcoming.
 */
export function AiProgress({
  title,
  subtitle,
  steps: stepsIn,
  active = true,
  minStepIndex = 0,
  intervalMs = 2600,
  footer,
  detail,
}: Props) {
  const steps = normalizeSteps(stepsIn);
  const maxIndex = Math.max(0, steps.length - 1);
  const floor = Math.min(Math.max(0, minStepIndex), maxIndex);
  const [index, setIndex] = useState(floor);

  useEffect(() => {
    if (!active) {
      setIndex(floor);
      return;
    }
    setIndex(floor);
    const id = window.setInterval(() => {
      setIndex((i) => Math.min(Math.max(i + 1, floor), maxIndex));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs, floor, maxIndex]);

  // If server-driven floor jumps ahead (e.g. char count arrived), catch up.
  useEffect(() => {
    setIndex((i) => Math.max(i, floor));
  }, [floor]);

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
          <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
          <div className="mt-1 text-sm text-zinc-600">{subtitle}</div>

          <ol className="mt-4 space-y-2.5">
            {steps.map((step, i) => {
              const done = i < index;
              const current = i === index;
              const upcoming = i > index;
              return (
                <li key={step.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {done ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                        aria-hidden
                      >
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.5L5 9l4.5-5.5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : current ? (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-zinc-200"
                        aria-hidden
                      />
                    )}
                  </span>
                  <span
                    className={
                      done
                        ? "text-zinc-500 line-through decoration-zinc-300"
                        : current
                          ? "font-medium text-zinc-900"
                          : upcoming
                            ? "text-zinc-400"
                            : "text-zinc-700"
                    }
                  >
                    {step.label}
                    {current ? (
                      <span className="sr-only"> (in progress)</span>
                    ) : null}
                    {done ? (
                      <span className="sr-only"> (done)</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-700"
              style={{
                width: `${((index + 1) / steps.length) * 100}%`,
              }}
            />
          </div>

          {detail ? (
            <div className="mt-2 text-xs text-zinc-500">{detail}</div>
          ) : null}

          {footer ?? (
            <p className="mt-3 text-xs text-zinc-500">
              This can take a while for local models or large inputs. Keep this
              tab open.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
