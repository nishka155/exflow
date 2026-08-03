"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Container,
  Clock,
  Ship,
  Send,
  DoorOpen,
  AlertTriangle,
  Boxes,
  ClipboardList,
  Anchor,
  PackageCheck,
  DollarSign,
  Bell,
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingsByStageChart } from "@/components/dashboard/bookings-by-stage-chart";
import { ExportCountryChart } from "@/components/dashboard/export-country-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AtRiskDispatchesCard } from "@/components/dashboard/at-risk-dispatches-card";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { roleCanAccess, type Role } from "@/lib/constants/roles";
import { QUICK_ACTIONS } from "@/lib/constants/quick-actions";
import type { DashboardData } from "@/types/dashboard";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function DashboardPageContent() {
  const role = useAuthStore((s) => s.user?.role) as Role | undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
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
        Could not load the dashboard. Please try again.
      </p>
    );
  }

  const { kpis, stageBreakdown, countryBreakdown, recentEvents, notifications, atRiskDispatches } =
    data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Executive overview of today's export operations."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 py-1">
          {QUICK_ACTIONS.filter((a) => !role || roleCanAccess(role, a.moduleKey)).map((action) => (
            <Button
              key={action.href}
              variant="outline"
              nativeButton={false}
              render={<Link href={action.href} />}
            >
              <action.icon />
              {action.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Bookings</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Bookings"
          value={kpis.activeBookings}
          icon={Boxes}
          href="/bookings"
        />
        <StatCard
          label="Booking Pending"
          value={kpis.bookingPending}
          icon={ClipboardList}
          href="/bookings"
        />
        <StatCard
          label="Bookings This Month"
          value={kpis.bookingsThisMonth}
          icon={Boxes}
          href="/bookings"
        />
        <StatCard
          label="Revenue (Completed)"
          value={currencyFormatter.format(kpis.revenue)}
          icon={DollarSign}
          href="/invoices"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Today's Dispatches"
          value={kpis.todaysDispatches}
          icon={Truck}
          href="/dispatches"
        />
        <StatCard
          label="Today's Stuffing"
          value={kpis.todaysStuffing}
          icon={Container}
          href="/stuffing"
        />
        <StatCard
          label="Containers Waiting"
          value={kpis.containersWaiting}
          icon={Clock}
          href="/stuffing"
        />
        <StatCard
          label="Gate In Pending"
          value={kpis.gateInPending}
          icon={DoorOpen}
          href="/gate-in"
        />
        <StatCard
          label="Pending SI"
          value={kpis.pendingSI}
          icon={Send}
          href="/shipping-instructions"
        />
        <StatCard label="Pending BL" value={kpis.pendingBL} icon={Ship} href="/bills-of-lading" />
        <StatCard label="SOB Pending" value={kpis.sobPending} icon={Anchor} href="/sob" />
        <StatCard
          label="Containers in Transit"
          value={kpis.containersInTransit}
          icon={Truck}
          href="/stuffing"
        />
        <StatCard
          label="Delivered Containers"
          value={kpis.deliveredContainers}
          icon={PackageCheck}
          href="/stuffing"
        />
        <StatCard
          label="Delayed Trucks"
          value={kpis.delayedTrucks}
          icon={AlertTriangle}
          tone={kpis.delayedTrucks > 0 ? "destructive" : "neutral"}
          href="/dispatches"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bookings by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingsByStageChart data={stageBreakdown} />
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

      <div className="mt-6">
        <AtRiskDispatchesCard dispatches={atRiskDispatches} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardPageContent />
  );
}
