-- Add barcode field to inventory items (unique, nullable)
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_barcode_key" ON "inventory_items"("barcode");
