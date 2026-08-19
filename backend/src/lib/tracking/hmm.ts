import type { TrackingEvent, TrackingResult } from "./types";

const EVENTS_URL = "https://apigw.hmm21.com/gateway/trackAndTrace/v1/events";

interface HmmEvent {
  eventDateTime?: string;
  eventCreatedDateTime?: string;
  eventClassifierCode?: string;
  eventType?: string;
  transportEventTypeCode?: string;
  shipmentEventTypeCode?: string;
  equipmentEventTypeCode?: string;
  eventLocation?: { locationName?: string; UNLocationCode?: string };
  location?: { locationName?: string; UNLocationCode?: string };
  vesselName?: string;
  carrierVoyageNumber?: string;
  equipmentReference?: string;
}

export async function fetchHmmEvents(reference: string): Promise<TrackingResult> {
  const hmmApiKey = process.env.HMM_API_KEY;
  if (!hmmApiKey) {
    return { provider: "NONE", events: [], errorMessage: "HMM credentials not configured" };
  }

  const isContainer = /^[A-Z]{4}\d{7}$/.test(reference);
  const candidates = isContainer
    ? [`?equipmentReference=${encodeURIComponent(reference)}`]
    : [
        `?transportDocumentReference=${encodeURIComponent(reference)}`,
        `?carrierBookingReference=${encodeURIComponent(reference)}`,
      ];

  try {
    for (const qs of candidates) {
      const res = await fetch(`${EVENTS_URL}${qs}`, {
        headers: { "x-Gateway-APIKey": hmmApiKey, Accept: "application/json" },
      });
      if (res.status === 404) continue;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { provider: "HMM", events: [], errorMessage: `HMM events ${res.status} ${text.slice(0, 200)}` };
      }
      const body = (await res.json()) as { events?: HmmEvent[] } | HmmEvent[];
      const rows = Array.isArray(body) ? body : body.events ?? [];
      return { provider: "HMM", events: normaliseHmm(rows), raw: body };
    }
    return { provider: "HMM", events: [], errorMessage: "HMM: no events for this reference" };
  } catch (e) {
    return { provider: "HMM", events: [], errorMessage: `HMM fetch failed: ${(e as Error).message}` };
  }
}

function normaliseHmm(rows: HmmEvent[]): TrackingEvent[] {
  return rows
    .map<TrackingEvent>((m) => {
      const loc = m.eventLocation ?? m.location ?? {};
      const type = m.eventType ?? m.transportEventTypeCode ?? m.equipmentEventTypeCode ?? m.shipmentEventTypeCode ?? "Event";
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
