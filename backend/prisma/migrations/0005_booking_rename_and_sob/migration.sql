-- Rename Shipment -> Booking (data-preserving), relax stuffing/gate-in
-- cardinality to support multiple containers per booking, and add the
-- Shipped On Board (SOB) concept. Written by hand (not `prisma migrate dev`)
-- so that existing rows survive instead of being dropped and recreated.

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

ALTER TYPE "ShipmentStage" RENAME TO "BookingStage";
ALTER TYPE "BookingStage" ADD VALUE 'SOB' BEFORE 'COMPLETED';

ALTER TYPE "DocumentEntityType" RENAME VALUE 'SHIPMENT' TO 'BOOKING';

ALTER TYPE "DocumentCategory" ADD VALUE 'CONTAINER_PHOTO';
ALTER TYPE "DocumentCategory" ADD VALUE 'LOADING_PHOTO';
ALTER TYPE "DocumentCategory" ADD VALUE 'SEAL_PHOTO';

CREATE TYPE "SobStatus" AS ENUM ('PENDING', 'COMPLETED');

-- ---------------------------------------------------------------------
-- Booking (formerly Shipment)
-- ---------------------------------------------------------------------

ALTER TABLE "shipments" RENAME TO "bookings";
ALTER TABLE "bookings" RENAME COLUMN "shipmentNumber" TO "bookingNumber";
ALTER TABLE "bookings" ADD COLUMN "deliveryDate" TIMESTAMP(3);
ALTER INDEX "shipments_shipmentNumber_key" RENAME TO "bookings_bookingNumber_key";
ALTER TABLE "bookings" RENAME CONSTRAINT "shipments_pkey" TO "bookings_pkey";
ALTER TABLE "bookings" RENAME CONSTRAINT "shipments_organizationId_fkey" TO "bookings_organizationId_fkey";
ALTER TABLE "bookings" RENAME CONSTRAINT "shipments_customerId_fkey" TO "bookings_customerId_fkey";

ALTER TABLE "shipment_timeline_events" RENAME TO "booking_timeline_events";
ALTER TABLE "booking_timeline_events" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "shipment_timeline_events_shipmentId_idx" RENAME TO "booking_timeline_events_bookingId_idx";
ALTER TABLE "booking_timeline_events" RENAME CONSTRAINT "shipment_timeline_events_pkey" TO "booking_timeline_events_pkey";
ALTER TABLE "booking_timeline_events" RENAME CONSTRAINT "shipment_timeline_events_shipmentId_fkey" TO "booking_timeline_events_bookingId_fkey";
ALTER TABLE "booking_timeline_events" RENAME CONSTRAINT "shipment_timeline_events_actorId_fkey" TO "booking_timeline_events_actorId_fkey";

ALTER TABLE "shipment_comments" RENAME TO "booking_comments";
ALTER TABLE "booking_comments" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "shipment_comments_shipmentId_idx" RENAME TO "booking_comments_bookingId_idx";
ALTER TABLE "booking_comments" RENAME CONSTRAINT "shipment_comments_pkey" TO "booking_comments_pkey";
ALTER TABLE "booking_comments" RENAME CONSTRAINT "shipment_comments_shipmentId_fkey" TO "booking_comments_bookingId_fkey";
ALTER TABLE "booking_comments" RENAME CONSTRAINT "shipment_comments_authorId_fkey" TO "booking_comments_authorId_fkey";

-- ---------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------

ALTER TABLE "invoices" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "invoices_shipmentId_key" RENAME TO "invoices_bookingId_key";
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_shipmentId_fkey" TO "invoices_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Truck dispatches (+ new lrNumber)
-- ---------------------------------------------------------------------

ALTER TABLE "truck_dispatches" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER TABLE "truck_dispatches" ADD COLUMN "lrNumber" TEXT;
ALTER INDEX "truck_dispatches_shipmentId_idx" RENAME TO "truck_dispatches_bookingId_idx";
ALTER TABLE "truck_dispatches" RENAME CONSTRAINT "truck_dispatches_shipmentId_fkey" TO "truck_dispatches_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Factory stuffings: drop 1:1-with-booking constraint, add new fields
-- ---------------------------------------------------------------------

ALTER TABLE "factory_stuffings" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER TABLE "factory_stuffings" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "factory_stuffings" ADD COLUMN "numberOfBlocks" INTEGER;
ALTER TABLE "factory_stuffings" ADD COLUMN "lrGrNumber" TEXT;
ALTER TABLE "factory_stuffings" ADD COLUMN "deliveryDate" TIMESTAMP(3);
ALTER TABLE "factory_stuffings" ADD COLUMN "actualArrival" TIMESTAMP(3);
ALTER TABLE "factory_stuffings" ADD COLUMN "remarks" TEXT;
DROP INDEX "factory_stuffings_shipmentId_key";
CREATE INDEX "factory_stuffings_bookingId_idx" ON "factory_stuffings"("bookingId");
ALTER TABLE "factory_stuffings" RENAME CONSTRAINT "factory_stuffings_shipmentId_fkey" TO "factory_stuffings_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Gate ins: drop 1:1-with-booking constraint (stays 1:1 per container)
-- ---------------------------------------------------------------------

ALTER TABLE "gate_ins" RENAME COLUMN "shipmentId" TO "bookingId";
DROP INDEX "gate_ins_shipmentId_key";
CREATE INDEX "gate_ins_bookingId_idx" ON "gate_ins"("bookingId");
ALTER TABLE "gate_ins" RENAME CONSTRAINT "gate_ins_shipmentId_fkey" TO "gate_ins_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Shipping instructions
-- ---------------------------------------------------------------------

ALTER TABLE "shipping_instructions" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "shipping_instructions_shipmentId_key" RENAME TO "shipping_instructions_bookingId_key";
ALTER TABLE "shipping_instructions" RENAME CONSTRAINT "shipping_instructions_shipmentId_fkey" TO "shipping_instructions_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Bills of lading
-- ---------------------------------------------------------------------

ALTER TABLE "bills_of_lading" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "bills_of_lading_shipmentId_key" RENAME TO "bills_of_lading_bookingId_key";
ALTER TABLE "bills_of_lading" RENAME CONSTRAINT "bills_of_lading_shipmentId_fkey" TO "bills_of_lading_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------

ALTER TABLE "documents" RENAME COLUMN "shipmentId" TO "bookingId";
ALTER INDEX "documents_shipmentId_idx" RENAME TO "documents_bookingId_idx";
ALTER TABLE "documents" RENAME CONSTRAINT "documents_shipmentId_fkey" TO "documents_bookingId_fkey";

-- ---------------------------------------------------------------------
-- Shipped On Board (new)
-- ---------------------------------------------------------------------

CREATE TABLE "shipped_on_boards" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "billOfLadingId" TEXT NOT NULL,
    "vessel" TEXT,
    "shippingLine" TEXT,
    "sobDate" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "SobStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipped_on_boards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipped_on_boards_bookingId_key" ON "shipped_on_boards"("bookingId");
CREATE UNIQUE INDEX "shipped_on_boards_billOfLadingId_key" ON "shipped_on_boards"("billOfLadingId");
CREATE INDEX "shipped_on_boards_organizationId_idx" ON "shipped_on_boards"("organizationId");

ALTER TABLE "shipped_on_boards" ADD CONSTRAINT "shipped_on_boards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipped_on_boards" ADD CONSTRAINT "shipped_on_boards_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipped_on_boards" ADD CONSTRAINT "shipped_on_boards_billOfLadingId_fkey" FOREIGN KEY ("billOfLadingId") REFERENCES "bills_of_lading"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipped_on_boards" ADD CONSTRAINT "shipped_on_boards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
