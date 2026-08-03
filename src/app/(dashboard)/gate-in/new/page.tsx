"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { GateInForm } from "@/components/modules/gate-in-form";
import { api } from "@/lib/api/client";
import type { FactoryStuffing, Booking, Customer } from "@prisma/client";

type StuffingOption = FactoryStuffing & { booking: Booking & { customer: Customer } };

function NewGateInPageContent() {
  const { data: stuffings, isLoading } = useQuery({
    queryKey: ["stuffings", { awaitingGateIn: true }],
    queryFn: () => api.get<StuffingOption[]>("/api/stuffing?awaitingGateIn=true"),
  });

  return (
    <div>
      <PageHeader title="New Gate In" description="Step 4 of the export workflow." />
      {isLoading || !stuffings ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GateInForm stuffings={stuffings} />
      )}
    </div>
  );
}

export default function NewGateInPage() {
  return (
    <NewGateInPageContent />
  );
}
