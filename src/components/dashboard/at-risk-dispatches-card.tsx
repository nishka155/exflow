import Link from "next/link";
import { ShieldCheck, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { AtRiskDispatch } from "@/types/dashboard";

export function AtRiskDispatchesCard({ dispatches }: { dispatches: AtRiskDispatch[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingDown className="size-4 text-warning" />
          Predicted Delay Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dispatches.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No bookings at risk"
            description="Every active dispatch is on track based on schedule and transporter history."
          />
        ) : (
          <ul className="divide-y">
            {dispatches.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/dispatches/${d.id}`} className="font-medium hover:underline">
                    {d.truckNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {d.bookingNumber} · {d.transporterName} · Expected{" "}
                    {new Date(d.expectedFactoryArrival).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="border-warning/40 text-warning">
                  {d.reason === "overdue"
                    ? "Overdue"
                    : `${Math.round(d.transporterDelayRate * 100)}% delay history`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
