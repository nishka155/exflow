import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICON_TONE_CLASSES = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "neutral" | "warning" | "destructive";
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-sm",
        tone === "destructive" && "border-destructive/30",
        tone === "warning" && "border-warning/30",
        className
      )}
    >
      <CardContent className="flex items-start justify-between gap-2 py-1">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive"
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              ICON_TONE_CLASSES[tone]
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
