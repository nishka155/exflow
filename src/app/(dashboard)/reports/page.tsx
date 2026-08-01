"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportExcelButton } from "@/components/modules/export-excel-button";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface ReportsData {
  customers: { id: string; name: string; country: string | null; bookingCount: number; revenue: number }[];
  transporters: { id: string; name: string; totalDispatches: number; delayed: number; reachedFactory: number }[];
  delays: {
    id: string;
    truckNumber: string;
    expectedFactoryArrival: string;
    booking: { bookingNumber: string; customer: { name: string } };
    transporter: { name: string };
  }[];
  containerUtilization: { containerSize: string; count: number; avgGrossWeight: number; avgNetWeight: number }[];
  revenue: { month: string; total: number }[];
  exportCountries: { country: string; bookings: number; revenue: number }[];
}

function ReportsPageContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get<ReportsData>("/api/reports"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="py-16 text-center text-sm text-destructive">
        Could not load reports. Please try again.
      </p>
    );
  }

  const { customers, transporters, delays, containerUtilization: utilization, revenue, exportCountries: countries } = data;

  return (
    <div>
      <PageHeader title="Reports" description="Operational and financial reporting across every booking." />

      <Tabs defaultValue="customer">
        <TabsList>
          <TabsTrigger value="customer">Customers</TabsTrigger>
          <TabsTrigger value="transporter">Transporters</TabsTrigger>
          <TabsTrigger value="delay">Delays</TabsTrigger>
          <TabsTrigger value="container">Containers</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="country">Export Countries</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton data={customers} filename="customer-report" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Revenue (Completed)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell className="text-right">{c.bookingCount}</TableCell>
                    <TableCell className="text-right">{currency.format(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transporter" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton data={transporters} filename="transporter-performance" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transporter</TableHead>
                  <TableHead className="text-right">Total Dispatches</TableHead>
                  <TableHead className="text-right">Delayed</TableHead>
                  <TableHead className="text-right">Reached Factory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transporters.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right">{t.totalDispatches}</TableCell>
                    <TableCell className="text-right">{t.delayed}</TableCell>
                    <TableCell className="text-right">{t.reachedFactory}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="delay" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton
              data={delays.map((d) => ({
                truckNumber: d.truckNumber,
                booking: d.booking.bookingNumber,
                customer: d.booking.customer.name,
                transporter: d.transporter.name,
                expectedArrival: d.expectedFactoryArrival.slice(0, 10),
              }))}
              filename="delay-report"
            />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Expected Arrival</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delays.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.truckNumber}</TableCell>
                    <TableCell>{d.booking.bookingNumber}</TableCell>
                    <TableCell>{d.booking.customer.name}</TableCell>
                    <TableCell>{d.transporter.name}</TableCell>
                    <TableCell>
                      {new Date(d.expectedFactoryArrival).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="container" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton data={utilization} filename="container-utilization" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container Size</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Avg Gross Weight</TableHead>
                  <TableHead className="text-right">Avg Net Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilization.map((u) => (
                  <TableRow key={u.containerSize}>
                    <TableCell className="font-medium">{u.containerSize.replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{u.count}</TableCell>
                    <TableCell className="text-right">{u.avgGrossWeight.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{u.avgNetWeight.toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton data={revenue} filename="revenue-report" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenue.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium">{r.month}</TableCell>
                    <TableCell className="text-right">{currency.format(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="country" className="space-y-3">
          <div className="flex justify-end">
            <ExportExcelButton data={countries} filename="export-country-report" />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => (
                  <TableRow key={c.country}>
                    <TableCell className="font-medium">{c.country}</TableCell>
                    <TableCell className="text-right">{c.bookings}</TableCell>
                    <TableCell className="text-right">{currency.format(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthGuard>
      <ReportsPageContent />
    </AuthGuard>
  );
}
