import type { TrackingEvent, TrackingResult } from "./types";

const TOKEN_URL = "https://api.maersk.com/customer-identity/oauth/v2/access_token";
const EVENTS_URLS = [
  "https://api.maersk.com/track-and-trace-private/events",
  "https://api.maersk.com/track-and-trace/v1/events",
  "https://api.maersk.com/dcsa-track-trace/v2/events",
  "https://api.maersk.com/ocean-track-trace/v1/events",
];

interface CachedToken { token: string; expiresAt: number }
let tokenCache: CachedToken | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.MAERSK_CLIENT_ID;
  const clientSecret = process.env.MAERSK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) return tokenCache.token;
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Consumer-Key": clientId, "Cache-Control": "no-cache" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Maersk OAuth failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlSec = Number(json.expires_in ?? 3600);
  tokenCache = { token: json.access_token, expiresAt: now + ttlSec * 1000 };
  return json.access_token;
}

interface MaerskEvent {
  eventDateTime?: string;
  eventCreatedDateTime?: string;
  eventClassifierCode?: string;
  eventType?: string;
  transportEventTypeCode?: string;
  shipmentEventTypeCode?: string;
  eventLocation?: { locationName?: string; UNLocationCode?: string };
  location?: { locationName?: string; UNLocationCode?: string };
  vesselName?: string;
  carrierVoyageNumber?: string;
  equipmentReference?: string;
}

export interface MaerskReferenceSet {
  bookingNumber?: string;
  containers?: string[];
}

export async function fetchMaerskEvents(reference: string | MaerskReferenceSet): Promise<TrackingResult> {
  const clientId = process.env.MAERSK_CLIENT_ID;
  const clientSecret = process.env.MAERSK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { provider: "NONE", events: [], errorMessage: "maersk credentials not configured" };
  }
  try {
    const token = await getAccessToken();
    if (!token) return { provider: "NONE", events: [], errorMessage: "no maersk token" };

    const candidates: string[] = [];
    if (typeof reference === "string") {
      const isContainer = /^[A-Z]{4}\d{7}$/.test(reference);
      if (isContainer) {
        candidates.push(`?equipmentReference=${encodeURIComponent(reference)}`);
      } else {
        candidates.push(
          `?transportDocumentReference=${encodeURIComponent(reference)}`,
          `?carrierBookingReference=${encodeURIComponent(reference)}`
        );
      }
    } else {
      if (reference.bookingNumber) {
        candidates.push(`?carrierBookingReference=${encodeURIComponent(reference.bookingNumber)}`);
      }
      for (const c of reference.containers ?? []) {
        if (/^[A-Z]{4}\d{7}$/.test(c)) {
          candidates.push(`?equipmentReference=${encodeURIComponent(c)}`);
        }
      }
    }
    if (candidates.length === 0) {
      return { provider: "MAERSK", events: [], errorMessage: "Maersk: no queryable reference on the booking" };
    }

    const authVariants: { name: string; headers: Record<string, string> }[] = [
      { name: "bearer+key", headers: { Authorization: `Bearer ${token}`, "Consumer-Key": clientId } },
      { name: "key-only", headers: { "Consumer-Key": clientId } },
    ];

    const tried: string[] = [];
    for (const base of EVENTS_URLS) {
      for (const qs of candidates) {
        const url = `${base}${qs}`;
        for (const variant of authVariants) {
          const res = await fetch(url, { headers: variant.headers });
          if (res.status === 200) {
            const body = (await res.json()) as { events?: MaerskEvent[] } | MaerskEvent[];
            const raw = Array.isArray(body) ? body : body.events ?? [];
            return { provider: "MAERSK", events: normaliseMaersk(raw), raw: body };
          }
          tried.push(`${res.status} ${base} [${variant.name}]`);
          if (res.status !== 404 && res.status !== 401) {
            const text = await res.text().catch(() => "");
            return { provider: "MAERSK", events: [], errorMessage: `Maersk events ${res.status} at ${base} [${variant.name}] — ${text.slice(0, 160)}` };
          }
        }
      }
    }
    const grouped = new Map<string, number>();
    for (const line of tried) grouped.set(line, (grouped.get(line) ?? 0) + 1);
    const summary = Array.from(grouped.entries()).map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).slice(0, 40).join(" | ");
    return { provider: "MAERSK", events: [], errorMessage: `Maersk: 0 events across ${tried.length} attempts. Summary: ${summary}` };
  } catch (e) {
    return { provider: "MAERSK", events: [], errorMessage: (e as Error).message };
  }
}

function normaliseMaersk(rows: MaerskEvent[]): TrackingEvent[] {
  return rows
    .map<TrackingEvent>((m) => {
      const loc = m.eventLocation ?? m.location ?? {};
      const type = m.eventType ?? m.transportEventTypeCode ?? m.shipmentEventTypeCode ?? "Event";
      return {
        eventTime: m.eventDateTime ?? m.eventCreatedDateTime ?? "",
        location: loc.locationName ?? loc.UNLocationCode,
        eventType: type,
        vesselName: m.vesselName,
        voyageNumber: m.carrierVoyageNumber,
        isEstimate: m.eventClassifierCode === "EST" || m.eventClassifierCode === "PLN",
        containerNumber: m.equipmentReference,
      };
    })
    .filter((e) => !!e.eventTime)
    .sort((a, b) => (a.eventTime > b.eventTime ? 1 : -1));
}
