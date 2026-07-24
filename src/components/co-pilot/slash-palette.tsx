"use client";

export type SlashSkillOption = {
  name: string;
  description: string;
  argumentHint?: string;
};

type Props = {
  skills: SlashSkillOption[];
  filter: string;
  onSelect: (skill: SlashSkillOption) => void;
  visible: boolean;
};

export function SlashPalette({ skills, filter, onSelect, visible }: Props) {
  if (!visible) return null;

  const q = filter.toLowerCase();
  const filtered = skills.filter(
    (s) =>
      s.name.includes(q) ||
      s.description.toLowerCase().includes(q),
  );

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 z-20 mb-1 w-full max-w-md rounded-md border border-zinc-200 bg-white p-2 text-sm text-zinc-500 shadow-lg">
        No matching skills. Try <code className="text-xs">/skills</code> or{" "}
        <code className="text-xs">/create-skill</code>.
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full left-0 z-20 mb-1 max-h-64 w-full max-w-md overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
      role="listbox"
      aria-label="Skills"
    >
      {filtered.map((s) => (
        <button
          key={s.name}
          type="button"
          role="option"
          aria-selected={false}
          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-zinc-50"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
        >
          <span className="font-mono text-sm font-medium text-zinc-900">
            /{s.name}
            {s.argumentHint ? (
              <span className="ml-1 font-normal text-zinc-500">
                {s.argumentHint}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-xs text-zinc-600">
            {s.description}
          </span>
        </button>
      ))}
    </div>
  );
}
