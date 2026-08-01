import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardEvent } from "@/types/dashboard";

export function RecentActivity({
  events,
}: {
  events: DashboardEvent[];
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Timeline events from invoices, dispatches, and stuffing will show up here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3">
          <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm leading-snug">
              <Link
                href={`/bookings/${event.bookingId}`}
                className="font-medium hover:underline"
              >
                {event.booking.bookingNumber}
              </Link>{" "}
              <span className="text-muted-foreground">— {event.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {event.actor?.name ?? "System"} ·{" "}
              {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
