export interface AtRiskDispatch {
  id: string;
  truckNumber: string;
  bookingNumber: string;
  transporterName: string;
  expectedFactoryArrival: string;
  reason: "overdue" | "transporter_history";
  transporterDelayRate: number;
}

export interface DashboardEvent {
  id: string;
  bookingId: string;
  title: string;
  occurredAt: string;
  actor: { name: string } | null;
  booking: { bookingNumber: string };
}

export interface DashboardNotification {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  kpis: {
    activeBookings: number;
    bookingPending: number;
    todaysDispatches: number;
    todaysStuffing: number;
    containersWaiting: number;
    gateInPending: number;
    pendingSI: number;
    pendingBL: number;
    sobPending: number;
    containersInTransit: number;
    deliveredContainers: number;
    delayedTrucks: number;
    bookingsThisMonth: number;
    revenue: number;
  };
  stageBreakdown: { stage: string; count: number }[];
  countryBreakdown: { country: string; count: number }[];
  recentEvents: DashboardEvent[];
  notifications: DashboardNotification[];
  atRiskDispatches: AtRiskDispatch[];
}
