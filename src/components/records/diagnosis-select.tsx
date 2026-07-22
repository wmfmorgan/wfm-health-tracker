import { Select } from "@/components/ui/select";

export type DiagnosisOption = {
  id: string;
  name: string;
  status: string;
};

type Props = {
  name: string;
  defaultValue?: string | null;
  diagnoses: DiagnosisOption[];
  emptyLabel?: string;
  required?: boolean;
  className?: string;
};

/**
 * Dropdown of diagnoses for medication purpose.
 * Submitted value is the diagnosis name (stored in free-text purpose column).
 */
export function DiagnosisSelect({
  name,
  defaultValue,
  diagnoses,
  emptyLabel = "— Select diagnosis —",
  required,
  className,
}: Props) {
  const current = defaultValue ?? "";
  const known = new Set(diagnoses.map((d) => d.name));
  const orphan = current && !known.has(current) ? current : null;

  const active = diagnoses.filter((d) => d.status === "active" || d.status === "chronic");
  const resolved = diagnoses.filter((d) => d.status === "resolved");
  const other = diagnoses.filter(
    (d) => d.status !== "active" && d.status !== "chronic" && d.status !== "resolved",
  );

  function optionLabel(d: DiagnosisOption) {
    if (d.status === "chronic") return `${d.name} (chronic)`;
    if (d.status === "resolved") return `${d.name} (resolved)`;
    if (d.status === "active") return d.name;
    return `${d.name} (${d.status})`;
  }

  return (
    <Select name={name} defaultValue={current} required={required} className={className}>
      <option value="">{emptyLabel}</option>
      {orphan ? (
        <option value={orphan}>
          {orphan} (not in list)
        </option>
      ) : null}
      {active.map((d) => (
        <option key={d.id} value={d.name}>
          {optionLabel(d)}
        </option>
      ))}
      {resolved.length > 0 ? (
        <optgroup label="Resolved">
          {resolved.map((d) => (
            <option key={d.id} value={d.name}>
              {optionLabel(d)}
            </option>
          ))}
        </optgroup>
      ) : null}
      {other.map((d) => (
        <option key={d.id} value={d.name}>
          {optionLabel(d)}
        </option>
      ))}
    </Select>
  );
}
