"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GenerateReportButton({
  action,
  hasReport,
  label = "Generate Report",
  regenerateLabel = "Regenerate Report",
}: {
  action: () => Promise<void>;
  hasReport: boolean;
  label?: string;
  regenerateLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await action();
        toast.success("Report generated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleClick}>
      <FileDown />
      {pending ? "Generating…" : hasReport ? regenerateLabel : label}
    </Button>
  );
}
