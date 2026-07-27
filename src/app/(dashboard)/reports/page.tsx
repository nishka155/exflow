import { redirect } from "next/navigation";
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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getCustomerReport,
  getTransporterReport,
  getDelayReport,
  getContainerUtilizationReport,
  getRevenueReport,
  getExportCountryReport,
} from "@/lib/queries/reports";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [customers, transporters, delays, utilization, revenue, countries] = await Promise.all([
    getCustomerReport(user.organizationId),
    getTransporterReport(user.organizationId),
    getDelayReport(user.organizationId),
    getContainerUtilizationReport(user.organizationId),
    getRevenueReport(user.organizationId),
    getExportCountryReport(user.organizationId),
  ]);

  return (
    <div>
      <PageHeader title="Reports" description="Operational and financial reporting across every shipment." />

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
                  <TableHead className="text-right">Shipments</TableHead>
                  <TableHead className="text-right">Revenue (Completed)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell className="text-right">{c.shipmentCount}</TableCell>
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
                shipment: d.shipment.shipmentNumber,
                customer: d.shipment.customer.name,
                transporter: d.transporter.name,
                expectedArrival: d.expectedFactoryArrival.toISOString().slice(0, 10),
              }))}
              filename="delay-report"
            />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck</TableHead>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Expected Arrival</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delays.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.truckNumber}</TableCell>
                    <TableCell>{d.shipment.shipmentNumber}</TableCell>
                    <TableCell>{d.shipment.customer.name}</TableCell>
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
                  <TableHead className="text-right">Shipments</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => (
                  <TableRow key={c.country}>
                    <TableCell className="font-medium">{c.country}</TableCell>
                    <TableCell className="text-right">{c.shipments}</TableCell>
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
