"use client";

import * as React from "react";

export const ACCENTS = [
  { value: "blue", label: "Blue", swatch: "oklch(0.541 0.204 268.9)" },
  { value: "green", label: "Green", swatch: "oklch(0.541 0.204 152)" },
  { value: "violet", label: "Violet", swatch: "oklch(0.541 0.204 300)" },
  { value: "rose", label: "Rose", swatch: "oklch(0.541 0.204 18)" },
  { value: "amber", label: "Amber", swatch: "oklch(0.541 0.204 75)" },
] as const;

export type Accent = (typeof ACCENTS)[number]["value"];

const STORAGE_KEY = "exflow-accent";
const DEFAULT_ACCENT: Accent = "blue";

const AccentContext = React.createContext<{
  accent: Accent;
  setAccent: (accent: Accent) => void;
} | null>(null);

export function AccentScript() {
  const script = `(function(){try{var a=localStorage.getItem("${STORAGE_KEY}");if(a)document.documentElement.setAttribute("data-accent",a);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = React.useState<Accent>(DEFAULT_ACCENT);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Accent | null;
    if (stored && ACCENTS.some((a) => a.value === stored)) {
      setAccentState(stored);
    }
  }, []);

  const setAccent = React.useCallback((next: Accent) => {
    setAccentState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-accent", next);
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>
  );
}

export function useAccent() {
  const ctx = React.useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within an AccentProvider");
  return ctx;
}
