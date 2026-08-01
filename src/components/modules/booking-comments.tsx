"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { api, ApiError } from "@/lib/api/client";

interface Comment {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { name: string };
}

export function BookingComments({
  bookingId,
  comments,
}: {
  bookingId: string;
  comments: Comment[];
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState("");

  const mutation = useMutation({
    mutationFn: (body: string) => api.post(`/api/bookings/${bookingId}/comments`, { body }),
    onSuccess: () => {
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not post comment");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    mutation.mutate(value);
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
        <Button type="submit" size="icon" disabled={mutation.isPending || !value.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
