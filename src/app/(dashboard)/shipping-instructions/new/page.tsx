"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ShippingInstructionForm } from "@/components/modules/shipping-instruction-form";
import { api } from "@/lib/api/client";
import type {
  Booking,
  Customer,
  Invoice,
  FactoryStuffing,
  GateIn,
  Organization,
} from "@prisma/client";

type BookingOption = Booking & {
  customer: Customer;
  invoice: Invoice | null;
  factoryStuffings: FactoryStuffing[];
  gateIns: GateIn[];
};

function NewShippingInstructionPageContent() {
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", { awaitingSI: true }],
    queryFn: () => api.get<BookingOption[]>("/api/bookings?awaitingSI=true"),
  });
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ organization: Organization }>("/api/auth/me"),
  });

  return (
    <div>
      <PageHeader
        title="New Shipping Instruction"
        description="Step 5 of the export workflow — auto-filled from invoice and stuffing data."
      />
      {bookingsLoading || meLoading || !bookings || !me ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ShippingInstructionForm bookings={bookings} organizationName={me.organization.name} />
      )}
    </div>
  );
}

export default function NewShippingInstructionPage() {
  return (
    <NewShippingInstructionPageContent />
  );
}
