"use client";

import * as React from "react";
import { Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

interface AcceptInviteResponse {
  token: string;
  user: { id: string; organizationId: string; email: string; name: string; role: string };
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (password: string) =>
      api.post<AcceptInviteResponse>("/api/auth/accept-invite", { token, password }),
    onSuccess: async (data, password) => {
      setAuth(data.token, data.user);
      await fetch("/api/auth/bridge-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.user.email, password }),
      });
      router.push(data.user.role === "CUSTOMER" ? "/portal" : "/dashboard");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invite link</CardTitle>
          <CardDescription>
            This invite link is missing or invalid. Ask whoever invited you to send a new one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    mutation.mutate(String(formData.get("password") ?? ""));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>Choose a password to activate your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Activate account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}
