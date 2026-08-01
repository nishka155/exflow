"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";

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
import { api } from "@/lib/api/client";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationItem[]>("/api/notifications"),
  });

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  function handleClick(id: string) {
    api.post(`/api/notifications/${id}/read`).then(invalidate);
  }

  function handleMarkAll() {
    api.post("/api/notifications/read-all").then(invalidate);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between font-normal text-muted-foreground">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <BellOff className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-0.5 whitespace-normal"
                onClick={() => !n.isRead && handleClick(n.id)}
              >
                <span className="flex w-full items-center gap-2 font-medium">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-brand" />}
                  {n.title}
                </span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
