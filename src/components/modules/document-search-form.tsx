"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "INVOICE",
  "PACKING_LIST",
  "BILL_OF_LADING",
  "SHIPPING_INSTRUCTION",
  "LR_COPY",
  "GR_COPY",
  "GATE_PASS",
  "PHOTO",
  "VIDEO",
  "CERTIFICATE",
  "STUFFING_REPORT",
  "OTHER",
];

export function DocumentSearchForm({
  defaultSearch,
  defaultCategory,
}: {
  defaultSearch: string;
  defaultCategory: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(defaultSearch);

  function updateParams(next: { q?: string; category?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? search;
    const category = next.category ?? defaultCategory;
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    router.push(`/documents?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-52">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParams({ q: search })}
          placeholder="Search by file name…"
          className="pl-8"
        />
      </div>
      <Select
        value={defaultCategory || undefined}
        onValueChange={(v) => updateParams({ category: v ?? "" })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All categories">
            {(value: string | null) => (value ? value.replaceAll("_", " ") : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
