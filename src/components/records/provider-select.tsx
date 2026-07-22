import { Select } from "@/components/ui/select";

export type ProviderOption = {
  id: string;
  name: string;
  specialty: string | null;
  organization: string | null;
};

type Props = {
  name: string;
  defaultValue?: string | null;
  providers: ProviderOption[];
  /** Empty option label */
  emptyLabel?: string;
  required?: boolean;
  className?: string;
};

/**
 * Dropdown of care-team providers. Value submitted is the provider display name
 * (matches existing free-text clinician/prescriber columns).
 */
export function ProviderSelect({
  name,
  defaultValue,
  providers,
  emptyLabel = "— Select provider —",
  required,
  className,
}: Props) {
  const current = defaultValue ?? "";
  const known = new Set(providers.map((p) => p.name));
  const orphan = current && !known.has(current) ? current : null;

  return (
    <Select name={name} defaultValue={current} required={required} className={className}>
      <option value="">{emptyLabel}</option>
      {orphan ? (
        <option value={orphan}>
          {orphan} (not in list)
        </option>
      ) : null}
      {providers.map((p) => {
        const label = [p.name, p.specialty, p.organization].filter(Boolean).join(" · ");
        return (
          <option key={p.id} value={p.name}>
            {label}
          </option>
        );
      })}
    </Select>
  );
}

type FacilityProps = {
  name: string;
  defaultValue?: string | null;
  facilities: string[];
  emptyLabel?: string;
  required?: boolean;
  className?: string;
};

/** Dropdown of facility/organization names from the providers list. */
export function FacilitySelect({
  name,
  defaultValue,
  facilities,
  emptyLabel = "— Select facility —",
  required,
  className,
}: FacilityProps) {
  const current = defaultValue ?? "";
  const known = new Set(facilities);
  const orphan = current && !known.has(current) ? current : null;

  return (
    <Select name={name} defaultValue={current} required={required} className={className}>
      <option value="">{emptyLabel}</option>
      {orphan ? (
        <option value={orphan}>
          {orphan} (not in list)
        </option>
      ) : null}
      {facilities.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </Select>
  );
}
