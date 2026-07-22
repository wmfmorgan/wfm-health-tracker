"use client";

import { Button } from "@/components/ui/button";

type ConfirmDeleteButtonProps = {
  /** Server action invoked after the user confirms. */
  action: (formData: FormData) => void | Promise<void>;
  /** Confirm dialog message. */
  message?: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
};

export function ConfirmDeleteButton({
  action,
  message = "Delete this record? This cannot be undone.",
  label = "Delete",
  className = "",
  children,
}: ConfirmDeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm" className={className}>
        {children ?? label}
      </Button>
    </form>
  );
}
