"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sendShippingInstructionAction,
  confirmShippingInstructionAction,
} from "@/lib/actions/shipping-instructions";
import type { SIStatus } from "@/lib/constants/statuses";

export function ShippingInstructionActions({
  siId,
  status,
}: {
  siId: string;
  status: SIStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run(action: () => Promise<void>, message: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button
          disabled={pending}
          onClick={() => run(() => sendShippingInstructionAction(siId), "Sent to shipping line")}
        >
          <Send />
          Send to Shipping Line
        </Button>
      )}
      {status === "SENT" && (
        <Button
          disabled={pending}
          onClick={() => run(() => confirmShippingInstructionAction(siId), "Marked as confirmed")}
        >
          <CheckCircle2 />
          Mark Confirmed
        </Button>
      )}
    </div>
  );
}
