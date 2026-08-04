"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Booking, Customer, Transporter } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { StuffingGrid, type StuffingRow } from "@/components/modules/stuffing-grid";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";

export type BookingOption = Booking & { customer: Customer };

function StuffingPageContent() {
  const { data: stuffings, isLoading } = useQuery({
    queryKey: ["stuffings"],
    queryFn: () => api.get<StuffingRow[]>("/api/stuffing"),
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOption[]>("/api/bookings"),
  });

  const { data: transporters } = useQuery({
    queryKey: ["transporters"],
    queryFn: () => api.get<Transporter[]>("/api/transporters"),
  });

  return (
    <div>
      <PageHeader
        title="Factory Stuffing"
        description="One row per container — edit directly in the grid, just like a spreadsheet."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <StuffingGrid
          rows={stuffings ?? []}
          transporters={transporters ?? []}
          bookings={bookings ?? []}
        />
      )}
    </div>
  );
}

export default function StuffingPage() {
  return (
    <AuthGuard>
      <StuffingPageContent />
    </AuthGuard>
  );
}
