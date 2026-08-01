"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { BLStatus } from "@/lib/constants/statuses";

export function FinalizeBLButton({ blId, status }: { blId: string; status: BLStatus }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();

  if (status === "FINAL") return null;

  function handleClick() {
    startTransition(async () => {
      try {
        await api.post(`/api/bills-of-lading/${blId}/finalize`);
        queryClient.invalidateQueries({ queryKey: ["bill-of-lading", blId] });
        queryClient.invalidateQueries({ queryKey: ["bills-of-lading"] });
        toast.success("Bill of Lading finalized");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
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
