"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { addShipmentCommentAction } from "@/lib/actions/shipment-comments";

interface Comment {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { name: string };
}

export function ShipmentComments({
  shipmentId,
  comments,
}: {
  shipmentId: string;
  comments: Comment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [value, setValue] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const formData = new FormData();
    formData.set("body", value);
    startTransition(async () => {
      try {
        await addShipmentCommentAction(shipmentId, formData);
        setValue("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not post comment");
      }
    });
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet" description="Leave a note for your team." />
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <p className="font-medium">{c.author.name}</p>
              <p className="text-muted-foreground">{c.body}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a comment…"
          className="min-h-16"
        />
        <Button type="submit" size="icon" disabled={pending || !value.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
