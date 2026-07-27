import Link from "next/link";
import { Plus, Users } from "lucide-react";

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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
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

      {customers.length === 0 ? (
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
