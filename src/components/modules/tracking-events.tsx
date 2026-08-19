"use client";

import * as React from "react";
import { RefreshCw, MapPin, Ship as ShipIcon } from "lucide-react";
import { api } from "@/lib/api/client";

export interface TrackingEvent {
  eventTime: string;
  location?: string;
  eventType: string;
  vesselName?: string;
  voyageNumber?: string;
  isEstimate?: boolean;
  containerNumber?: string;
}

interface TrackingResponse {
  provider: "MAERSK" | "EVERGREEN" | "AKKON" | "HMM" | "HAPAG" | "MSC" | "CMA" | "NONE";
  events: TrackingEvent[];
  errorMessage?: string | null;
  fetchedAt: string;
}

export function TrackingEvents({ bookingId, className }: { bookingId: string; className?: string }) {
  const [data, setData] = React.useState<TrackingResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  async function load(force = false) {
    setError(null);
    setRefreshing(force);
    try {
      const res = await api.get<TrackingResponse>(
        `/api/bookings/${bookingId}/tracking${force ? "?refresh=1" : ""}`
      );
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => { void load(false); }, [bookingId]);

  if (loading) {
    return <div className={`text-sm text-muted-foreground ${className ?? ""}`}>Loading live tracking…</div>;
  }
  if (error) {
    return <div className={`text-sm text-destructive ${className ?? ""}`}>Live tracking failed: {error}</div>;
  }
  if (!data || data.provider === "NONE") {
    return (
      <div className={`text-sm text-muted-foreground ${className ?? ""}`}>
        Live tracking not available for this shipping line{data?.errorMessage ? ` (${data.errorMessage})` : ""}.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-primary">
            {data.provider}
          </span>
          <span className="text-muted-foreground">
            Last refreshed{" "}
            {new Date(data.fetchedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {data.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events reported yet{data.errorMessage ? ` (${data.errorMessage})` : ""}.
        </p>
      ) : (
        <ol className="space-y-3">
          {data.events.map((ev, idx) => (
            <li key={`${ev.eventTime}-${idx}`} className="flex gap-3 border-l-2 border-emerald-500/40 pl-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">{ev.eventType}</span>
                  {ev.isEstimate && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
                      Estimate
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    {ev.eventTime
                      ? new Date(ev.eventTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                      : "—"}
                  </span>
                  {ev.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ev.location}
                    </span>
                  )}
                  {ev.vesselName && (
                    <span className="inline-flex items-center gap-1">
                      <ShipIcon className="h-3 w-3" />
                      {ev.vesselName}
                      {ev.voyageNumber ? ` · ${ev.voyageNumber}` : ""}
                    </span>
                  )}
                  {ev.containerNumber && <span className="font-mono">{ev.containerNumber}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
