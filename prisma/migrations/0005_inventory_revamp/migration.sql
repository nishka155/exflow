-- Inventory revamp: new movement types, supplier fields, running balance, reference number

-- 1. Extend InventoryMovementType enum
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'RETURN';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'DAMAGED';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT_OUT';

-- 2. Add supplier fields to inventory_items
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "supplier"        TEXT;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "supplierContact" TEXT;

-- 3. Add runningBalance and referenceNumber to inventory_movements
--    runningBalance defaults to 0 for existing rows (no historical data to backfill)
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "runningBalance"  DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
