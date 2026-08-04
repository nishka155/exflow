"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BookingImport } from "@/components/modules/booking-import";
import { api } from "@/lib/api/client";
import type { Customer } from "@prisma/client";

function ImportBookingsPageContent() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/api/customers"),
  });

  return (
    <div>
      <PageHeader
        title="Import Bookings"
        description="Add bookings manually one at a time, or bulk-import from Excel/CSV — or upload a PDF booking confirmation to auto-fill the form."
      />
      {isLoading || !customers ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BookingImport customers={customers} />
      )}
    </div>
  );
}

export default function ImportBookingsPage() {
  return (
    <ImportBookingsPageContent />
  );
}
