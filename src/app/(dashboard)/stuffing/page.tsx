"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Container, Loader2 } from "lucide-react";
import type { Booking, Customer, Transporter } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StuffingGrid, type StuffingRow } from "@/components/modules/stuffing-grid";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api, ApiError } from "@/lib/api/client";

type BookingOption = Booking & { customer: Customer };

function StuffingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = searchParams.get("bookingId") ?? "";

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOption[]>("/api/bookings"),
  });

  const { data: stuffings, isLoading: stuffingsLoading } = useQuery({
    queryKey: ["stuffings", { bookingId }],
    queryFn: () => api.get<StuffingRow[]>(`/api/stuffing?bookingId=${bookingId}`),
    enabled: !!bookingId,
  });

  const { data: transporters } = useQuery({
    queryKey: ["transporters"],
    queryFn: () => api.get<Transporter[]>("/api/transporters"),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post<{ id: string }>("/api/stuffing", { bookingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stuffings", { bookingId }] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not add container");
    },
  });

  function handleBookingChange(id: string) {
    router.push(`/stuffing?bookingId=${id}`);
  }

  return (
    <div>
      <PageHeader
        title="Factory Stuffing"
        description="One row per container — edit directly in the grid, just like a spreadsheet."
        actions={
          <Button onClick={() => addMutation.mutate()} disabled={!bookingId || addMutation.isPending}>
            <Plus />
            Add Container
          </Button>
        }
      />

      <div className="mb-4 max-w-sm space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Booking</label>
        <Select value={bookingId} onValueChange={(v) => v && handleBookingChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={bookingsLoading ? "Loading…" : "Select a booking"}>
              {(value: string | null) => {
                const b = bookings?.find((b) => b.id === value);
                return b ? `${b.bookingNumber} · ${b.customer.name}` : null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {bookings?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.bookingNumber} · {b.customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!bookingId ? (
        <EmptyState
          icon={Container}
          title="Select a booking above"
          description="Choose a booking to view or add its containers."
        />
      ) : stuffingsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <StuffingGrid
          rows={stuffings ?? []}
          transporters={transporters ?? []}
          bookingId={bookingId}
        />
      )}
    </div>
  );
}

export default function StuffingPage() {
  return (
    <AuthGuard>
      <React.Suspense fallback={null}>
        <StuffingPageContent />
      </React.Suspense>
    </AuthGuard>
  );
}
