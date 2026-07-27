"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { setStuffingStatusAction, updateStuffingChecklistAction } from "@/lib/actions/stuffing";
import type { StuffingStatus } from "@/lib/constants/statuses";

export function StuffingStatusActions({
  stuffingId,
  status,
}: {
  stuffingId: string;
  status: StuffingStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run(next: StuffingStatus, message: string) {
    startTransition(async () => {
      try {
        await setStuffingStatusAction(stuffingId, next);
        toast.success(message);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "SCHEDULED" && (
        <Button disabled={pending} onClick={() => run("IN_PROGRESS", "Stuffing started")}>
          <PlayCircle />
          Start Stuffing
        </Button>
      )}
      {status === "IN_PROGRESS" && (
        <Button disabled={pending} onClick={() => run("COMPLETED", "Stuffing completed")}>
          <CheckCircle2 />
          Mark Completed
        </Button>
      )}
    </div>
  );
}

const CHECKLIST_ITEMS = [
  { name: "checklistContainerClean", label: "Container Clean" },
  { name: "checklistContainerDamage", label: "Container Damage" },
  { name: "checklistSealApplied", label: "Seal Applied" },
  { name: "checklistDocumentsUploaded", label: "Documents Uploaded" },
] as const;

export function StuffingChecklist({
  stuffingId,
  values,
}: {
  stuffingId: string;
  values: Record<(typeof CHECKLIST_ITEMS)[number]["name"], boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [checked, setChecked] = React.useState(values);

  function handleSave() {
    const formData = new FormData();
    for (const item of CHECKLIST_ITEMS) {
      if (checked[item.name]) formData.set(item.name, "on");
    }
    startTransition(async () => {
      try {
        await updateStuffingChecklistAction(stuffingId, formData);
        toast.success("Checklist updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <Checkbox
              id={item.name}
              checked={checked[item.name]}
              onCheckedChange={(v) =>
                setChecked((prev) => ({ ...prev, [item.name]: v === true }))
              }
            />
            <Label htmlFor={item.name} className="font-normal">
              {item.label}
            </Label>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" disabled={pending} onClick={handleSave}>
        {pending ? "Saving…" : "Save Checklist"}
      </Button>
    </div>
  );
}
