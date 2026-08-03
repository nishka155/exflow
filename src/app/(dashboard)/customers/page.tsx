"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/shared/clickable-table-row";
import { api } from "@/lib/api/client";

interface CustomerListItem {
  id: string;
  name: string;
  country: string;
  contactPerson: string | null;
  contactEmail: string | null;
}

function CustomersPageContent() {
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<CustomerListItem[]>("/api/customers"),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Buyer companies you export to."
        actions={
          <Button nativeButton={false} render={<Link href="/customers/new" />}>
            <Plus />
            New Customer
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load customers. Please try again.
        </p>
      ) : !customers || customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add a customer before creating your first invoice."
          action={
            <Button nativeButton={false} render={<Link href="/customers/new" />}>
              <Plus />
              New Customer
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <ClickableTableRow key={c.id} href={`/customers/${c.id}/edit`}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.country}</TableCell>
                  <TableCell>{c.contactPerson ?? "—"}</TableCell>
                  <TableCell>{c.contactEmail ?? "—"}</TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <CustomersPageContent />
  );
}
