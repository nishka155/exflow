-- Adds the standalone-Booking-creation fields (customer/exporter/buyer,
-- POL/POD/vessel/ETD/ETA/freight terms/commodity) so a Booking can be
-- created directly rather than only ever as a side effect of an Invoice.

ALTER TABLE "bookings" ADD COLUMN "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN "exporterName" TEXT;
ALTER TABLE "bookings" ADD COLUMN "buyerName" TEXT;
ALTER TABLE "bookings" ADD COLUMN "pol" TEXT;
ALTER TABLE "bookings" ADD COLUMN "pod" TEXT;
ALTER TABLE "bookings" ADD COLUMN "shippingLine" TEXT;
ALTER TABLE "bookings" ADD COLUMN "vessel" TEXT;
ALTER TABLE "bookings" ADD COLUMN "etd" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "eta" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "freightTerms" TEXT;
ALTER TABLE "bookings" ADD COLUMN "commodity" TEXT;
