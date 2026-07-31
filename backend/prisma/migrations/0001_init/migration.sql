-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EXPORT_MANAGER', 'DOCUMENTATION_EXECUTIVE', 'FACTORY_USER', 'TRANSPORT_COORDINATOR', 'ACCOUNTS', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'DISPATCHED', 'REACHED_FACTORY', 'DELAY');

-- CreateEnum
CREATE TYPE "ContainerSize" AS ENUM ('FT20', 'FT40', 'FT40_HC');

-- CreateEnum
CREATE TYPE "StuffingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GateInStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SIStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "BLStatus" AS ENUM ('DRAFT', 'MISMATCH', 'FINAL');

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('INVOICE', 'DISPATCH', 'STUFFING', 'GATE_IN', 'SHIPPING_INSTRUCTION', 'BILL_OF_LADING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'SHIPPING_INSTRUCTION', 'LR_COPY', 'GR_COPY', 'GATE_PASS', 'PHOTO', 'VIDEO', 'CERTIFICATE', 'STUFFING_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('SHIPMENT', 'INVOICE', 'DISPATCH', 'STUFFING', 'GATE_IN', 'SHIPPING_INSTRUCTION', 'BILL_OF_LADING');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRUCK_DELAY', 'GATE_IN_DELAY', 'MISSING_DOCUMENTS', 'PENDING_SI', 'PENDING_BL', 'SEAL_MISSING', 'CONTAINER_DELAY', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "gstNumber" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "portalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transporters" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "gstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transporters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currentStage" "ShipmentStage" NOT NULL DEFAULT 'INVOICE',
    "isDelayed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_timeline_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stage" "ShipmentStage" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_comments" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "poNumber" TEXT,
    "material" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "quantityUnit" TEXT NOT NULL DEFAULT 'MT',
    "weight" DECIMAL(14,3) NOT NULL,
    "weightUnit" TEXT NOT NULL DEFAULT 'KG',
    "numberOfBlocks" INTEGER,
    "hsnCode" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "exportCountry" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_versions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_dispatches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverMobile" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "numberOfWeights" DECIMAL(14,3),
    "numberOfBlocks" INTEGER,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "expectedFactoryArrival" TIMESTAMP(3) NOT NULL,
    "actualFactoryArrival" TIMESTAMP(3),
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "factoryStuffingId" TEXT,

    CONSTRAINT "truck_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_stuffings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "containerSize" "ContainerSize" NOT NULL,
    "sealNumber" TEXT,
    "contactNumber" TEXT,
    "transporterId" TEXT,
    "pol" TEXT NOT NULL,
    "pod" TEXT NOT NULL,
    "numberOfBoxes" INTEGER,
    "grossWeight" DECIMAL(14,3),
    "netWeight" DECIMAL(14,3),
    "stuffingStartTime" TIMESTAMP(3),
    "stuffingEndTime" TIMESTAMP(3),
    "checklistContainerClean" BOOLEAN NOT NULL DEFAULT false,
    "checklistContainerDamage" BOOLEAN NOT NULL DEFAULT false,
    "checklistSealApplied" BOOLEAN NOT NULL DEFAULT false,
    "checklistDocumentsUploaded" BOOLEAN NOT NULL DEFAULT false,
    "status" "StuffingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reportUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_stuffings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_ins" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "factoryStuffingId" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "gateInDate" TIMESTAMP(3) NOT NULL,
    "terminal" TEXT NOT NULL,
    "yard" TEXT,
    "vehicleNumber" TEXT,
    "form13Updated" BOOLEAN NOT NULL DEFAULT false,
    "gatePass" TEXT,
    "eirNumber" TEXT,
    "remarks" TEXT,
    "status" "GateInStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_instructions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "consignorName" TEXT NOT NULL,
    "consignorAddress" TEXT,
    "consigneeName" TEXT NOT NULL,
    "consigneeAddress" TEXT,
    "notifyPartyName" TEXT,
    "notifyPartyAddress" TEXT,
    "pol" TEXT NOT NULL,
    "pod" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "hsCode" TEXT,
    "packageCount" INTEGER,
    "weight" DECIMAL(14,3),
    "marks" TEXT,
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "freightTerms" TEXT,
    "incoterms" TEXT,
    "shippingLine" TEXT,
    "voyage" TEXT,
    "vessel" TEXT,
    "status" "SIStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills_of_lading" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "shippingInstructionId" TEXT NOT NULL,
    "blNumber" TEXT,
    "blDate" TIMESTAMP(3),
    "consignorName" TEXT NOT NULL,
    "consignorAddress" TEXT,
    "consigneeName" TEXT NOT NULL,
    "consigneeAddress" TEXT,
    "notifyPartyName" TEXT,
    "notifyPartyAddress" TEXT,
    "pol" TEXT NOT NULL,
    "pod" TEXT NOT NULL,
    "vessel" TEXT,
    "voyage" TEXT,
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "commodity" TEXT NOT NULL,
    "packageCount" INTEGER,
    "weight" DECIMAL(14,3),
    "freightTerms" TEXT,
    "status" "BLStatus" NOT NULL DEFAULT 'DRAFT',
    "mismatchNotes" JSONB,
    "pdfUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_of_lading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bl_revisions" (
    "id" TEXT NOT NULL,
    "billOfLadingId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bl_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "entityType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSizeBytes" INTEGER,
    "ocrText" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT,
    "truckDispatchId" TEXT,
    "factoryStuffingId" TEXT,
    "gateInId" TEXT,
    "shippingInstructionId" TEXT,
    "billOfLadingId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_portalUserId_key" ON "customers"("portalUserId");

-- CreateIndex
CREATE INDEX "customers_organizationId_idx" ON "customers"("organizationId");

-- CreateIndex
CREATE INDEX "transporters_organizationId_idx" ON "transporters"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_organizationId_idx" ON "shipments"("organizationId");

-- CreateIndex
CREATE INDEX "shipments_customerId_idx" ON "shipments"("customerId");

-- CreateIndex
CREATE INDEX "shipment_timeline_events_shipmentId_idx" ON "shipment_timeline_events"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_comments_shipmentId_idx" ON "shipment_comments"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_shipmentId_key" ON "invoices"("shipmentId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organizationId_invoiceNumber_key" ON "invoices"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_versions_invoiceId_versionNumber_key" ON "invoice_versions"("invoiceId", "versionNumber");

-- CreateIndex
CREATE INDEX "truck_dispatches_organizationId_idx" ON "truck_dispatches"("organizationId");

-- CreateIndex
CREATE INDEX "truck_dispatches_shipmentId_idx" ON "truck_dispatches"("shipmentId");

-- CreateIndex
CREATE INDEX "truck_dispatches_transporterId_idx" ON "truck_dispatches"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "factory_stuffings_shipmentId_key" ON "factory_stuffings"("shipmentId");

-- CreateIndex
CREATE INDEX "factory_stuffings_organizationId_idx" ON "factory_stuffings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "gate_ins_shipmentId_key" ON "gate_ins"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "gate_ins_factoryStuffingId_key" ON "gate_ins"("factoryStuffingId");

-- CreateIndex
CREATE INDEX "gate_ins_organizationId_idx" ON "gate_ins"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_instructions_shipmentId_key" ON "shipping_instructions"("shipmentId");

-- CreateIndex
CREATE INDEX "shipping_instructions_organizationId_idx" ON "shipping_instructions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_lading_shipmentId_key" ON "bills_of_lading"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_lading_shippingInstructionId_key" ON "bills_of_lading"("shippingInstructionId");

-- CreateIndex
CREATE INDEX "bills_of_lading_organizationId_idx" ON "bills_of_lading"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "bl_revisions_billOfLadingId_revisionNumber_key" ON "bl_revisions"("billOfLadingId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "documents_previousVersionId_key" ON "documents"("previousVersionId");

-- CreateIndex
CREATE INDEX "documents_organizationId_idx" ON "documents"("organizationId");

-- CreateIndex
CREATE INDEX "documents_shipmentId_idx" ON "documents"("shipmentId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_timeline_events" ADD CONSTRAINT "shipment_timeline_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_timeline_events" ADD CONSTRAINT "shipment_timeline_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_comments" ADD CONSTRAINT "shipment_comments_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_comments" ADD CONSTRAINT "shipment_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_versions" ADD CONSTRAINT "invoice_versions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_dispatches" ADD CONSTRAINT "truck_dispatches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_dispatches" ADD CONSTRAINT "truck_dispatches_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_dispatches" ADD CONSTRAINT "truck_dispatches_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "transporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_dispatches" ADD CONSTRAINT "truck_dispatches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_dispatches" ADD CONSTRAINT "truck_dispatches_factoryStuffingId_fkey" FOREIGN KEY ("factoryStuffingId") REFERENCES "factory_stuffings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_stuffings" ADD CONSTRAINT "factory_stuffings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_stuffings" ADD CONSTRAINT "factory_stuffings_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_stuffings" ADD CONSTRAINT "factory_stuffings_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "transporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_stuffings" ADD CONSTRAINT "factory_stuffings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_ins" ADD CONSTRAINT "gate_ins_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_ins" ADD CONSTRAINT "gate_ins_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_ins" ADD CONSTRAINT "gate_ins_factoryStuffingId_fkey" FOREIGN KEY ("factoryStuffingId") REFERENCES "factory_stuffings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_ins" ADD CONSTRAINT "gate_ins_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_instructions" ADD CONSTRAINT "shipping_instructions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_instructions" ADD CONSTRAINT "shipping_instructions_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_instructions" ADD CONSTRAINT "shipping_instructions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_shippingInstructionId_fkey" FOREIGN KEY ("shippingInstructionId") REFERENCES "shipping_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bl_revisions" ADD CONSTRAINT "bl_revisions_billOfLadingId_fkey" FOREIGN KEY ("billOfLadingId") REFERENCES "bills_of_lading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_truckDispatchId_fkey" FOREIGN KEY ("truckDispatchId") REFERENCES "truck_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_factoryStuffingId_fkey" FOREIGN KEY ("factoryStuffingId") REFERENCES "factory_stuffings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_gateInId_fkey" FOREIGN KEY ("gateInId") REFERENCES "gate_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_shippingInstructionId_fkey" FOREIGN KEY ("shippingInstructionId") REFERENCES "shipping_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_billOfLadingId_fkey" FOREIGN KEY ("billOfLadingId") REFERENCES "bills_of_lading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

