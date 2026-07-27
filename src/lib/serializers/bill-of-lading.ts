import type { BillOfLading } from "@prisma/client";

export type SerializedBL = Omit<BillOfLading, "weight" | "blDate" | "createdAt" | "updatedAt"> & {
  weight: number | null;
  blDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeBL(bl: BillOfLading): SerializedBL {
  return {
    ...bl,
    weight: bl.weight ? Number(bl.weight) : null,
    blDate: bl.blDate ? bl.blDate.toISOString() : null,
    createdAt: bl.createdAt.toISOString(),
    updatedAt: bl.updatedAt.toISOString(),
  };
}
