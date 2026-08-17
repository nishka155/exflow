/**
 * Dummy-data seed for ExFlow.
 *
 * Populates every module (Customers, Transporters, Bookings, Invoices,
 * Truck Dispatch, Factory Stuffing, Gate In, Shipping Instructions,
 * Bills of Lading, Shipped on Board, Inventory, Documents, Notifications)
 * under the FIRST existing organization in the database, attributed to
 * its first existing user. It does not create an organization or user —
 * run this only against a database that already has both (idempotency
 * guard below also skips re-seeding if bookings already exist).
 *
 * Run with:
 *   DATABASE_URL=... DIRECT_URL=... npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organization found — create one before seeding dummy data.");

  const admin = await prisma.user.findFirst({ where: { organizationId: org.id } });
  if (!admin) throw new Error("No user found in organization — create one before seeding dummy data.");

  const existingBookings = await prisma.booking.count({ where: { organizationId: org.id } });
  if (existingBookings > 0) {
    console.log(`Organization ${org.name} already has ${existingBookings} booking(s) — skipping seed to avoid duplicates.`);
    return;
  }

  console.log(`Seeding dummy data into organization "${org.name}" (${org.id}) as ${admin.name}...`);

  // ---------------------------------------------------------------------
  // Master data
  // ---------------------------------------------------------------------
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: org.id,
        name: "Anand Agro Exports",
        code: "CUST-001",
        address: "Plot 14, MIDC Industrial Area",
        city: "Nashik",
        country: "India",
        gstNumber: "27ANAND1234F1Z5",
        contactPerson: "Rakesh Anand",
        contactEmail: "rakesh@anandagro.example",
        contactPhone: "+91 98220 11223",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        name: "Bharat Textiles Pvt Ltd",
        code: "CUST-002",
        address: "44 Ring Road Industrial Estate",
        city: "Surat",
        country: "India",
        gstNumber: "24BHRTX5678G1Z2",
        contactPerson: "Meera Shah",
        contactEmail: "meera@bharattextiles.example",
        contactPhone: "+91 98765 44110",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        name: "Coastal Seafoods Ltd",
        code: "CUST-003",
        address: "Harbour Road, Fisheries Complex",
        city: "Kochi",
        country: "India",
        gstNumber: "32COAST9012H1Z8",
        contactPerson: "Thomas Varghese",
        contactEmail: "thomas@coastalseafoods.example",
        contactPhone: "+91 94470 33221",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: org.id,
        name: "Deccan Minerals Co",
        code: "CUST-004",
        address: "Survey No. 210, Mining Belt Road",
        city: "Bellary",
        country: "India",
        gstNumber: "29DECAN3456J1Z3",
        contactPerson: "Suresh Patil",
        contactEmail: "suresh@deccanminerals.example",
        contactPhone: "+91 90210 55667",
      },
    }),
  ]);
  const [custAgro, custTextiles, custSeafoods, custMinerals] = customers;

  const transporters = await Promise.all([
    prisma.transporter.create({
      data: {
        organizationId: org.id,
        name: "Swift Logistics",
        contactPerson: "Vikram Rao",
        contactPhone: "+91 99887 66554",
        contactEmail: "dispatch@swiftlogistics.example",
        gstNumber: "27SWIFT7788K1Z1",
      },
    }),
    prisma.transporter.create({
      data: {
        organizationId: org.id,
        name: "Highway Cargo Movers",
        contactPerson: "Ismail Sheikh",
        contactPhone: "+91 98123 44556",
        contactEmail: "ops@highwaycargo.example",
        gstNumber: "24HICGO2233L1Z9",
      },
    }),
  ]);
  const [transSwift, transHighway] = transporters;

  // ---------------------------------------------------------------------
  // Inventory (independent of the booking pipeline)
  // ---------------------------------------------------------------------
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Export Grade Wooden Pallets",
        sku: "INV-PLT-001",
        hsnCode: "44152000",
        category: "Packing Material",
        unit: "PCS",
        currentStock: 420,
        reorderLevel: 100,
        unitValue: 450,
        location: "Warehouse A - Bay 3",
        createdById: admin.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Poly Liner Rolls (200 micron)",
        sku: "INV-PLY-014",
        hsnCode: "39232990",
        category: "Packing Material",
        unit: "ROLL",
        currentStock: 65,
        reorderLevel: 30,
        unitValue: 1200,
        location: "Warehouse A - Bay 1",
        createdById: admin.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Corrugated Export Cartons (Large)",
        sku: "INV-CTN-022",
        hsnCode: "48191010",
        category: "Packing Material",
        unit: "PCS",
        currentStock: 1800,
        reorderLevel: 500,
        unitValue: 85,
        location: "Warehouse B - Bay 2",
        createdById: admin.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Container Seals (Bolt Type)",
        sku: "INV-SEAL-005",
        hsnCode: "83099000",
        category: "Hardware",
        unit: "PCS",
        currentStock: 210,
        reorderLevel: 50,
        unitValue: 35,
        location: "Gate Office Store",
        createdById: admin.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Strapping Rolls (PP, 12mm)",
        sku: "INV-STR-009",
        hsnCode: "39202099",
        category: "Packing Material",
        unit: "ROLL",
        currentStock: 18,
        reorderLevel: 25,
        unitValue: 650,
        location: "Warehouse A - Bay 1",
        createdById: admin.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        name: "Silica Gel Desiccant Bags (50g)",
        sku: "INV-SIL-031",
        hsnCode: "38249999",
        category: "Consumables",
        unit: "BOX",
        currentStock: 90,
        reorderLevel: 40,
        unitValue: 320,
        location: "Warehouse B - Bay 4",
        createdById: admin.id,
      },
    }),
  ]);
  const [itemPallets, itemPoly, itemCartons, itemSeals, itemStrapping, itemSilica] = inventoryItems;

  await prisma.inventoryMovement.createMany({
    data: [
      { organizationId: org.id, itemId: itemPallets.id, type: "IN", quantity: 500, reason: "Purchase order GRN-2201", recordedById: admin.id, createdAt: daysAgo(20) },
      { organizationId: org.id, itemId: itemPallets.id, type: "OUT", quantity: 80, reason: "Issued for container stuffing", recordedById: admin.id, createdAt: daysAgo(5) },
      { organizationId: org.id, itemId: itemPoly.id, type: "IN", quantity: 100, reason: "Purchase order GRN-2205", recordedById: admin.id, createdAt: daysAgo(18) },
      { organizationId: org.id, itemId: itemPoly.id, type: "OUT", quantity: 35, reason: "Issued for container stuffing", recordedById: admin.id, createdAt: daysAgo(4) },
      { organizationId: org.id, itemId: itemCartons.id, type: "IN", quantity: 2500, reason: "Purchase order GRN-2210", recordedById: admin.id, createdAt: daysAgo(15) },
      { organizationId: org.id, itemId: itemCartons.id, type: "OUT", quantity: 700, reason: "Issued to Bharat Textiles order", recordedById: admin.id, createdAt: daysAgo(3) },
      { organizationId: org.id, itemId: itemSeals.id, type: "IN", quantity: 300, reason: "Purchase order GRN-2218", recordedById: admin.id, createdAt: daysAgo(12) },
      { organizationId: org.id, itemId: itemSeals.id, type: "OUT", quantity: 90, reason: "Applied at factory stuffing", recordedById: admin.id, createdAt: daysAgo(2) },
      { organizationId: org.id, itemId: itemStrapping.id, type: "IN", quantity: 25, reason: "Purchase order GRN-2220", recordedById: admin.id, createdAt: daysAgo(25) },
      { organizationId: org.id, itemId: itemStrapping.id, type: "OUT", quantity: 7, reason: "Issued for container stuffing", recordedById: admin.id, createdAt: daysAgo(6) },
      { organizationId: org.id, itemId: itemSilica.id, type: "IN", quantity: 120, reason: "Purchase order GRN-2225", recordedById: admin.id, createdAt: daysAgo(10) },
      { organizationId: org.id, itemId: itemSilica.id, type: "OUT", quantity: 30, reason: "Issued for humidity control", recordedById: admin.id, createdAt: daysAgo(1) },
    ],
  });

  // ---------------------------------------------------------------------
  // Helper to advance a booking's pipeline
  // ---------------------------------------------------------------------
  let bookingSeq = 1042;
  function nextBookingNumber() {
    bookingSeq += 1;
    return `EXP-2026-${bookingSeq}`;
  }

  async function addTimelineEvent(bookingId: string, stage: any, title: string, occurredAt: Date, description?: string) {
    await prisma.bookingTimelineEvent.create({
      data: { bookingId, stage, title, description, occurredAt, actorId: admin.id },
    });
  }

  // ---------------------------------------------------------------------
  // Booking A — fully COMPLETED, two containers, full document trail
  // ---------------------------------------------------------------------
  const bookingA = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(21),
      customerId: custAgro.id,
      exporterName: "Anand Agro Exports",
      buyerName: "Al Rawabi Trading LLC",
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      shippingLine: "Maersk",
      vessel: "MAERSK NAVIGATOR",
      etd: daysAgo(8),
      eta: daysAgo(2),
      freightTerms: "CIF",
      commodity: "Onion (Fresh)",
      currentStage: "COMPLETED",
      deliveryDate: daysAgo(1),
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "INVOICE", "Booking created & invoice raised", daysAgo(21));

  const invoiceA = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      invoiceNumber: "INV-2026-1042",
      invoiceDate: daysAgo(21),
      customerId: custAgro.id,
      buyerName: "Al Rawabi Trading LLC",
      buyerAddress: "Al Quoz Industrial Area 3, Dubai, UAE",
      poNumber: "PO-ARL-7781",
      material: "Fresh Onion - Grade A",
      quantity: 27.5,
      quantityUnit: "MT",
      weight: 27500,
      weightUnit: "KG",
      numberOfBlocks: 2,
      hsnCode: "07031090",
      unitPrice: 320,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 8800,
      exportCountry: "United Arab Emirates",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });

  const dispatchA1 = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      truckNumber: "MH12 AB 3344",
      driverName: "Ramesh Yadav",
      driverMobile: "+91 98230 11220",
      transporterId: transSwift.id,
      material: "Fresh Onion - Grade A",
      referenceNumber: "REF-A1-001",
      lrNumber: "LR-88213",
      numberOfWeights: 13750,
      numberOfBlocks: 1,
      dispatchDate: daysAgo(19),
      expectedFactoryArrival: daysAgo(18),
      actualFactoryArrival: daysAgo(18),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const dispatchA2 = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      truckNumber: "MH12 CD 5566",
      driverName: "Suresh More",
      driverMobile: "+91 98230 44551",
      transporterId: transSwift.id,
      material: "Fresh Onion - Grade A",
      referenceNumber: "REF-A1-002",
      lrNumber: "LR-88214",
      numberOfWeights: 13750,
      numberOfBlocks: 1,
      dispatchDate: daysAgo(19),
      expectedFactoryArrival: daysAgo(18),
      actualFactoryArrival: daysAgo(18),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "DISPATCH", "Both trucks reached factory", daysAgo(18));

  const stuffingA1 = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      containerNumber: "MSKU7712340",
      containerSize: "FT40",
      commodity: "Fresh Onion",
      sealNumber: "SL889201",
      contactPerson: "Rakesh Anand",
      contactNumber: "+91 98220 11223",
      transporterId: transSwift.id,
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      numberOfBoxes: 1100,
      numberOfBlocks: 1,
      grossWeight: 13900,
      netWeight: 13750,
      lrGrNumber: "LR-88213",
      deliveryDate: daysAgo(18),
      actualArrival: daysAgo(17),
      stuffingStartTime: daysAgo(17),
      stuffingEndTime: daysAgo(17),
      checklistContainerClean: true,
      checklistContainerDamage: false,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  const stuffingA2 = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      containerNumber: "MSKU7712358",
      containerSize: "FT40",
      commodity: "Fresh Onion",
      sealNumber: "SL889202",
      contactPerson: "Rakesh Anand",
      contactNumber: "+91 98220 11223",
      transporterId: transSwift.id,
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      numberOfBoxes: 1100,
      numberOfBlocks: 1,
      grossWeight: 13900,
      netWeight: 13750,
      lrGrNumber: "LR-88214",
      deliveryDate: daysAgo(18),
      actualArrival: daysAgo(17),
      stuffingStartTime: daysAgo(17),
      stuffingEndTime: daysAgo(17),
      checklistContainerClean: true,
      checklistContainerDamage: false,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchA1.id }, data: { factoryStuffingId: stuffingA1.id } });
  await prisma.truckDispatch.update({ where: { id: dispatchA2.id }, data: { factoryStuffingId: stuffingA2.id } });
  await addTimelineEvent(bookingA.id, "STUFFING", "Both containers stuffed & sealed", daysAgo(17));

  const gateInA1 = await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      factoryStuffingId: stuffingA1.id,
      containerNumber: "MSKU7712340",
      gateInDate: daysAgo(16),
      terminal: "NSICT Terminal 1",
      yard: "Yard C",
      vehicleNumber: "MH12 AB 3344",
      form13Updated: true,
      gatePass: "GP-55012",
      eirNumber: "EIR-990211",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  const gateInA2 = await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      factoryStuffingId: stuffingA2.id,
      containerNumber: "MSKU7712358",
      gateInDate: daysAgo(16),
      terminal: "NSICT Terminal 1",
      yard: "Yard C",
      vehicleNumber: "MH12 CD 5566",
      form13Updated: true,
      gatePass: "GP-55013",
      eirNumber: "EIR-990212",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "GATE_IN", "Both containers gated in", daysAgo(16));

  const siA = await prisma.shippingInstruction.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      consignorName: "Anand Agro Exports",
      consignorAddress: "Plot 14, MIDC Industrial Area, Nashik, India",
      consigneeName: "Al Rawabi Trading LLC",
      consigneeAddress: "Al Quoz Industrial Area 3, Dubai, UAE",
      notifyPartyName: "Al Rawabi Trading LLC",
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      commodity: "Fresh Onion",
      hsCode: "07031090",
      packageCount: 2200,
      weight: 27500,
      marks: "ARL/ONION/2026",
      containerNumber: "MSKU7712340 / MSKU7712358",
      sealNumber: "SL889201 / SL889202",
      freightTerms: "CIF",
      incoterms: "CIF",
      shippingLine: "Maersk",
      voyage: "V.226E",
      vessel: "MAERSK NAVIGATOR",
      status: "CONFIRMED",
      sentAt: daysAgo(14),
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "SHIPPING_INSTRUCTION", "SI confirmed by shipping line", daysAgo(13));

  const blA = await prisma.billOfLading.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      shippingInstructionId: siA.id,
      blNumber: "MAEU887612340",
      blDate: daysAgo(9),
      consignorName: "Anand Agro Exports",
      consigneeName: "Al Rawabi Trading LLC",
      notifyPartyName: "Al Rawabi Trading LLC",
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      vessel: "MAERSK NAVIGATOR",
      voyage: "V.226E",
      containerNumber: "MSKU7712340 / MSKU7712358",
      sealNumber: "SL889201 / SL889202",
      commodity: "Fresh Onion",
      packageCount: 2200,
      weight: 27500,
      freightTerms: "CIF",
      status: "FINAL",
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "BILL_OF_LADING", "BL finalized", daysAgo(9));

  await prisma.shippedOnBoard.create({
    data: {
      organizationId: org.id,
      bookingId: bookingA.id,
      billOfLadingId: blA.id,
      vessel: "MAERSK NAVIGATOR",
      shippingLine: "Maersk",
      sobDate: daysAgo(8),
      remarks: "Clean on board, no exceptions noted.",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await addTimelineEvent(bookingA.id, "SOB", "Shipped on board confirmed", daysAgo(8));
  await addTimelineEvent(bookingA.id, "COMPLETED", "Booking closed — delivered", daysAgo(1));

  await prisma.document.createMany({
    data: [
      { organizationId: org.id, bookingId: bookingA.id, invoiceId: invoiceA.id, entityType: "INVOICE", category: "INVOICE", fileName: "INV-2026-1042.pdf", fileUrl: "https://files.exflow.app/dummy/INV-2026-1042.pdf", fileType: "application/pdf", fileSizeBytes: 184320, uploadedById: admin.id, createdAt: daysAgo(21) },
      { organizationId: org.id, bookingId: bookingA.id, factoryStuffingId: stuffingA1.id, entityType: "STUFFING", category: "CONTAINER_PHOTO", fileName: "MSKU7712340_loading.jpg", fileUrl: "https://files.exflow.app/dummy/MSKU7712340_loading.jpg", fileType: "image/jpeg", fileSizeBytes: 2210000, uploadedById: admin.id, createdAt: daysAgo(17) },
      { organizationId: org.id, bookingId: bookingA.id, shippingInstructionId: siA.id, entityType: "SHIPPING_INSTRUCTION", category: "SHIPPING_INSTRUCTION", fileName: "SI-EXP-2026-1043.pdf", fileUrl: "https://files.exflow.app/dummy/SI-EXP-2026-1043.pdf", fileType: "application/pdf", fileSizeBytes: 98110, uploadedById: admin.id, createdAt: daysAgo(14) },
      { organizationId: org.id, bookingId: bookingA.id, billOfLadingId: blA.id, entityType: "BILL_OF_LADING", category: "BILL_OF_LADING", fileName: "BL-MAEU887612340.pdf", fileUrl: "https://files.exflow.app/dummy/BL-MAEU887612340.pdf", fileType: "application/pdf", fileSizeBytes: 152400, uploadedById: admin.id, createdAt: daysAgo(9) },
    ],
  });

  // ---------------------------------------------------------------------
  // Booking B — at SOB stage, SOB still PENDING
  // ---------------------------------------------------------------------
  const bookingB = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(11),
      customerId: custTextiles.id,
      exporterName: "Bharat Textiles Pvt Ltd",
      buyerName: "Hamburg Textile Imports GmbH",
      pol: "Mundra (INMUN)",
      pod: "Hamburg (DEHAM)",
      shippingLine: "Hapag-Lloyd",
      vessel: "HAMBURG EXPRESS",
      etd: daysAgo(3),
      eta: daysFromNow(18),
      freightTerms: "FOB",
      commodity: "Cotton Fabric Rolls",
      currentStage: "SOB",
      createdById: admin.id,
    },
  });
  const invoiceB = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      invoiceNumber: "INV-2026-1043",
      invoiceDate: daysAgo(11),
      customerId: custTextiles.id,
      buyerName: "Hamburg Textile Imports GmbH",
      buyerAddress: "Speicherstadt 12, Hamburg, Germany",
      poNumber: "PO-HTI-4402",
      material: "Cotton Fabric - 60x60 Count",
      quantity: 18,
      quantityUnit: "MT",
      weight: 18000,
      weightUnit: "KG",
      hsnCode: "52081900",
      unitPrice: 2400,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 43200,
      exportCountry: "Germany",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  const dispatchB = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      truckNumber: "GJ05 XY 7788",
      driverName: "Kiran Patel",
      driverMobile: "+91 98795 22110",
      transporterId: transHighway.id,
      material: "Cotton Fabric Rolls",
      lrNumber: "LR-90211",
      numberOfWeights: 18000,
      dispatchDate: daysAgo(10),
      expectedFactoryArrival: daysAgo(9),
      actualFactoryArrival: daysAgo(9),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const stuffingB = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      containerNumber: "HLXU4456781",
      containerSize: "FT40_HC",
      commodity: "Cotton Fabric Rolls",
      sealNumber: "SL772104",
      transporterId: transHighway.id,
      pol: "Mundra (INMUN)",
      pod: "Hamburg (DEHAM)",
      numberOfBoxes: 340,
      grossWeight: 18200,
      netWeight: 18000,
      lrGrNumber: "LR-90211",
      actualArrival: daysAgo(9),
      stuffingStartTime: daysAgo(8),
      stuffingEndTime: daysAgo(8),
      checklistContainerClean: true,
      checklistSealApplied: true,
      checklistDocumentsUploaded: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchB.id }, data: { factoryStuffingId: stuffingB.id } });
  const gateInB = await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      factoryStuffingId: stuffingB.id,
      containerNumber: "HLXU4456781",
      gateInDate: daysAgo(7),
      terminal: "Adani Mundra CT-3",
      form13Updated: true,
      gatePass: "GP-61120",
      eirNumber: "EIR-101887",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  const siB = await prisma.shippingInstruction.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      consignorName: "Bharat Textiles Pvt Ltd",
      consigneeName: "Hamburg Textile Imports GmbH",
      pol: "Mundra (INMUN)",
      pod: "Hamburg (DEHAM)",
      commodity: "Cotton Fabric Rolls",
      hsCode: "52081900",
      packageCount: 340,
      weight: 18000,
      containerNumber: "HLXU4456781",
      sealNumber: "SL772104",
      freightTerms: "FOB",
      shippingLine: "Hapag-Lloyd",
      voyage: "V.114W",
      vessel: "HAMBURG EXPRESS",
      status: "CONFIRMED",
      sentAt: daysAgo(6),
      createdById: admin.id,
    },
  });
  const blB = await prisma.billOfLading.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      shippingInstructionId: siB.id,
      blNumber: "HLCUHH00341122",
      blDate: daysAgo(3),
      consignorName: "Bharat Textiles Pvt Ltd",
      consigneeName: "Hamburg Textile Imports GmbH",
      pol: "Mundra (INMUN)",
      pod: "Hamburg (DEHAM)",
      vessel: "HAMBURG EXPRESS",
      voyage: "V.114W",
      containerNumber: "HLXU4456781",
      sealNumber: "SL772104",
      commodity: "Cotton Fabric Rolls",
      packageCount: 340,
      weight: 18000,
      freightTerms: "FOB",
      status: "FINAL",
      createdById: admin.id,
    },
  });
  await prisma.shippedOnBoard.create({
    data: {
      organizationId: org.id,
      bookingId: bookingB.id,
      billOfLadingId: blB.id,
      vessel: "HAMBURG EXPRESS",
      shippingLine: "Hapag-Lloyd",
      status: "PENDING",
      createdById: admin.id,
    },
  });
  void invoiceB;

  // ---------------------------------------------------------------------
  // Booking C — at BILL_OF_LADING stage, BL flagged MISMATCH
  // ---------------------------------------------------------------------
  const bookingC = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(9),
      customerId: custSeafoods.id,
      exporterName: "Coastal Seafoods Ltd",
      buyerName: "Pacific Rim Seafood Importers",
      pol: "Cochin (INCOK)",
      pod: "Yokohama (JPYOK)",
      shippingLine: "ONE (Ocean Network Express)",
      vessel: "ONE INNOVATION",
      etd: daysAgo(1),
      eta: daysFromNow(15),
      freightTerms: "CFR",
      commodity: "Frozen Shrimp",
      currentStage: "BILL_OF_LADING",
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      invoiceNumber: "INV-2026-1044",
      invoiceDate: daysAgo(9),
      customerId: custSeafoods.id,
      buyerName: "Pacific Rim Seafood Importers",
      buyerAddress: "3-2 Minato Ward, Yokohama, Japan",
      material: "Frozen Vannamei Shrimp, HL, 16/20",
      quantity: 20,
      quantityUnit: "MT",
      weight: 20000,
      weightUnit: "KG",
      hsnCode: "03061791",
      unitPrice: 8900,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 178000,
      exportCountry: "Japan",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  const dispatchC = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      truckNumber: "KL07 PQ 9911",
      driverName: "Anoop Nair",
      driverMobile: "+91 94950 12233",
      transporterId: transSwift.id,
      material: "Frozen Shrimp",
      lrNumber: "LR-77021",
      dispatchDate: daysAgo(8),
      expectedFactoryArrival: daysAgo(7),
      actualFactoryArrival: daysAgo(7),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const stuffingC = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      containerNumber: "ONEU5591123",
      containerSize: "FT20",
      commodity: "Frozen Shrimp",
      sealNumber: "SL440217",
      transporterId: transSwift.id,
      pol: "Cochin (INCOK)",
      pod: "Yokohama (JPYOK)",
      numberOfBoxes: 800,
      grossWeight: 20300,
      netWeight: 20000,
      lrGrNumber: "LR-77021",
      actualArrival: daysAgo(7),
      stuffingStartTime: daysAgo(6),
      stuffingEndTime: daysAgo(6),
      checklistContainerClean: true,
      checklistSealApplied: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchC.id }, data: { factoryStuffingId: stuffingC.id } });
  await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      factoryStuffingId: stuffingC.id,
      containerNumber: "ONEU5591123",
      gateInDate: daysAgo(5),
      terminal: "Cochin International Container Terminal",
      form13Updated: true,
      gatePass: "GP-30099",
      eirNumber: "EIR-55402",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  const siC = await prisma.shippingInstruction.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      consignorName: "Coastal Seafoods Ltd",
      consigneeName: "Pacific Rim Seafood Importers",
      pol: "Cochin (INCOK)",
      pod: "Yokohama (JPYOK)",
      commodity: "Frozen Shrimp",
      hsCode: "03061791",
      packageCount: 800,
      weight: 20000,
      containerNumber: "ONEU5591123",
      sealNumber: "SL440217",
      freightTerms: "CFR",
      shippingLine: "ONE (Ocean Network Express)",
      voyage: "V.058N",
      vessel: "ONE INNOVATION",
      status: "CONFIRMED",
      sentAt: daysAgo(3),
      createdById: admin.id,
    },
  });
  await prisma.billOfLading.create({
    data: {
      organizationId: org.id,
      bookingId: bookingC.id,
      shippingInstructionId: siC.id,
      blNumber: "ONEYYOK0022187",
      blDate: daysAgo(1),
      consignorName: "Coastal Seafoods Ltd",
      consigneeName: "Pacific Rim Seafood Importers",
      pol: "Cochin (INCOK)",
      pod: "Yokohama (JPYOK)",
      vessel: "ONE INNOVATION",
      voyage: "V.058N",
      containerNumber: "ONEU5591123",
      sealNumber: "SL440217",
      commodity: "Frozen Shrimp",
      packageCount: 800,
      weight: 20000,
      freightTerms: "CFR",
      status: "MISMATCH",
      mismatchNotes: { field: "weight", draftValue: "20000 KG", siValue: "20100 KG", note: "Weight on draft BL doesn't match SI — awaiting correction from shipping line." },
      createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------
  // Booking D — at SHIPPING_INSTRUCTION stage, SI just SENT (no BL yet)
  // ---------------------------------------------------------------------
  const bookingD = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(6),
      customerId: custMinerals.id,
      exporterName: "Deccan Minerals Co",
      buyerName: "Steelworks Vietnam JSC",
      pol: "Chennai (INMAA)",
      pod: "Haiphong (VNHPH)",
      shippingLine: "COSCO",
      vessel: "COSCO HAIPHONG",
      etd: daysFromNow(4),
      eta: daysFromNow(16),
      freightTerms: "FOB",
      commodity: "Iron Ore Fines",
      currentStage: "SHIPPING_INSTRUCTION",
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingD.id,
      invoiceNumber: "INV-2026-1045",
      invoiceDate: daysAgo(6),
      customerId: custMinerals.id,
      buyerName: "Steelworks Vietnam JSC",
      buyerAddress: "Dinh Vu Industrial Zone, Haiphong, Vietnam",
      material: "Iron Ore Fines, 62% Fe",
      quantity: 2500,
      quantityUnit: "MT",
      weight: 2500000,
      weightUnit: "KG",
      hsnCode: "26011150",
      unitPrice: 95,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 237500,
      exportCountry: "Vietnam",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  const dispatchD = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingD.id,
      truckNumber: "TN09 LM 2201",
      driverName: "Karthik Subramaniam",
      driverMobile: "+91 90031 88220",
      transporterId: transHighway.id,
      material: "Iron Ore Fines",
      lrNumber: "LR-63310",
      dispatchDate: daysAgo(5),
      expectedFactoryArrival: daysAgo(4),
      actualFactoryArrival: daysAgo(4),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const stuffingD = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingD.id,
      containerNumber: "COSU8834412",
      containerSize: "FT40",
      commodity: "Iron Ore Fines",
      sealNumber: "SL118820",
      transporterId: transHighway.id,
      pol: "Chennai (INMAA)",
      pod: "Haiphong (VNHPH)",
      grossWeight: 26500,
      netWeight: 26000,
      lrGrNumber: "LR-63310",
      actualArrival: daysAgo(4),
      stuffingStartTime: daysAgo(3),
      stuffingEndTime: daysAgo(3),
      checklistContainerClean: true,
      checklistSealApplied: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchD.id }, data: { factoryStuffingId: stuffingD.id } });
  await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingD.id,
      factoryStuffingId: stuffingD.id,
      containerNumber: "COSU8834412",
      gateInDate: daysAgo(2),
      terminal: "Chennai Container Terminal",
      form13Updated: true,
      gatePass: "GP-71065",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.shippingInstruction.create({
    data: {
      organizationId: org.id,
      bookingId: bookingD.id,
      consignorName: "Deccan Minerals Co",
      consigneeName: "Steelworks Vietnam JSC",
      pol: "Chennai (INMAA)",
      pod: "Haiphong (VNHPH)",
      commodity: "Iron Ore Fines",
      hsCode: "26011150",
      weight: 26000,
      containerNumber: "COSU8834412",
      sealNumber: "SL118820",
      freightTerms: "FOB",
      shippingLine: "COSCO",
      vessel: "COSCO HAIPHONG",
      status: "SENT",
      sentAt: daysAgo(1),
      createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------
  // Booking E — at GATE_IN stage, still PENDING (no gate-in yet)
  // ---------------------------------------------------------------------
  const bookingE = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(4),
      customerId: custAgro.id,
      exporterName: "Anand Agro Exports",
      buyerName: "Gulf Fresh Produce Trading",
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      shippingLine: "Maersk",
      etd: daysFromNow(6),
      eta: daysFromNow(12),
      freightTerms: "CIF",
      commodity: "Fresh Grapes",
      currentStage: "GATE_IN",
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingE.id,
      invoiceNumber: "INV-2026-1046",
      invoiceDate: daysAgo(4),
      customerId: custAgro.id,
      buyerName: "Gulf Fresh Produce Trading",
      buyerAddress: "Al Aweer Fruit & Vegetable Market, Dubai, UAE",
      material: "Fresh Table Grapes - Thompson Seedless",
      quantity: 12,
      quantityUnit: "MT",
      weight: 12000,
      weightUnit: "KG",
      hsnCode: "08061000",
      unitPrice: 950,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 11400,
      exportCountry: "United Arab Emirates",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  const dispatchE = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingE.id,
      truckNumber: "MH15 ER 6602",
      driverName: "Dattatray Kale",
      driverMobile: "+91 98220 77441",
      transporterId: transSwift.id,
      material: "Fresh Grapes",
      lrNumber: "LR-92044",
      dispatchDate: daysAgo(3),
      expectedFactoryArrival: daysAgo(2),
      actualFactoryArrival: daysAgo(2),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const stuffingE = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingE.id,
      containerNumber: "MSKU2210987",
      containerSize: "FT40_HC",
      commodity: "Fresh Grapes",
      sealNumber: "SL662310",
      transporterId: transSwift.id,
      pol: "Nhava Sheva (INNSA)",
      pod: "Jebel Ali (AEJEA)",
      grossWeight: 12300,
      netWeight: 12000,
      lrGrNumber: "LR-92044",
      actualArrival: daysAgo(2),
      stuffingStartTime: daysAgo(1),
      stuffingEndTime: daysAgo(1),
      checklistContainerClean: true,
      checklistSealApplied: true,
      status: "COMPLETED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchE.id }, data: { factoryStuffingId: stuffingE.id } });
  await prisma.gateIn.create({
    data: {
      organizationId: org.id,
      bookingId: bookingE.id,
      factoryStuffingId: stuffingE.id,
      containerNumber: "MSKU2210987",
      gateInDate: daysFromNow(1),
      terminal: "NSICT Terminal 1",
      status: "PENDING",
      createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------
  // Booking F — at STUFFING stage, IN_PROGRESS
  // ---------------------------------------------------------------------
  const bookingF = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(3),
      customerId: custTextiles.id,
      exporterName: "Bharat Textiles Pvt Ltd",
      buyerName: "Milano Fashion Fabrics Srl",
      pol: "Mundra (INMUN)",
      pod: "Genoa (ITGOA)",
      shippingLine: "MSC",
      etd: daysFromNow(9),
      eta: daysFromNow(28),
      freightTerms: "FOB",
      commodity: "Silk Fabric Rolls",
      currentStage: "STUFFING",
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingF.id,
      invoiceNumber: "INV-2026-1047",
      invoiceDate: daysAgo(3),
      customerId: custTextiles.id,
      buyerName: "Milano Fashion Fabrics Srl",
      buyerAddress: "Via Fashion 22, Milan, Italy",
      material: "Pure Silk Fabric - Printed",
      quantity: 6,
      quantityUnit: "MT",
      weight: 6000,
      weightUnit: "KG",
      hsnCode: "50079020",
      unitPrice: 5200,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 31200,
      exportCountry: "Italy",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  const dispatchF = await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingF.id,
      truckNumber: "GJ01 FT 4520",
      driverName: "Jignesh Modi",
      driverMobile: "+91 98790 33112",
      transporterId: transHighway.id,
      material: "Silk Fabric Rolls",
      lrNumber: "LR-10344",
      dispatchDate: daysAgo(2),
      expectedFactoryArrival: daysAgo(1),
      actualFactoryArrival: daysAgo(1),
      status: "REACHED_FACTORY",
      createdById: admin.id,
    },
  });
  const stuffingF = await prisma.factoryStuffing.create({
    data: {
      organizationId: org.id,
      bookingId: bookingF.id,
      containerNumber: "MSCU6671203",
      containerSize: "FT20",
      commodity: "Silk Fabric Rolls",
      transporterId: transHighway.id,
      pol: "Mundra (INMUN)",
      pod: "Genoa (ITGOA)",
      netWeight: 6000,
      lrGrNumber: "LR-10344",
      actualArrival: daysAgo(1),
      stuffingStartTime: daysAgo(0.2),
      checklistContainerClean: true,
      checklistContainerDamage: false,
      checklistSealApplied: false,
      checklistDocumentsUploaded: false,
      status: "IN_PROGRESS",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.update({ where: { id: dispatchF.id }, data: { factoryStuffingId: stuffingF.id } });

  // ---------------------------------------------------------------------
  // Booking G — at DISPATCH stage, truck DELAYed
  // ---------------------------------------------------------------------
  const bookingG = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(2),
      customerId: custMinerals.id,
      exporterName: "Deccan Minerals Co",
      buyerName: "Anhui Metals Import Co",
      pol: "Chennai (INMAA)",
      pod: "Shanghai (CNSHA)",
      shippingLine: "COSCO",
      etd: daysFromNow(10),
      eta: daysFromNow(24),
      freightTerms: "FOB",
      commodity: "Manganese Ore",
      currentStage: "DISPATCH",
      isDelayed: true,
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingG.id,
      invoiceNumber: "INV-2026-1048",
      invoiceDate: daysAgo(2),
      customerId: custMinerals.id,
      buyerName: "Anhui Metals Import Co",
      buyerAddress: "Baohe District, Hefei, Anhui, China",
      material: "Manganese Ore, 46% Mn",
      quantity: 1800,
      quantityUnit: "MT",
      weight: 1800000,
      weightUnit: "KG",
      hsnCode: "26020010",
      unitPrice: 210,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 378000,
      exportCountry: "China",
      status: "APPROVED",
      createdById: admin.id,
    },
  });
  await prisma.truckDispatch.create({
    data: {
      organizationId: org.id,
      bookingId: bookingG.id,
      truckNumber: "TN22 GH 8834",
      driverName: "Balaji Murugan",
      driverMobile: "+91 90470 22119",
      transporterId: transHighway.id,
      material: "Manganese Ore",
      lrNumber: "LR-45021",
      dispatchDate: daysAgo(1),
      expectedFactoryArrival: daysAgo(0.5),
      status: "DELAY",
      createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------
  // Booking H — brand-new, INVOICE stage, still DRAFT
  // ---------------------------------------------------------------------
  const bookingH = await prisma.booking.create({
    data: {
      organizationId: org.id,
      bookingNumber: nextBookingNumber(),
      bookingDate: daysAgo(0.5),
      customerId: custSeafoods.id,
      exporterName: "Coastal Seafoods Ltd",
      buyerName: "Nordic Seafood Distribution AS",
      pol: "Cochin (INCOK)",
      pod: "Oslo (NOOSL)",
      freightTerms: "CFR",
      commodity: "Frozen Squid",
      currentStage: "INVOICE",
      createdById: admin.id,
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      bookingId: bookingH.id,
      invoiceNumber: "INV-2026-1049",
      invoiceDate: daysAgo(0.5),
      customerId: custSeafoods.id,
      buyerName: "Nordic Seafood Distribution AS",
      buyerAddress: "Fiskehavn 8, Oslo, Norway",
      material: "Frozen Whole Squid",
      quantity: 15,
      quantityUnit: "MT",
      weight: 15000,
      weightUnit: "KG",
      hsnCode: "03074300",
      unitPrice: 4100,
      currency: "USD",
      gstPercent: 0,
      gstAmount: 0,
      totalAmount: 61500,
      exportCountry: "Norway",
      status: "DRAFT",
      createdById: admin.id,
    },
  });

  // ---------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      { organizationId: org.id, userId: admin.id, type: "TRUCK_DELAY", channel: "IN_APP", title: "Truck delayed", body: `Truck TN22 GH 8834 for booking ${bookingG.bookingNumber} has not reached the factory as expected.`, entityType: "TruckDispatch", entityId: bookingG.id, isRead: false, createdAt: daysAgo(0.4) },
      { organizationId: org.id, userId: admin.id, type: "PENDING_SI", channel: "IN_APP", title: "Shipping Instruction pending", body: `Booking ${bookingD.bookingNumber} is gated in — SI needs to be sent to the shipping line.`, entityType: "Booking", entityId: bookingD.id, isRead: false, createdAt: daysAgo(2) },
      { organizationId: org.id, userId: admin.id, type: "SEAL_MISSING", channel: "IN_APP", title: "BL mismatch flagged", body: `Draft BL for booking ${bookingC.bookingNumber} has a weight mismatch against the SI — needs correction.`, entityType: "BillOfLading", entityId: bookingC.id, isRead: true, createdAt: daysAgo(1) },
      { organizationId: org.id, userId: admin.id, type: "GENERAL", channel: "IN_APP", title: "Booking delivered", body: `Booking ${bookingA.bookingNumber} has been delivered and closed.`, entityType: "Booking", entityId: bookingA.id, isRead: true, createdAt: daysAgo(1) },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Transporters: ${transporters.length}`);
  console.log(`  Bookings: 8 (A-H, spanning every pipeline stage)`);
  console.log(`  Inventory items: ${inventoryItems.length} (with movements)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
