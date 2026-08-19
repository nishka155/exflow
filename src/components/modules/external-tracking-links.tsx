"use client";

import { Copy, ExternalLink, Ship } from "lucide-react";
import { toast } from "sonner";
import { marineTrafficVesselUrl, carrierTrackingUrl, type CarrierLink } from "@/lib/external-tracking";

interface Props {
  vesselName?: string | null;
  shippingLine?: string | null;
  bookingNumber?: string | null;
  className?: string;
}

export function ExternalTrackingLinks({ vesselName, shippingLine, bookingNumber, className }: Props) {
  const mtUrl = marineTrafficVesselUrl(vesselName);
  const carrier = carrierTrackingUrl(shippingLine, { booking: bookingNumber });

  if (!mtUrl && !carrier) return null;

  async function handleCarrierClick(c: CarrierLink) {
    try {
      await navigator.clipboard.writeText(c.reference);
      toast.success(
        c.autoSearches
          ? `Opening ${c.carrier} — search runs automatically (${c.reference} also copied)`
          : `Opening ${c.carrier} — ${c.reference} copied, paste it on their page`
      );
    } catch {
      // clipboard requires HTTPS; ignore and still open the tab
    }
    window.open(c.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {mtUrl && (
        <a
          href={mtUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          <Ship className="h-4 w-4" />
          View vessel on MarineTraffic
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </a>
      )}
      {carrier && (
        <button
          type="button"
          onClick={() => void handleCarrierClick(carrier)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          title={
            carrier.autoSearches
              ? `Opens ${carrier.carrier} and runs the search automatically using ${carrier.reference}`
              : `Copies ${carrier.reference} and opens ${carrier.carrier}'s tracker — paste it there`
          }
        >
          <Copy className="h-4 w-4" />
          Track with {carrier.carrier}
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
