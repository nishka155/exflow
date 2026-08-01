"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DispatchForm } from "@/components/modules/dispatch-form";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";
import type { Transporter, Booking, Customer, Invoice } from "@prisma/client";

type BookingOption = Booking & { customer: Customer; invoice: Invoice | null };

function NewDispatchPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? undefined;

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOption[]>("/api/bookings"),
  });
  const { data: transporters, isLoading: transportersLoading } = useQuery({
    queryKey: ["transporters"],
    queryFn: () => api.get<Transporter[]>("/api/transporters"),
  });

  return (
    <div>
      <PageHeader title="New Truck Dispatch" description="Step 2 of the export workflow." />
      {bookingsLoading || transportersLoading || !bookings || !transporters ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DispatchForm bookings={bookings} transporters={transporters} defaultBookingId={bookingId} />
      )}
    </div>
  );
}

export default function NewDispatchPage() {
  return (
    <AuthGuard>
      <NewDispatchPageContent />
    </AuthGuard>
  );
}
