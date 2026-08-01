"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

interface CustomerRecord {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  country: string;
  gstNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export function CustomerForm({ customer }: { customer?: CustomerRecord }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (customer) return api.put<CustomerRecord>(`/api/customers/${customer.id}`, payload);
      return api.post<CustomerRecord>("/api/customers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      router.push("/customers");
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
      name: formData.get("name"),
      code: formData.get("code") || undefined,
      address: formData.get("address") || undefined,
      city: formData.get("city") || undefined,
      country: formData.get("country"),
      gstNumber: formData.get("gstNumber") || undefined,
      contactPerson: formData.get("contactPerson") || undefined,
      contactEmail: formData.get("contactEmail") || undefined,
      contactPhone: formData.get("contactPhone") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required defaultValue={customer?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Customer Code</Label>
            <Input id="code" name="code" defaultValue={customer?.code ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required defaultValue={customer?.country ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST / Tax Number</Label>
            <Input id="gstNumber" name="gstNumber" defaultValue={customer?.gstNumber ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={customer?.contactPerson ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={customer?.contactPhone ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={customer?.contactEmail ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : customer ? "Save Changes" : "Create Customer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
