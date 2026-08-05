"use client";

import * as React from "react";

const STORAGE_KEY = "exflow-currency";
const DEFAULT_CURRENCY = "USD";

const CurrencyContext = React.createContext<{
  currency: string;
  setCurrency: (code: string) => void;
} | null>(null);

/** Which currency the "Revenue" figures on the dashboard are formatted in.
 *  Purely a display preference (no conversion happens — the underlying
 *  invoice totals are just relabeled), persisted per-browser the same way
 *  the accent color is. Organization-wide reporting currency is a natural
 *  follow-up if this ever needs to be shared across users/devices. */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState(() => {
    if (typeof window === "undefined") return DEFAULT_CURRENCY;
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_CURRENCY;
  });

  const setCurrency = React.useCallback((code: string) => {
    setCurrencyState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
