"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CreateBLForm } from "@/components/modules/create-bl-form";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";
import type { ShippingInstruction, Booking, Customer } from "@prisma/client";

type SiOption = ShippingInstruction & { booking: Booking & { customer: Customer } };

function NewBillOfLadingPageContent() {
  const { data: sis, isLoading } = useQuery({
    queryKey: ["shipping-instructions", { awaitingBL: true }],
    queryFn: () => api.get<SiOption[]>("/api/shipping-instructions?awaitingBL=true"),
  });

  return (
    <div>
      <PageHeader title="New Bill of Lading" description="Step 6 of the export workflow." />
      {isLoading || !sis ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CreateBLForm sis={sis} />
      )}
    </div>
  );
}

export default function NewBillOfLadingPage() {
  return (
    <AuthGuard>
      <NewBillOfLadingPageContent />
    </AuthGuard>
  );
}
