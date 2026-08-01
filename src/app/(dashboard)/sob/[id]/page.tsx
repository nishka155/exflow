"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { SOB_STATUS_CONFIG, type SobStatus } from "@/lib/constants/statuses";

interface SobDetail {
  id: string;
  vessel: string | null;
  shippingLine: string | null;
  sobDate: string | null;
  remarks: string | null;
  status: string;
  bookingId: string;
  booking: { bookingNumber: string; customer: { name: string } };
  billOfLading: { blNumber: string | null };
}

function SobDetailPageContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const { data: sob, isLoading } = useQuery({
    queryKey: ["sob", params.id],
    queryFn: () => api.get<SobDetail>(`/api/sob/${params.id}`),
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(`/api/sob/${params.id}/complete`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sob", params.id] });
      queryClient.invalidateQueries({ queryKey: ["sob"] });
      toast.success("Marked shipped on board");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      vessel: formData.get("vessel") || undefined,
      shippingLine: formData.get("shippingLine") || undefined,
      sobDate: formData.get("sobDate") || undefined,
      remarks: formData.get("remarks") || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sob) {
    return <p className="py-16 text-center text-sm text-destructive">SOB record not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={sob.booking.bookingNumber}
        description={sob.booking.customer.name}
        actions={<StatusBadge config={SOB_STATUS_CONFIG[sob.status as SobStatus]} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {sob.status === "COMPLETED" ? "Shipped on Board" : "Confirm Shipped on Board"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vessel">Vessel</Label>
              <Input
                id="vessel"
                name="vessel"
                defaultValue={sob.vessel ?? ""}
                disabled={sob.status === "COMPLETED"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingLine">Shipping Line</Label>
              <Input
                id="shippingLine"
                name="shippingLine"
                defaultValue={sob.shippingLine ?? ""}
                disabled={sob.status === "COMPLETED"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sobDate">SOB Date</Label>
              <Input
                id="sobDate"
                name="sobDate"
                type="date"
                defaultValue={sob.sobDate ? sob.sobDate.slice(0, 10) : ""}
                disabled={sob.status === "COMPLETED"}
              />
            </div>
            <div className="space-y-2">
              <Label>Bill of Lading</Label>
              <Link
                href={`/bills-of-lading`}
                className="block text-sm text-brand hover:underline"
              >
                {sob.billOfLading.blNumber ?? "View BL"}
              </Link>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                name="remarks"
                defaultValue={sob.remarks ?? ""}
                disabled={sob.status === "COMPLETED"}
              />
            </div>

            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

            {sob.status !== "COMPLETED" && (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Mark Shipped on Board"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SobDetailPage() {
  return (
    <AuthGuard>
      <SobDetailPageContent />
    </AuthGuard>
  );
}
