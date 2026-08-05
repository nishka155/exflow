"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Truck, Container, DoorOpen, AlertTriangle, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ColorStatCard } from "@/components/shared/color-stat-card";
import { AtRiskDispatchesCard } from "@/components/dashboard/at-risk-dispatches-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import {
  DISPATCH_STATUS_CONFIG,
  STUFFING_STATUS_CONFIG,
  GATE_IN_STATUS_CONFIG,
  type DispatchStatus,
  type StuffingStatus,
  type GateInStatus,
} from "@/lib/constants/statuses";
import type { AtRiskDispatch } from "@/types/dashboard";

interface DebriefTruck {
  id: string;
  truckNumber: string;
  driverName: string;
  driverMobile: string;
  transporterName: string;
  expectedFactoryArrival: string;
  status: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
}

interface DebriefStuffing {
  id: string;
  containerNumber: string;
  status: string;
  stuffingStartTime: string | null;
  pol: string;
  pod: string;
  transporterName: string | null;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
}

interface DebriefGateIn {
  id: string;
  containerNumber: string;
  terminal: string;
  status: string;
  gateInDate: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
}

interface DebriefData {
  date: string;
  trucksToday: DebriefTruck[];
  stuffingPendingToday: DebriefStuffing[];
  gateInsToday: DebriefGateIn[];
  atRiskDispatches: AtRiskDispatch[];
}

function timeLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DebriefPageContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["debrief"],
    queryFn: () => api.get<DebriefData>("/api/debrief"),
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
        Could not load today&apos;s debrief. Please try again.
      </p>
    );
  }

  const todayLabel = new Date(data.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Debrief"
        description={`Today's operational snapshot — ${todayLabel}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Trucks Expected Today"
          value={data.trucksToday.length}
          icon={Truck}
          color="sky"
        />
        <ColorStatCard
          label="Stuffing Pending Today"
          value={data.stuffingPendingToday.length}
          icon={Container}
          color="teal"
        />
        <ColorStatCard
          label="Gate-Ins Today"
          value={data.gateInsToday.length}
          icon={DoorOpen}
          color="amber"
        />
        <ColorStatCard
          label="At Risk Dispatches"
          value={data.atRiskDispatches.length}
          icon={AlertTriangle}
          color={data.atRiskDispatches.length > 0 ? "rose" : "slate"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trucks Expected Today</CardTitle>
          </CardHeader>
          <CardContent>
            {data.trucksToday.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No trucks expected today"
                description="Nothing scheduled to reach the factory today."
              />
            ) : (
              <ul className="divide-y">
                {data.trucksToday.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link href={`/dispatches/${t.id}`} className="font-medium hover:underline">
                        {t.truckNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {t.bookingNumber} · {t.customerName} · {t.transporterName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expected {timeLabel(t.expectedFactoryArrival)} · Driver {t.driverName}
                      </p>
                    </div>
                    <StatusBadge config={DISPATCH_STATUS_CONFIG[t.status as DispatchStatus]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Factory Stuffing Pending Today</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stuffingPendingToday.length === 0 ? (
              <EmptyState
                icon={Container}
                title="Nothing pending"
                description="No containers are scheduled for stuffing today, or all of today's are done."
              />
            ) : (
              <ul className="divide-y">
                {data.stuffingPendingToday.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link
                        href={`/bookings/${s.bookingId}`}
                        className="font-medium hover:underline"
                      >
                        {s.containerNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {s.bookingNumber} · {s.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.pol} → {s.pod} · {timeLabel(s.stuffingStartTime)}
                      </p>
                    </div>
                    <StatusBadge config={STUFFING_STATUS_CONFIG[s.status as StuffingStatus]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gate-Ins Today</CardTitle>
          </CardHeader>
          <CardContent>
            {data.gateInsToday.length === 0 ? (
              <EmptyState
                icon={DoorOpen}
                title="No gate-ins today"
                description="No containers are due at the terminal gate today."
              />
            ) : (
              <ul className="divide-y">
                {data.gateInsToday.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link href={`/gate-in/${g.id}`} className="font-medium hover:underline">
                        {g.containerNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {g.bookingNumber} · {g.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.terminal} · {timeLabel(g.gateInDate)}
                      </p>
                    </div>
                    <StatusBadge config={GATE_IN_STATUS_CONFIG[g.status as GateInStatus]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AtRiskDispatchesCard dispatches={data.atRiskDispatches} />
      </div>
    </div>
  );
}

export default function DebriefPage() {
  return (
    <DebriefPageContent />
  );
}
