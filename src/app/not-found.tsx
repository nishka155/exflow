import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Compass className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
