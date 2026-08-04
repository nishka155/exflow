"use client";

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
                    "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5 font-medium text-foreground"
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
                  "flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110",
                  accent === a.value && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: a.swatch }}
                title={a.label}
              >
                {accent === a.value && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {ACCENTS.find((a) => a.value === accent)?.label} is applied across buttons, links, and highlights.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
