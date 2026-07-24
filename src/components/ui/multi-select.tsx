"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MultiSelectOption = {
  id: string;
  label: string;
};

type Props = {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyHint?: string;
  /** Shown when nothing is selected */
  placeholder?: string;
  className?: string;
};

/**
 * Dropdown multi-select with checkboxes (not a native multi-select listbox).
 */
export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  disabled,
  emptyHint = "No options available.",
  placeholder = "All (defaults)",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = new Set(value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  function selectAll() {
    onChange(options.map((o) => o.id));
  }

  function clearAll() {
    onChange([]);
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.id === value[0])?.label ?? "1 selected")
        : `${value.length} selected`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <span className="mb-1 block text-sm font-medium text-zinc-800">{label}</span>
      {options.length === 0 ? (
        <p className="text-xs text-zinc-500">{emptyHint}</p>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 shadow-sm hover:border-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={`min-w-0 truncate ${
                value.length === 0 ? "text-zinc-500" : "text-zinc-900"
              }`}
            >
              {summary}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {open ? (
            <div
              id={listId}
              role="listbox"
              aria-multiselectable="true"
              className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-1.5">
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-700 hover:underline"
                  onClick={selectAll}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-700 hover:underline"
                  onClick={clearAll}
                >
                  Clear
                </button>
              </div>
              <ul className="py-1">
                {options.map((o) => {
                  const checked = selected.has(o.id);
                  return (
                    <li key={o.id} role="option" aria-selected={checked}>
                      <label className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                          checked={checked}
                          onChange={() => toggle(o.id)}
                        />
                        <span className="min-w-0 leading-snug">{o.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="mt-1 text-xs text-zinc-500">
            {value.length === 0
              ? "None selected — uses defaults (all active / recent)."
              : `${value.length} record${value.length === 1 ? "" : "s"} will be included.`}
          </p>
        </>
      )}
    </div>
  );
}
