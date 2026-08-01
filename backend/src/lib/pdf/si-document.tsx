import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ShippingInstruction, Organization, Booking } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#666666", marginBottom: 20 },
  sectionTitle: { fontSize: 9, color: "#666666", marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eeeeee" },
  label: { color: "#666666" },
  col: { flexDirection: "column", flex: 1 },
  twoCol: { flexDirection: "row", gap: 24 },
});

export function SiDocument({
  si,
  booking,
  organization,
}: {
  si: ShippingInstruction;
  booking: Booking;
  organization: Organization;
}) {
  const details: [string, string][] = [
    ["POL", si.pol],
    ["POD", si.pod],
    ["Commodity", si.commodity],
    ["HS Code", si.hsCode ?? "—"],
    ["Package Count", String(si.packageCount ?? "—")],
    ["Weight (KG)", String(si.weight ?? "—")],
    ["Container Number", si.containerNumber ?? "—"],
    ["Seal Number", si.sealNumber ?? "—"],
    ["Freight Terms", si.freightTerms ?? "—"],
    ["Incoterms", si.incoterms ?? "—"],
    ["Shipping Line", si.shippingLine ?? "—"],
    ["Vessel / Voyage", `${si.vessel ?? "—"} / ${si.voyage ?? "—"}`],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Shipping Instruction</Text>
        <Text style={styles.muted}>
          {organization.name} · Booking {booking.bookingNumber}
        </Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Consignor</Text>
            <Text>{si.consignorName}</Text>
            {si.consignorAddress && <Text style={styles.muted}>{si.consignorAddress}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Consignee</Text>
            <Text>{si.consigneeName}</Text>
            {si.consigneeAddress && <Text style={styles.muted}>{si.consigneeAddress}</Text>}
          </View>
        </View>

        {si.notifyPartyName && (
          <View>
            <Text style={styles.sectionTitle}>Notify Party</Text>
            <Text>{si.notifyPartyName}</Text>
            {si.notifyPartyAddress && <Text style={styles.muted}>{si.notifyPartyAddress}</Text>}
          </View>
        )}

        <Text style={styles.sectionTitle}>Booking Details</Text>
        {details.map(([label, value]) => (
          <View style={styles.row} key={label}>
            <Text style={styles.label}>{label}</Text>
            <Text>{value}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
