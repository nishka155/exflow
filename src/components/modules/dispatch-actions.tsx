"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setDispatchStatusAction } from "@/lib/actions/dispatches";
import type { DispatchStatus } from "@/lib/constants/statuses";

export function DispatchActions({
  dispatchId,
  status,
}: {
  dispatchId: string;
  status: DispatchStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run(next: DispatchStatus, message: string) {
    startTransition(async () => {
      try {
        await setDispatchStatusAction(dispatchId, next);
        toast.success(message);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING" && (
        <Button disabled={pending} onClick={() => run("DISPATCHED", "Truck marked dispatched")}>
          <Truck />
          Mark Dispatched
        </Button>
      )}
      {(status === "PENDING" || status === "DISPATCHED") && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run("DELAY", "Truck flagged as delayed")}
        >
          <AlertTriangle />
          Flag Delay
        </Button>
      )}
      {(status === "DISPATCHED" || status === "DELAY") && (
        <Button disabled={pending} onClick={() => run("REACHED_FACTORY", "Truck reached factory")}>
          <CheckCircle2 />
          Mark Reached Factory
        </Button>
      )}
    </div>
  );
}
