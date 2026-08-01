"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { SIStatus } from "@/lib/constants/statuses";

export function ShippingInstructionActions({
  siId,
  status,
}: {
  siId: string;
  status: SIStatus;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();

  function run(action: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await action();
        queryClient.invalidateQueries({ queryKey: ["shipping-instruction", siId] });
        queryClient.invalidateQueries({ queryKey: ["shipping-instructions"] });
        toast.success(message);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button
          disabled={pending}
          onClick={() =>
            run(() => api.post(`/api/shipping-instructions/${siId}/send`), "Sent to shipping line")
          }
        >
          <Send />
          Send to Shipping Line
        </Button>
      )}
      {status === "SENT" && (
        <Button
          disabled={pending}
          onClick={() =>
            run(() => api.post(`/api/shipping-instructions/${siId}/confirm`), "Marked as confirmed")
          }
        >
          <CheckCircle2 />
          Mark Confirmed
        </Button>
      )}
    </div>
  );
}
