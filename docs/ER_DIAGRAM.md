# ExFlow — Entity Relationship Diagram

Source of truth is [`prisma/schema.prisma`](../prisma/schema.prisma). This diagram is a
readable companion, not a substitute — column lists here are trimmed to the fields that
matter for relationships and workflow status.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ CUSTOMER : has
    ORGANIZATION ||--o{ TRANSPORTER : has
    ORGANIZATION ||--o{ SHIPMENT : owns

    CUSTOMER ||--o| USER : "portal login"
    CUSTOMER ||--o{ SHIPMENT : "is buyer on"
    CUSTOMER ||--o{ INVOICE : "is billed on"

    SHIPMENT ||--|| INVOICE : "step 1"
    SHIPMENT ||--o{ TRUCK_DISPATCH : "step 2"
    SHIPMENT ||--o| FACTORY_STUFFING : "step 3"
    SHIPMENT ||--o| GATE_IN : "step 4"
    SHIPMENT ||--o| SHIPPING_INSTRUCTION : "step 5"
    SHIPMENT ||--o| BILL_OF_LADING : "step 6"
    SHIPMENT ||--o{ SHIPMENT_TIMELINE_EVENT : logs
    SHIPMENT ||--o{ SHIPMENT_COMMENT : has
    SHIPMENT ||--o{ DOCUMENT : attaches

    INVOICE ||--o{ INVOICE_VERSION : "version history"
    INVOICE ||--o{ DOCUMENT : attaches

    TRANSPORTER ||--o{ TRUCK_DISPATCH : performs
    TRANSPORTER ||--o{ FACTORY_STUFFING : "provides transport for"
    TRUCK_DISPATCH }o--o| FACTORY_STUFFING : "consolidates into"
    TRUCK_DISPATCH ||--o{ DOCUMENT : attaches

    FACTORY_STUFFING ||--|| GATE_IN : "container moves to"
    FACTORY_STUFFING ||--o{ DOCUMENT : attaches

    GATE_IN ||--o{ DOCUMENT : attaches

    SHIPPING_INSTRUCTION ||--|| BILL_OF_LADING : "drafted into"
    SHIPPING_INSTRUCTION ||--o{ DOCUMENT : attaches

    BILL_OF_LADING ||--o{ BL_REVISION : "revision history"
    BILL_OF_LADING ||--o{ DOCUMENT : attaches

    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ SHIPMENT_COMMENT : writes
    USER ||--o{ AUDIT_LOG : performs

    ORGANIZATION {
        string id PK
        string name
        string slug
    }
    USER {
        string id PK "= auth.users.id"
        string organizationId FK
        string email
        Role role
    }
    CUSTOMER {
        string id PK
        string organizationId FK
        string name
        string portalUserId FK "nullable"
    }
    TRANSPORTER {
        string id PK
        string organizationId FK
        string name
    }
    SHIPMENT {
        string id PK
        string organizationId FK
        string shipmentNumber UK
        string customerId FK
        ShipmentStage currentStage
        bool isDelayed
    }
    INVOICE {
        string id PK
        string shipmentId FK,UK
        string customerId FK
        string invoiceNumber UK
        InvoiceStatus status
    }
    TRUCK_DISPATCH {
        string id PK
        string shipmentId FK
        string transporterId FK
        string factoryStuffingId FK "nullable"
        DispatchStatus status
    }
    FACTORY_STUFFING {
        string id PK
        string shipmentId FK,UK
        string containerNumber
        ContainerSize containerSize
        StuffingStatus status
    }
    GATE_IN {
        string id PK
        string shipmentId FK,UK
        string factoryStuffingId FK,UK
        GateInStatus status
    }
    SHIPPING_INSTRUCTION {
        string id PK
        string shipmentId FK,UK
        SIStatus status
    }
    BILL_OF_LADING {
        string id PK
        string shipmentId FK,UK
        string shippingInstructionId FK,UK
        BLStatus status
    }
    DOCUMENT {
        string id PK
        string organizationId FK
        string shipmentId FK "nullable"
        DocumentCategory category
        int version
    }
    NOTIFICATION {
        string id PK
        string userId FK
        NotificationType type
        bool isRead
    }
    AUDIT_LOG {
        string id PK
        string entityType
        string entityId
        AuditAction action
    }
```

## Notes on modeling decisions

- **One `Shipment` = one container / one pipeline instance.** `Invoice` is 1:1 with
  `Shipment` (creating an invoice creates its shipment). `TruckDispatch` is many:1 with
  `Shipment` because multiple partial truckloads commonly consolidate into a single
  stuffed container — each dispatch can optionally link to the `FactoryStuffing` it fed.
- `FactoryStuffing`, `GateIn`, `ShippingInstruction`, and `BillOfLading` are 1:1 with
  `Shipment` for v1. Amendments/revisions are modeled as history rows
  (`InvoiceVersion`, `BLRevision`) rather than new parent rows.
- `Document` is a single polymorphic table (`shipmentId` + optional per-module FK) so
  uploads, OCR text, and version chains work the same way across every module instead of
  duplicating an uploads table six times.
- `Customer.portalUserId` is the only link between the master-data side and Supabase
  Auth users for the customer portal; everyone else authenticates as a `User` scoped to
  an `Organization`.
- Multi-tenancy is enforced twice: application-layer (`organizationId` checks in every
  Prisma query, done in Server Actions) and database-layer (Postgres RLS policies in
  `prisma/migrations/0002_auth_rls`) as defense-in-depth for any direct Supabase client
  access.
