"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { finalizeBillOfLadingAction } from "@/lib/actions/bills-of-lading";
import type { BLStatus } from "@/lib/constants/statuses";

export function FinalizeBLButton({ blId, status }: { blId: string; status: BLStatus }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (status === "FINAL") return null;

  function handleClick() {
    startTransition(async () => {
      try {
        await finalizeBillOfLadingAction(blId);
        toast.success("Bill of Lading finalized");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Button disabled={pending || status === "MISMATCH"} onClick={handleClick}>
      <CheckCircle2 />
      Generate Final BL
    </Button>
  );
}
