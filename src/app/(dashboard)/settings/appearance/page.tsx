"use client";

import type * as React from "react";
import { useTheme } from "next-themes";
import { Check, Laptop, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ACCENTS, useAccent } from "@/components/accent-provider";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Appearance</CardTitle>
        <CardDescription>Choose how ExFlow looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium">Theme</p>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = theme === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setTheme(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm transition-all",
                    active
                      ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] font-medium text-foreground shadow-[0_0_0_1px_var(--brand),0_4px_16px_-4px_var(--brand-glow)]"
                      : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="size-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Accent color</p>
          <div className="flex items-center gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-label={a.label}
                onClick={() => setAccent(a.value)}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-all hover:scale-110 hover:shadow-[0_0_14px_var(--swatch-glow)]",
                  accent === a.value &&
                    "scale-110 shadow-[0_0_14px_var(--swatch-glow)] ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{ background: a.swatch, "--swatch-glow": a.glow } as React.CSSProperties}
                title={a.label}
              >
                {accent === a.value && <Check className="size-4 text-white drop-shadow" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {ACCENTS.find((a) => a.value === accent)?.label} is applied across buttons, links, the sidebar, and highlights.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
