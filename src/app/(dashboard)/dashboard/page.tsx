import {
  Truck,
  Container,
  Clock,
  Ship,
  Send,
  DoorOpen,
  AlertTriangle,
  Boxes,
  DollarSign,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Bell } from "lucide-react";
import { ShipmentsByStageChart } from "@/components/dashboard/shipments-by-stage-chart";
import { ExportCountryChart } from "@/components/dashboard/export-country-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDashboardData } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { kpis, stageBreakdown, countryBreakdown, recentEvents } =
    await getDashboardData(user.organizationId);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Executive overview of today's export operations."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Today's Dispatches" value={kpis.todaysDispatches} icon={Truck} />
        <StatCard label="Today's Stuffing" value={kpis.todaysStuffing} icon={Container} />
        <StatCard label="Containers Waiting" value={kpis.containersWaiting} icon={Clock} />
        <StatCard label="Gate In Pending" value={kpis.gateInPending} icon={DoorOpen} />
        <StatCard label="Pending SI" value={kpis.pendingSI} icon={Send} />
        <StatCard label="Pending BL" value={kpis.pendingBL} icon={Ship} />
        <StatCard
          label="Delayed Trucks"
          value={kpis.delayedTrucks}
          icon={AlertTriangle}
          tone={kpis.delayedTrucks > 0 ? "destructive" : "neutral"}
        />
        <StatCard label="Shipments This Month" value={kpis.shipmentsThisMonth} icon={Boxes} />
        <StatCard
          label="Revenue (Completed)"
          value={currencyFormatter.format(kpis.revenue)}
          icon={DollarSign}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Shipments by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ShipmentsByStageChart data={stageBreakdown} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Export Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {countryBreakdown.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No invoices yet.
              </p>
            ) : (
              <ExportCountryChart data={countryBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity events={recentEvents} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Alerts for delays, missing documents, and pending approvals will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/40" : "bg-destructive"}`}
                    />
                    <div>
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="text-muted-foreground">{n.body}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
