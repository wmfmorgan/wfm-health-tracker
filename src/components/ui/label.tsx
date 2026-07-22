import type { LabelHTMLAttributes } from "react";

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm font-medium text-zinc-900 ${className}`}
      {...props}
    />
  );
}
