import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, type StatusConfig } from "@/lib/constants/statuses";

export function StatusBadge({
  config,
  className,
}: {
  config: StatusConfig;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE_CLASSES[config.tone], className)}
    >
      {config.label}
    </Badge>
  );
}
