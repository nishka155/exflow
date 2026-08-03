"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BookingForm } from "@/components/modules/booking-form";
import { api } from "@/lib/api/client";
import type { Customer } from "@prisma/client";

function NewBookingPageContent() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/api/customers"),
  });

  return (
    <div>
      <PageHeader title="New Booking" description="Create a booking to start the export workflow." />
      {isLoading || !customers ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BookingForm customers={customers} />
      )}
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <NewBookingPageContent />
  );
}
