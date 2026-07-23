"use client";

import { Button } from "@/components/ui/button";

type Props = {
  markdown: string;
  filename?: string;
};

export function ExportBriefButton({
  markdown,
  filename = "chart-brief.md",
}: Props) {
  function onExport() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={onExport}>
      Export markdown
    </Button>
  );
}
