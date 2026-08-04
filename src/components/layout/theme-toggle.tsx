"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, useAccent } from "@/components/accent-provider";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="shrink-0" />}>
        <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Appearance</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          {MODES.map((m) => (
            <DropdownMenuItem key={m.value} onClick={() => setTheme(m.value)} className="gap-2">
              <m.icon className="size-3.5" />
              {m.label}
              {theme === m.value && <Check className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Accent color</DropdownMenuLabel>
          <div className="flex items-center gap-2.5 px-1.5 py-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-label={a.label}
                title={a.label}
                onClick={() => setAccent(a.value)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-all hover:scale-110 hover:shadow-[0_0_10px_var(--swatch-glow)]",
                  accent === a.value && "scale-110 shadow-[0_0_10px_var(--swatch-glow)] ring-2 ring-offset-2 ring-offset-popover"
                )}
                style={{ background: a.swatch, "--swatch-glow": a.glow } as React.CSSProperties}
              >
                {accent === a.value && <Check className="size-3.5 text-white drop-shadow" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
