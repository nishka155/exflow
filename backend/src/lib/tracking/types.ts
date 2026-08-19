export interface TrackingEvent {
  eventTime: string;
  location?: string;
  eventType: string;
  vesselName?: string;
  voyageNumber?: string;
  isEstimate?: boolean;
  containerNumber?: string;
}

export interface TrackingResult {
  provider: "MAERSK" | "EVERGREEN" | "AKKON" | "HMM" | "HAPAG" | "MSC" | "CMA" | "NONE";
  events: TrackingEvent[];
  summary?: string;
  latestETA?: string;
  errorMessage?: string;
  raw?: unknown;
}
