"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { ShippingInstruction, Booking, Customer } from "@prisma/client";
import { api, ApiError } from "@/lib/api/client";

type SiOption = ShippingInstruction & { booking: Booking & { customer: Customer } };

export function CreateBLForm({ sis }: { sis: SiOption[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [siId, setSiId] = React.useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/api/bills-of-lading", { shippingInstructionId: siId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bills-of-lading"] });
      router.push(`/bills-of-lading/${data.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-1">
          <Label htmlFor="shippingInstructionId">Confirmed Shipping Instruction</Label>
          <Select value={siId} onValueChange={(v) => v && setSiId(v)}>
            <SelectTrigger id="shippingInstructionId" className="w-full">
              <SelectValue placeholder="Select a confirmed shipping instruction">
                {(value: string | null) => {
                  const si = sis.find((s) => s.id === value);
                  return si ? `${si.booking.bookingNumber} · ${si.booking.customer.name}` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sis.map((si) => (
                <SelectItem key={si.id} value={si.id}>
                  {si.booking.bookingNumber} · {si.booking.customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The Bill of Lading draft is pre-filled from the shipping instruction — you can edit it
            afterwards, and any divergence from the SI will be flagged automatically.
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending || !siId}>
          {mutation.isPending ? "Creating…" : "Generate BL Draft"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
