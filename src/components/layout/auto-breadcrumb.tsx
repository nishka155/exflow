"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NAV_SECTIONS } from "@/lib/constants/nav";

const HREF_TO_LABEL = new Map(
  NAV_SECTIONS.flatMap((section) => section.items.map((item) => [item.href, item.title]))
);

const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  edit: "Edit",
  settings: "Settings",
  profile: "Profile",
  users: "Users",
};

function isIdSegment(segment: string) {
  return /^[0-9a-f-]{20,}$/i.test(segment) || segment.startsWith("seed-");
}

export function AutoBreadcrumb() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean);
  const moduleHref = `/${segments[0]}`;
  const moduleLabel = HREF_TO_LABEL.get(moduleHref) ?? SEGMENT_LABELS[segments[0]] ?? segments[0];

  const trailing = segments.slice(1).filter((s) => !isIdSegment(s));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/dashboard" />}>Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {trailing.length === 0 ? (
            <BreadcrumbPage>{moduleLabel}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href={moduleHref} />}>{moduleLabel}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {trailing.map((segment, i) => (
          <React.Fragment key={segment + i}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {i === trailing.length - 1 ? (
                <BreadcrumbPage>{SEGMENT_LABELS[segment] ?? segment}</BreadcrumbPage>
              ) : (
                SEGMENT_LABELS[segment] ?? segment
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
