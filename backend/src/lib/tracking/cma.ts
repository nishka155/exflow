import type { TrackingEvent, TrackingResult } from "./types";

const BASE_URL = "https://apis.cma-cgm.net/operation/trackandtrace/v1";

interface DcsaLocation { locationName?: string; UNLocationCode?: string }
interface DcsaVessel { vesselName?: string }
interface DcsaTransportCall { exportVoyageNumber?: string; importVoyageNumber?: string; UNLocationCode?: string; location?: DcsaLocation; vessel?: DcsaVessel; modeOfTransport?: string }
interface DcsaCarrierSpecificData { internalEventLabel?: string; shipmentLocationType?: string }
interface DcsaEquipmentEvent { eventType: "EQUIPMENT"; eventDateTime?: string; eventClassifierCode?: "ACT" | "PLN" | "EST"; equipmentEventTypeCode?: string; equipmentReference?: string; transportCall?: DcsaTransportCall; eventLocation?: DcsaLocation; carrierSpecificData?: DcsaCarrierSpecificData }
interface DcsaTransportEvent { eventType: "TRANSPORT"; eventDateTime?: string; eventClassifierCode?: "ACT" | "PLN" | "EST"; transportEventTypeCode?: "ARRI" | "DEPA"; transportCall?: DcsaTransportCall; carrierSpecificData?: DcsaCarrierSpecificData }
type DcsaEvent = DcsaEquipmentEvent | DcsaTransportEvent | { eventType: "SHIPMENT" };

const EQUIP_LABELS: Record<string, string> = {
  LOAD: "Loaded on vessel", DISC: "Discharged", GTIN: "Gate in", GTOT: "Gate out",
  STUF: "Stuffed", STRP: "Stripped", PICK: "Pick-up", DROP: "Drop-off",
  INSP: "Inspected", RSEA: "Resealed", RMVD: "Removed",
};
const CLASSIFIER_SUFFIX: Record<string, string> = { PLN: " (Planned)", EST: " (Estimated)", ACT: "" };

function equipLabel(code: string | undefined, classifier: string | undefined) {
  return ((code && EQUIP_LABELS[code]) ?? code ?? "Equipment event") + (CLASSIFIER_SUFFIX[classifier ?? ""] ?? "");
}
function transportLabel(typeCode: string | undefined, classifier: string | undefined) {
  const base = typeCode === "ARRI" ? "Vessel arrived" : typeCode === "DEPA" ? "Vessel departed" : "Transport event";
  return base + (CLASSIFIER_SUFFIX[classifier ?? ""] ?? "");
}
function resolveLocation(tc?: DcsaTransportCall, eventLoc?: DcsaLocation): string | undefined {
  return tc?.location?.locationName ?? eventLoc?.locationName ?? tc?.location?.UNLocationCode ?? tc?.UNLocationCode ?? eventLoc?.UNLocationCode;
}

export async function fetchCmaEventsViaScraper(reference: string): Promise<TrackingResult> {
  const apiKey = process.env.CMA_CGM_API_KEY;
  if (!apiKey) return { provider: "CMA", events: [], errorMessage: "CMA_CGM_API_KEY not configured" };
  const ref = reference.trim();
  if (!ref) return { provider: "CMA", events: [], errorMessage: "empty reference" };

  let raw: DcsaEvent[];
  try {
    const url = `${BASE_URL}/events/${encodeURIComponent(ref)}?limit=200`;
    const res = await fetch(url, { headers: { keyId: apiKey, Accept: "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { provider: "CMA", events: [], errorMessage: `CMA API error ${res.status}: ${body.slice(0, 200)}` };
    }
    raw = (await res.json()) as DcsaEvent[];
  } catch (e) {
    return { provider: "CMA", events: [], errorMessage: `CMA API request failed: ${(e as Error).message}` };
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { provider: "CMA", events: [], errorMessage: "No events returned from CMA API" };
  }

  const events: TrackingEvent[] = [];
  const etaCandidates: string[] = [];
  for (const ev of raw) {
    if (ev.eventType === "SHIPMENT") continue;
    if (ev.eventType === "EQUIPMENT") {
      events.push({
        eventTime: ev.eventDateTime ?? "",
        eventType: equipLabel(ev.equipmentEventTypeCode, ev.eventClassifierCode),
        location: resolveLocation(ev.transportCall, ev.eventLocation),
        vesselName: ev.transportCall?.vessel?.vesselName,
        voyageNumber: ev.transportCall?.exportVoyageNumber ?? ev.transportCall?.importVoyageNumber,
        containerNumber: ev.equipmentReference,
      });
    } else if (ev.eventType === "TRANSPORT") {
      events.push({
        eventTime: ev.eventDateTime ?? "",
        eventType: transportLabel(ev.transportEventTypeCode, ev.eventClassifierCode),
        location: resolveLocation(ev.transportCall),
        vesselName: ev.transportCall?.vessel?.vesselName,
        voyageNumber: ev.transportCall?.exportVoyageNumber ?? ev.transportCall?.importVoyageNumber,
      });
      if (ev.transportEventTypeCode === "ARRI" && (ev.eventClassifierCode === "PLN" || ev.eventClassifierCode === "EST") && ev.eventDateTime && ev.carrierSpecificData?.shipmentLocationType === "POD") {
        etaCandidates.push(ev.eventDateTime);
      }
    }
  }
  events.sort((a, b) => (a.eventTime > b.eventTime ? 1 : -1));
  etaCandidates.sort();
  const latestEvent = [...events].reverse().find((e) => e.eventTime);
  return { provider: "CMA", events, latestETA: etaCandidates[0], summary: latestEvent?.eventType };
}
