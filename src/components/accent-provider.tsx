"use client";

import * as React from "react";

/** `swatch` is a two-stop gradient (for a bit of depth in the picker),
 *  `glow` is the flat color used for the hover/selected shadow. Both
 *  are derived from the same hue as the corresponding globals.css
 *  accent block, kept in sync by hand since one lives in CSS and the
 *  other needs a JS value for inline styles. */
export const ACCENTS = [
  {
    value: "blue",
    label: "Blue",
    swatch: "linear-gradient(135deg, oklch(0.64 0.19 268.9), oklch(0.44 0.21 268.9))",
    glow: "oklch(0.541 0.204 268.9)",
  },
  {
    value: "green",
    label: "Green",
    swatch: "linear-gradient(135deg, oklch(0.64 0.19 152), oklch(0.44 0.21 152))",
    glow: "oklch(0.541 0.204 152)",
  },
  {
    value: "violet",
    label: "Violet",
    swatch: "linear-gradient(135deg, oklch(0.64 0.19 300), oklch(0.44 0.21 300))",
    glow: "oklch(0.541 0.204 300)",
  },
  {
    value: "rose",
    label: "Rose",
    swatch: "linear-gradient(135deg, oklch(0.64 0.19 18), oklch(0.44 0.21 18))",
    glow: "oklch(0.541 0.204 18)",
  },
  {
    value: "amber",
    label: "Amber",
    swatch: "linear-gradient(135deg, oklch(0.64 0.19 75), oklch(0.44 0.21 75))",
    glow: "oklch(0.541 0.204 75)",
  },
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
