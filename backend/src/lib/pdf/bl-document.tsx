import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { BillOfLading, Organization, Booking } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#666666", marginBottom: 20 },
  sectionTitle: { fontSize: 9, color: "#666666", marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eeeeee" },
  label: { color: "#666666" },
  col: { flexDirection: "column", flex: 1 },
  twoCol: { flexDirection: "row", gap: 24 },
  statusBadge: { fontSize: 9, padding: 4, borderWidth: 1, borderColor: "#111111", alignSelf: "flex-start", marginBottom: 12 },
});

export function BlDocument({
  bl,
  booking,
  organization,
}: {
  bl: BillOfLading;
  booking: Booking;
  organization: Organization;
}) {
  const details: [string, string][] = [
    ["POL", bl.pol],
    ["POD", bl.pod],
    ["Vessel / Voyage", `${bl.vessel ?? "—"} / ${bl.voyage ?? "—"}`],
    ["Container Number", bl.containerNumber ?? "—"],
    ["Seal Number", bl.sealNumber ?? "—"],
    ["Commodity", bl.commodity],
    ["Package Count", String(bl.packageCount ?? "—")],
    ["Weight (KG)", String(bl.weight ?? "—")],
    ["Freight Terms", bl.freightTerms ?? "—"],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bill of Lading {bl.status === "FINAL" ? "(Final)" : "(Draft)"}</Text>
        <Text style={styles.muted}>
          {organization.name} · Booking {booking.bookingNumber}
          {bl.blNumber ? ` · BL No. ${bl.blNumber}` : ""}
        </Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Consignor</Text>
            <Text>{bl.consignorName}</Text>
            {bl.consignorAddress && <Text style={styles.muted}>{bl.consignorAddress}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Consignee</Text>
            <Text>{bl.consigneeName}</Text>
            {bl.consigneeAddress && <Text style={styles.muted}>{bl.consigneeAddress}</Text>}
          </View>
        </View>

        {bl.notifyPartyName && (
          <View>
            <Text style={styles.sectionTitle}>Notify Party</Text>
            <Text>{bl.notifyPartyName}</Text>
            {bl.notifyPartyAddress && <Text style={styles.muted}>{bl.notifyPartyAddress}</Text>}
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
