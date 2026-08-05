import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatColor =
  | "sky"
  | "blue"
  | "teal"
  | "amber"
  | "orange"
  | "rose"
  | "violet"
  | "emerald"
  | "indigo"
  | "slate";

const COLOR_CLASSES: Record<StatColor, string> = {
  sky: "bg-sky-500",
  blue: "bg-blue-600",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  slate: "bg-slate-500",
};

/** A large, solid-color tile in the cargoflow style: icon badge, big number,
 *  caps label, "View all" link — decorative faint circles in the corner.
 *  Used for the dashboard's at-a-glance KPI grid instead of many small
 *  monochrome cards, so the page reads at a glance instead of as a wall of
 *  identical stat boxes. */
export function ColorStatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color: StatColor;
  href?: string;
  className?: string;
}) {
  const card = (
    <Card
      className={cn(
        "relative overflow-hidden border-0 py-4 text-white shadow-md transition-transform hover:-translate-y-0.5",
        COLOR_CLASSES[color],
        className
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -top-5 -right-5 size-24 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute top-9 -right-9 size-16 rounded-full bg-white/10" />
      <CardContent className="relative z-10 flex flex-col gap-3 py-0">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <p className="text-3xl leading-none font-bold tabular-nums">{value}</p>
          <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-white/85 uppercase">
            {label}
          </p>
        </div>
        {href && (
          <span className="flex items-center gap-1 text-xs font-medium text-white/80">
            View all
            <ArrowRight className="size-3" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block rounded-xl">
      {card}
    </Link>
  );
}

/** The oversized "hero" tile — always dark regardless of theme, so it reads
 *  as the dashboard's anchor point the same way in light or dark mode. */
export function HeroStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  href,
  live,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  href?: string;
  live?: boolean;
}) {
  const card = (
    <Card className="relative h-full overflow-hidden border-0 bg-neutral-900 py-6 text-white shadow-md">
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute top-16 -right-16 size-28 rounded-full bg-white/5" />
      <CardContent className="relative z-10 flex h-full flex-col justify-between gap-6 py-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Icon className="size-4" />
            </div>
          )}
          <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">
            {label}
          </span>
          {live && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>
        <div>
          <p className="text-5xl leading-none font-bold tabular-nums">{value}</p>
          {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
        </div>
        {href && (
          <span className="flex items-center gap-1 text-sm font-medium text-white/80">
            View all active
            <ArrowRight className="size-3.5" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block h-full rounded-xl">
      {card}
    </Link>
  );
}
