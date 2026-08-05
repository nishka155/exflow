"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Container,
  Clock,
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
import { ColorStatCard, HeroStatCard } from "@/components/shared/color-stat-card";
import { CurrencySelect } from "@/components/shared/currency-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingsByStageChart } from "@/components/dashboard/bookings-by-stage-chart";
import { ExportCountryChart } from "@/components/dashboard/export-country-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AtRiskDispatchesCard } from "@/components/dashboard/at-risk-dispatches-card";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCurrency } from "@/components/currency-provider";
import { roleCanAccess, type Role } from "@/lib/constants/roles";
import { QUICK_ACTIONS } from "@/lib/constants/quick-actions";
import type { DashboardData } from "@/types/dashboard";

function DashboardPageContent() {
  const role = useAuthStore((s) => s.user?.role) as Role | undefined;
  const { currency, setCurrency } = useCurrency();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });

  const currencyFormatter = React.useMemo(() => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      });
    } catch {
      // Guards against a stale/invalid code ever ending up in
      // localStorage — falls back rather than crashing the dashboard.
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    }
  }, [currency]);

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

  const stageTotal = stageBreakdown.reduce((sum, s) => sum + s.count, 0);

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

      <div className="mb-3 flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Revenue currency</span>
        <CurrencySelect value={currency} onChange={setCurrency} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <HeroStatCard
          label="Active Bookings"
          value={kpis.activeBookings}
          subtitle="Booking pipeline, start to finish"
          icon={Boxes}
          href="/bookings"
          live
        />
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
          <ColorStatCard
            label="Booking Pending"
            value={kpis.bookingPending}
            icon={ClipboardList}
            color="amber"
            href="/bookings"
          />
          <ColorStatCard
            label="Bookings This Month"
            value={kpis.bookingsThisMonth}
            icon={Boxes}
            color="indigo"
            href="/bookings"
          />
          <ColorStatCard
            label="Revenue (Completed)"
            value={currencyFormatter.format(kpis.revenue)}
            icon={DollarSign}
            color="emerald"
            href="/invoices"
          />
        </div>
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Today&apos;s Pipeline</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ColorStatCard
          label="Today's Dispatches"
          value={kpis.todaysDispatches}
          icon={Truck}
          color="sky"
          href="/dispatches"
        />
        <ColorStatCard
          label="Today's Stuffing"
          value={kpis.todaysStuffing}
          icon={Container}
          color="teal"
          href="/stuffing"
        />
        <ColorStatCard
          label="Containers Waiting"
          value={kpis.containersWaiting}
          icon={Clock}
          color="amber"
          href="/stuffing"
        />
        <ColorStatCard
          label="Gate In Pending"
          value={kpis.gateInPending}
          icon={DoorOpen}
          color="orange"
          href="/gate-in"
        />
        <ColorStatCard
          label="Pending SI"
          value={kpis.pendingSI}
          icon={Send}
          color="violet"
          href="/shipping-instructions"
        />
        <ColorStatCard
          label="SOB Pending"
          value={kpis.sobPending}
          icon={Anchor}
          color="indigo"
          href="/sob"
        />
        <ColorStatCard
          label="Containers in Transit"
          value={kpis.containersInTransit}
          icon={Truck}
          color="sky"
          href="/stuffing"
        />
        <ColorStatCard
          label="Delivered Containers"
          value={kpis.deliveredContainers}
          icon={PackageCheck}
          color="emerald"
          href="/stuffing"
        />
        <ColorStatCard
          label="Delayed Trucks"
          value={kpis.delayedTrucks}
          icon={AlertTriangle}
          color={kpis.delayedTrucks > 0 ? "rose" : "slate"}
          href="/dispatches"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-sm font-medium">Bookings by Stage</CardTitle>
              <span className="text-xs text-muted-foreground">{stageTotal} total</span>
            </div>
          </CardHeader>
          <CardContent>
            <BookingsByStageChart data={stageBreakdown} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-sm font-medium">Export Countries</CardTitle>
              <span className="text-xs text-muted-foreground">
                {countryBreakdown.length} {countryBreakdown.length === 1 ? "country" : "countries"}
              </span>
            </div>
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
