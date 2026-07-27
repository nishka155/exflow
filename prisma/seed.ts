import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = "Password123!";

async function ensureUser(
  organizationId: string,
  email: string,
  name: string,
  role: "EXPORT_MANAGER" | "DOCUMENTATION_EXECUTIVE" | "FACTORY_USER" | "TRANSPORT_COORDINATOR" | "ACCOUNTS"
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { organization_id: organizationId, name, role },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create seed user ${email}: ${error?.message}`);
  }
  const user = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!user) throw new Error(`Trigger did not create public.users row for ${email}`);
  return user;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!organization) {
    throw new Error(
      "No organization found. Sign up for a workspace at /signup first, then re-run the seed."
    );
  }
  const orgId = organization.id;
  console.log(`Seeding into organization: ${organization.name} (${orgId})`);

  const [exportManager, docExec, factoryUser, transportCoordinator] = await Promise.all([
    ensureUser(orgId, "manager@acme-exports.test", "Rahul Mehta", "EXPORT_MANAGER"),
    ensureUser(orgId, "docs@acme-exports.test", "Priya Nair", "DOCUMENTATION_EXECUTIVE"),
    ensureUser(orgId, "factory@acme-exports.test", "Suresh Kumar", "FACTORY_USER"),
    ensureUser(orgId, "transport@acme-exports.test", "Vikram Singh", "TRANSPORT_COORDINATOR"),
    ensureUser(orgId, "accounts@acme-exports.test", "Neha Joshi", "ACCOUNTS"),
  ]);

  const nordic = await prisma.customer.upsert({
    where: { id: "seed-customer-nordic" },
    update: {},
    create: {
      id: "seed-customer-nordic",
      organizationId: orgId,
      name: "Nordic Textiles AB",
      code: "NORD-01",
      address: "Storgatan 12",
      city: "Gothenburg",
      country: "Sweden",
      contactPerson: "Elin Karlsson",
      contactEmail: "elin@nordictextiles.example",
      contactPhone: "+46 70 123 4567",
    },
  });
  const gulf = await prisma.customer.upsert({
    where: { id: "seed-customer-gulf" },
    update: {},
    create: {
      id: "seed-customer-gulf",
      organizationId: orgId,
      name: "Gulf Trading LLC",
      code: "GULF-01",
      address: "Sheikh Zayed Road",
      city: "Dubai",
      country: "United Arab Emirates",
      contactPerson: "Ahmed Al Farsi",
      contactEmail: "ahmed@gulftrading.example",
      contactPhone: "+971 4 123 4567",
    },
  });
  const pacific = await prisma.customer.upsert({
    where: { id: "seed-customer-pacific" },
    update: {},
    create: {
      id: "seed-customer-pacific",
      organizationId: orgId,
      name: "Pacific Import Co",
      code: "PAC-01",
      address: "Nguyen Hue Street 45",
      city: "Ho Chi Minh City",
      country: "Vietnam",
      contactPerson: "Linh Tran",
      contactEmail: "linh@pacificimport.example",
      contactPhone: "+84 28 1234 5678",
    },
  });

  const sharma = await prisma.transporter.upsert({
    where: { id: "seed-transporter-sharma" },
    update: {},
    create: {
      id: "seed-transporter-sharma",
      organizationId: orgId,
      name: "Sharma Road Carriers",
      contactPerson: "Manoj Sharma",
      contactPhone: "+91 98765 43210",
      gstNumber: "27ABCDE1234F1Z5",
    },
  });
  const speedway = await prisma.transporter.upsert({
    where: { id: "seed-transporter-speedway" },
    update: {},
    create: {
      id: "seed-transporter-speedway",
      organizationId: orgId,
      name: "Speedway Logistics",
      contactPerson: "Kiran Patel",
      contactPhone: "+91 91234 56789",
      gstNumber: "24FGHIJ5678K1Z9",
    },
  });

  async function upsertShipment(shipmentNumber: string, customerId: string, currentStage: Parameters<typeof prisma.shipment.create>[0]["data"]["currentStage"], isDelayed = false) {
    return prisma.shipment.upsert({
      where: { shipmentNumber },
      update: {},
      create: {
        organizationId: orgId,
        shipmentNumber,
        customerId,
        currentStage,
        isDelayed,
        createdById: exportManager.id,
      },
    });
  }

  // Shipment 1 — invoice only (draft)
  const s1 = await upsertShipment("EXF-2026-000001", nordic.id, "INVOICE");
  await prisma.invoice.upsert({
    where: { shipmentId: s1.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s1.id,
      invoiceNumber: "INV-2026-0001",
      invoiceDate: daysAgo(1),
      customerId: nordic.id,
      buyerName: nordic.name,
      buyerAddress: `${nordic.address}, ${nordic.city}, ${nordic.country}`,
      poNumber: "PO-NORD-2201",
      material: "Granite Slabs - Alaska White",
      quantity: 24.5,
      weight: 24500,
      numberOfBlocks: 12,
      hsnCode: "6802",
      unitPrice: 85.5,
      currency: "USD",
      totalAmount: 2094.75,
      exportCountry: "Sweden",
      status: "DRAFT",
      createdById: docExec.id,
    },
  });
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      {
        shipmentId: s1.id,
        stage: "INVOICE",
        title: "Invoice created",
        description: "Draft invoice INV-2026-0001 created for Nordic Textiles AB.",
        occurredAt: daysAgo(1),
        actorId: docExec.id,
      },
    ],
  });

  // Shipment 2 — invoice approved, truck dispatched and delayed
  const s2 = await upsertShipment("EXF-2026-000002", gulf.id, "DISPATCH", true);
  await prisma.invoice.upsert({
    where: { shipmentId: s2.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s2.id,
      invoiceNumber: "INV-2026-0002",
      invoiceDate: daysAgo(4),
      customerId: gulf.id,
      buyerName: gulf.name,
      buyerAddress: `${gulf.address}, ${gulf.city}, ${gulf.country}`,
      poNumber: "PO-GULF-5510",
      material: "Marble Tiles - Makrana White",
      quantity: 40,
      weight: 40000,
      numberOfBlocks: 20,
      hsnCode: "6802",
      unitPrice: 62,
      currency: "USD",
      totalAmount: 2480,
      exportCountry: "United Arab Emirates",
      status: "APPROVED",
      createdById: docExec.id,
    },
  });
  const d2 = await prisma.truckDispatch.findFirst({ where: { shipmentId: s2.id } });
  if (!d2) {
    await prisma.truckDispatch.create({
      data: {
        organizationId: orgId,
        shipmentId: s2.id,
        truckNumber: "GJ-01-AB-1234",
        driverName: "Ramesh Yadav",
        driverMobile: "+91 98200 12345",
        transporterId: sharma.id,
        material: "Marble Tiles - Makrana White",
        referenceNumber: "REF-5510",
        numberOfBlocks: 20,
        dispatchDate: daysAgo(2),
        expectedFactoryArrival: daysAgo(1),
        status: "DELAY",
        createdById: transportCoordinator.id,
      },
    });
  }
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      { shipmentId: s2.id, stage: "INVOICE", title: "Invoice approved", occurredAt: daysAgo(3), actorId: exportManager.id },
      { shipmentId: s2.id, stage: "DISPATCH", title: "Truck dispatched", description: "GJ-01-AB-1234 dispatched via Sharma Road Carriers.", occurredAt: daysAgo(2), actorId: transportCoordinator.id },
      { shipmentId: s2.id, stage: "DISPATCH", title: "Truck delayed", description: "Expected factory arrival missed — flagged as delayed.", occurredAt: daysAgo(0), actorId: transportCoordinator.id },
    ],
  });

  // Shipment 3 — factory stuffing in progress
  const s3 = await upsertShipment("EXF-2026-000003", pacific.id, "STUFFING");
  await prisma.invoice.upsert({
    where: { shipmentId: s3.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s3.id,
      invoiceNumber: "INV-2026-0003",
      invoiceDate: daysAgo(6),
      customerId: pacific.id,
      buyerName: pacific.name,
      buyerAddress: `${pacific.address}, ${pacific.city}, ${pacific.country}`,
      poNumber: "PO-PAC-7788",
      material: "Sandstone Blocks - Mint",
      quantity: 30,
      weight: 30000,
      numberOfBlocks: 15,
      hsnCode: "6801",
      unitPrice: 70,
      currency: "USD",
      totalAmount: 2100,
      exportCountry: "Vietnam",
      status: "APPROVED",
      createdById: docExec.id,
    },
  });
  if (!(await prisma.truckDispatch.findFirst({ where: { shipmentId: s3.id } }))) {
    await prisma.truckDispatch.create({
      data: {
        organizationId: orgId,
        shipmentId: s3.id,
        truckNumber: "RJ-14-CD-5678",
        driverName: "Om Prakash",
        driverMobile: "+91 99887 66554",
        transporterId: speedway.id,
        material: "Sandstone Blocks - Mint",
        numberOfBlocks: 15,
        dispatchDate: daysAgo(4),
        expectedFactoryArrival: daysAgo(3),
        actualFactoryArrival: daysAgo(3),
        status: "REACHED_FACTORY",
        createdById: transportCoordinator.id,
      },
    });
  }
  await prisma.factoryStuffing.upsert({
    where: { shipmentId: s3.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s3.id,
      containerNumber: "TCLU1234567",
      containerSize: "FT40_HC",
      sealNumber: "SL-889912",
      transporterId: speedway.id,
      pol: "Mundra, India",
      pod: "Ho Chi Minh City, Vietnam",
      numberOfBoxes: 15,
      grossWeight: 30500,
      netWeight: 30000,
      stuffingStartTime: daysAgo(2),
      checklistContainerClean: true,
      checklistSealApplied: false,
      checklistDocumentsUploaded: false,
      status: "IN_PROGRESS",
      createdById: factoryUser.id,
    },
  });
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      { shipmentId: s3.id, stage: "DISPATCH", title: "Truck reached factory", occurredAt: daysAgo(3), actorId: transportCoordinator.id },
      { shipmentId: s3.id, stage: "STUFFING", title: "Factory stuffing started", description: "Container TCLU1234567 stuffing in progress.", occurredAt: daysAgo(2), actorId: factoryUser.id },
    ],
  });

  // Shipment 4 — through gate-in
  const s4 = await upsertShipment("EXF-2026-000004", nordic.id, "GATE_IN");
  await prisma.invoice.upsert({
    where: { shipmentId: s4.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s4.id,
      invoiceNumber: "INV-2026-0004",
      invoiceDate: daysAgo(10),
      customerId: nordic.id,
      buyerName: nordic.name,
      buyerAddress: `${nordic.address}, ${nordic.city}, ${nordic.country}`,
      poNumber: "PO-NORD-2305",
      material: "Granite Slabs - Steel Grey",
      quantity: 26,
      weight: 26000,
      numberOfBlocks: 13,
      hsnCode: "6802",
      unitPrice: 90,
      currency: "USD",
      totalAmount: 2340,
      exportCountry: "Sweden",
      status: "APPROVED",
      createdById: docExec.id,
    },
  });
  if (!(await prisma.truckDispatch.findFirst({ where: { shipmentId: s4.id } }))) {
    await prisma.truckDispatch.create({
      data: {
        organizationId: orgId,
        shipmentId: s4.id,
        truckNumber: "GJ-05-EF-9012",
        driverName: "Santosh More",
        driverMobile: "+91 90000 11223",
        transporterId: sharma.id,
        material: "Granite Slabs - Steel Grey",
        numberOfBlocks: 13,
        dispatchDate: daysAgo(8),
        expectedFactoryArrival: daysAgo(7),
        actualFactoryArrival: daysAgo(7),
        status: "REACHED_FACTORY",
        createdById: transportCoordinator.id,
      },
    });
  }
  const stuffing4 = await prisma.factoryStuffing.upsert({
    where: { shipmentId: s4.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s4.id,
      containerNumber: "MSCU7654321",
      containerSize: "FT40",
      sealNumber: "SL-778823",
      transporterId: sharma.id,
      pol: "Mundra, India",
      pod: "Gothenburg, Sweden",
      numberOfBoxes: 13,
      grossWeight: 26400,
      netWeight: 26000,
      stuffingStartTime: daysAgo(6),
      stuffingEndTime: daysAgo(6),
      checklistContainerClean: true,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: factoryUser.id,
    },
  });
  await prisma.gateIn.upsert({
    where: { shipmentId: s4.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s4.id,
      factoryStuffingId: stuffing4.id,
      containerNumber: "MSCU7654321",
      gateInDate: daysAgo(5),
      terminal: "Mundra International Container Terminal",
      yard: "Yard 3",
      vehicleNumber: "GJ-05-EF-9012",
      form13Updated: true,
      gatePass: "GP-88213",
      eirNumber: "EIR-449923",
      status: "COMPLETED",
      createdById: docExec.id,
    },
  });
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      { shipmentId: s4.id, stage: "STUFFING", title: "Factory stuffing completed", occurredAt: daysAgo(6), actorId: factoryUser.id },
      { shipmentId: s4.id, stage: "GATE_IN", title: "Container gated in", description: "Gated in at Mundra International Container Terminal.", occurredAt: daysAgo(5), actorId: docExec.id },
    ],
  });

  // Shipment 5 — shipping instruction sent, pending BL
  const s5 = await upsertShipment("EXF-2026-000005", gulf.id, "SHIPPING_INSTRUCTION");
  await prisma.invoice.upsert({
    where: { shipmentId: s5.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s5.id,
      invoiceNumber: "INV-2026-0005",
      invoiceDate: daysAgo(14),
      customerId: gulf.id,
      buyerName: gulf.name,
      buyerAddress: `${gulf.address}, ${gulf.city}, ${gulf.country}`,
      poNumber: "PO-GULF-5599",
      material: "Marble Blocks - Rajasthan Pink",
      quantity: 35,
      weight: 35000,
      numberOfBlocks: 10,
      hsnCode: "2515",
      unitPrice: 110,
      currency: "USD",
      totalAmount: 3850,
      exportCountry: "United Arab Emirates",
      status: "APPROVED",
      createdById: docExec.id,
    },
  });
  if (!(await prisma.truckDispatch.findFirst({ where: { shipmentId: s5.id } }))) {
    await prisma.truckDispatch.create({
      data: {
        organizationId: orgId,
        shipmentId: s5.id,
        truckNumber: "RJ-27-GH-3344",
        driverName: "Deepak Rathore",
        driverMobile: "+91 97000 22334",
        transporterId: speedway.id,
        material: "Marble Blocks - Rajasthan Pink",
        numberOfBlocks: 10,
        dispatchDate: daysAgo(12),
        expectedFactoryArrival: daysAgo(11),
        actualFactoryArrival: daysAgo(11),
        status: "REACHED_FACTORY",
        createdById: transportCoordinator.id,
      },
    });
  }
  const stuffing5 = await prisma.factoryStuffing.upsert({
    where: { shipmentId: s5.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s5.id,
      containerNumber: "HLXU4455667",
      containerSize: "FT20",
      sealNumber: "SL-661029",
      transporterId: speedway.id,
      pol: "Kandla, India",
      pod: "Jebel Ali, UAE",
      numberOfBoxes: 10,
      grossWeight: 35400,
      netWeight: 35000,
      stuffingStartTime: daysAgo(10),
      stuffingEndTime: daysAgo(10),
      checklistContainerClean: true,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: factoryUser.id,
    },
  });
  await prisma.gateIn.upsert({
    where: { shipmentId: s5.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s5.id,
      factoryStuffingId: stuffing5.id,
      containerNumber: "HLXU4455667",
      gateInDate: daysAgo(9),
      terminal: "Kandla Container Terminal",
      vehicleNumber: "RJ-27-GH-3344",
      form13Updated: true,
      gatePass: "GP-77120",
      eirNumber: "EIR-339981",
      status: "COMPLETED",
      createdById: docExec.id,
    },
  });
  await prisma.shippingInstruction.upsert({
    where: { shipmentId: s5.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s5.id,
      consignorName: organization.name,
      consigneeName: gulf.name,
      consigneeAddress: `${gulf.address}, ${gulf.city}, ${gulf.country}`,
      notifyPartyName: gulf.name,
      pol: "Kandla, India",
      pod: "Jebel Ali, UAE",
      commodity: "Marble Blocks - Rajasthan Pink",
      hsCode: "2515",
      packageCount: 10,
      weight: 35000,
      containerNumber: "HLXU4455667",
      sealNumber: "SL-661029",
      freightTerms: "Prepaid",
      incoterms: "CIF",
      shippingLine: "Hapag-Lloyd",
      voyage: "HL2214W",
      vessel: "MV Nordic Star",
      status: "SENT",
      sentAt: daysAgo(2),
      createdById: docExec.id,
    },
  });
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      { shipmentId: s5.id, stage: "GATE_IN", title: "Container gated in", occurredAt: daysAgo(9), actorId: docExec.id },
      { shipmentId: s5.id, stage: "SHIPPING_INSTRUCTION", title: "Shipping instruction sent to line", description: "SI emailed to Hapag-Lloyd for voyage HL2214W.", occurredAt: daysAgo(2), actorId: docExec.id },
    ],
  });

  // Shipment 6 — fully completed with final BL
  const s6 = await upsertShipment("EXF-2026-000006", pacific.id, "COMPLETED");
  await prisma.invoice.upsert({
    where: { shipmentId: s6.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s6.id,
      invoiceNumber: "INV-2026-0006",
      invoiceDate: daysAgo(21),
      customerId: pacific.id,
      buyerName: pacific.name,
      buyerAddress: `${pacific.address}, ${pacific.city}, ${pacific.country}`,
      poNumber: "PO-PAC-8891",
      material: "Sandstone Blocks - Autumn Brown",
      quantity: 32,
      weight: 32000,
      numberOfBlocks: 16,
      hsnCode: "6801",
      unitPrice: 72,
      currency: "USD",
      totalAmount: 2304,
      exportCountry: "Vietnam",
      status: "COMPLETED",
      createdById: docExec.id,
    },
  });
  if (!(await prisma.truckDispatch.findFirst({ where: { shipmentId: s6.id } }))) {
    await prisma.truckDispatch.create({
      data: {
        organizationId: orgId,
        shipmentId: s6.id,
        truckNumber: "RJ-09-JK-7788",
        driverName: "Vinod Bhatt",
        driverMobile: "+91 96500 33445",
        transporterId: sharma.id,
        material: "Sandstone Blocks - Autumn Brown",
        numberOfBlocks: 16,
        dispatchDate: daysAgo(19),
        expectedFactoryArrival: daysAgo(18),
        actualFactoryArrival: daysAgo(18),
        status: "REACHED_FACTORY",
        createdById: transportCoordinator.id,
      },
    });
  }
  const stuffing6 = await prisma.factoryStuffing.upsert({
    where: { shipmentId: s6.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s6.id,
      containerNumber: "OOLU8899001",
      containerSize: "FT40",
      sealNumber: "SL-552210",
      transporterId: sharma.id,
      pol: "Mundra, India",
      pod: "Ho Chi Minh City, Vietnam",
      numberOfBoxes: 16,
      grossWeight: 32500,
      netWeight: 32000,
      stuffingStartTime: daysAgo(17),
      stuffingEndTime: daysAgo(17),
      checklistContainerClean: true,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: factoryUser.id,
    },
  });
  await prisma.gateIn.upsert({
    where: { shipmentId: s6.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s6.id,
      factoryStuffingId: stuffing6.id,
      containerNumber: "OOLU8899001",
      gateInDate: daysAgo(16),
      terminal: "Mundra International Container Terminal",
      vehicleNumber: "RJ-09-JK-7788",
      form13Updated: true,
      gatePass: "GP-66120",
      eirNumber: "EIR-229981",
      status: "COMPLETED",
      createdById: docExec.id,
    },
  });
  const si6 = await prisma.shippingInstruction.upsert({
    where: { shipmentId: s6.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s6.id,
      consignorName: organization.name,
      consigneeName: pacific.name,
      consigneeAddress: `${pacific.address}, ${pacific.city}, ${pacific.country}`,
      notifyPartyName: pacific.name,
      pol: "Mundra, India",
      pod: "Ho Chi Minh City, Vietnam",
      commodity: "Sandstone Blocks - Autumn Brown",
      hsCode: "6801",
      packageCount: 16,
      weight: 32000,
      containerNumber: "OOLU8899001",
      sealNumber: "SL-552210",
      freightTerms: "Prepaid",
      incoterms: "FOB",
      shippingLine: "ONE (Ocean Network Express)",
      voyage: "ONE0091E",
      vessel: "MV Pacific Voyager",
      status: "CONFIRMED",
      sentAt: daysAgo(15),
      createdById: docExec.id,
    },
  });
  await prisma.billOfLading.upsert({
    where: { shipmentId: s6.id },
    update: {},
    create: {
      organizationId: orgId,
      shipmentId: s6.id,
      shippingInstructionId: si6.id,
      blNumber: "BL-ONE-0091-002",
      blDate: daysAgo(13),
      consignorName: organization.name,
      consigneeName: pacific.name,
      consigneeAddress: `${pacific.address}, ${pacific.city}, ${pacific.country}`,
      notifyPartyName: pacific.name,
      pol: "Mundra, India",
      pod: "Ho Chi Minh City, Vietnam",
      vessel: "MV Pacific Voyager",
      voyage: "ONE0091E",
      containerNumber: "OOLU8899001",
      sealNumber: "SL-552210",
      commodity: "Sandstone Blocks - Autumn Brown",
      packageCount: 16,
      weight: 32000,
      freightTerms: "Prepaid",
      status: "FINAL",
      createdById: docExec.id,
    },
  });
  await prisma.shipmentTimelineEvent.createMany({
    data: [
      { shipmentId: s6.id, stage: "SHIPPING_INSTRUCTION", title: "SI confirmed by shipping line", occurredAt: daysAgo(14), actorId: docExec.id },
      { shipmentId: s6.id, stage: "BILL_OF_LADING", title: "Final Bill of Lading issued", description: "BL-ONE-0091-002 issued and shipment marked completed.", occurredAt: daysAgo(13), actorId: docExec.id },
    ],
  });

  console.log("Seed complete:", {
    organization: organization.name,
    customers: [nordic.name, gulf.name, pacific.name],
    transporters: [sharma.name, speedway.name],
    shipments: ["EXF-2026-000001", "EXF-2026-000002", "EXF-2026-000003", "EXF-2026-000004", "EXF-2026-000005", "EXF-2026-000006"],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
