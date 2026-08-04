"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // Cached data is already shown instantly; refetching on every
            // window/tab refocus just adds a network round-trip and a
            // flash of "loading" for data that's almost always still
            // fine within its 30s staleTime. This was a real source of
            // perceived lag when switching tabs and back.
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
